from __future__ import annotations

import logging
import os
import sys
import types
import unittest
from unittest import mock

from server import mailer


class FakeAPIError(Exception):
    pass


def fake_bird_module(calls: list, fail: bool = False) -> types.ModuleType:
    """Stands in for messagebird-sdk's `bird` package (Bird client + APIError)."""

    class Bird:
        def __init__(self, **kwargs):
            calls.append(("init", kwargs))
            self.email = self

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def send(self, **kwargs):
            calls.append(("send", kwargs))
            if fail:
                raise FakeAPIError("E40100 invalid api key")
            return types.SimpleNamespace(id="em_123", status="accepted")

    module = types.ModuleType("bird")
    module.Bird = Bird
    module.APIError = FakeAPIError
    return module


class MailerTests(unittest.TestCase):
    """server/mailer.py picks Bird, then SMTP, then the log."""

    def setUp(self) -> None:
        logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)
        self.env = mock.patch.dict(os.environ, {}, clear=False)
        self.env.start()
        for key in ("BIRD_API_KEY", "SMTP_HOST", "MAIL_FROM", "SMTP_USERNAME"):
            os.environ.pop(key, None)

    def tearDown(self) -> None:
        self.env.stop()

    def send_with_bird(self, fail: bool = False) -> list:
        calls: list = []
        with mock.patch.dict(sys.modules, {"bird": fake_bird_module(calls, fail)}):
            mailer.send_email("carl@example.com", "Your code", "Your code is 123456")
        return calls

    def test_bird_sends_with_the_api_key_and_onboarding_sender(self) -> None:
        os.environ["BIRD_API_KEY"] = "bk_test_key"
        calls = self.send_with_bird()
        self.assertEqual(calls[0], ("init", {"api_key": "bk_test_key", "timeout": 15}))
        self.assertEqual(calls[1], ("send", {
            "from_": {"email": "onboarding@messagebird.dev", "name": "Crawler Intake"},
            "to": ["carl@example.com"],
            "subject": "Your code",
            "text": "Your code is 123456\n",
        }))

    def test_mail_from_sets_the_bird_sender(self) -> None:
        os.environ["BIRD_API_KEY"] = "bk_test_key"
        os.environ["MAIL_FROM"] = "noreply@mail.example.com"
        self.assertEqual(self.send_with_bird()[1][1]["from_"], {"email": "noreply@mail.example.com"})

    def test_bird_errors_become_mail_errors(self) -> None:
        os.environ["BIRD_API_KEY"] = "bk_bad"
        with self.assertRaises(mailer.MailError):
            self.send_with_bird(fail=True)

    def test_bird_wins_over_smtp(self) -> None:
        os.environ["BIRD_API_KEY"] = "bk_test_key"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        with mock.patch("smtplib.SMTP") as smtp:
            calls = self.send_with_bird()
        self.assertEqual(calls[1][0], "send")
        smtp.assert_not_called()

    def test_without_a_service_the_email_is_only_logged(self) -> None:
        with mock.patch.dict(sys.modules, {"bird": None}), mock.patch("smtplib.SMTP") as smtp:
            mailer.send_email("carl@example.com", "Your code", "Your code is 123456")  # no import of bird
        smtp.assert_not_called()
        self.assertEqual(mailer.sent[-1]["To"], "carl@example.com")


if __name__ == "__main__":
    unittest.main(verbosity=2)
