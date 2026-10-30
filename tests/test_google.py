from __future__ import annotations

import base64
import json
import logging
import os
import re
import tempfile
import time
import unittest
import urllib.parse
from unittest import mock

try:
    from fastapi.testclient import TestClient
except ImportError:  # pragma: no cover
    TestClient = None

HEADERS = {"X-Requested-With": "crawler-intake"}
CLIENT_ID = "test-client.apps.googleusercontent.com"


def id_token(claims: dict) -> str:
    part = lambda data: base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()
    return f"{part({'alg': 'RS256'})}.{part(claims)}.signature"


@unittest.skipIf(TestClient is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class GoogleSignInTests(unittest.TestCase):
    """server/google.py: OpenID Connect code flow, account linking, and the checks on Google's ID token."""

    @classmethod
    def setUpClass(cls) -> None:
        logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.env = mock.patch.dict(os.environ, {
            "DATABASE_URL": f"sqlite:///{cls.tmp.name}/google.db",
            "GOOGLE_CLIENT_ID": CLIENT_ID,
            "GOOGLE_CLIENT_SECRET": "secret",
            "PUBLIC_URL": "https://dcc.example.com",
        })
        cls.env.start()
        for key in ("BIRD_API_KEY", "SMTP_HOST"):
            os.environ.pop(key, None)
        from server import database
        from server.main import app

        database.get_engine.cache_clear()
        cls.app = app
        cls.lifespan = TestClient(app)
        cls.lifespan.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        from server import database

        cls.lifespan.__exit__(None, None, None)
        database.get_engine().dispose()
        database.get_engine.cache_clear()
        cls.env.stop()
        cls.tmp.cleanup()

    def client(self) -> TestClient:
        return TestClient(self.app, headers=HEADERS, follow_redirects=False)

    def sign_in(self, client: TestClient, sub: str, email: str, **overrides) -> str:
        """Run start -> Google -> callback; returns the app URL the callback redirects to."""
        start = client.get("/api/auth/google/start")
        self.assertEqual(start.status_code, 303)
        query = urllib.parse.parse_qs(urllib.parse.urlparse(start.headers["location"]).query)
        claims = {
            "iss": "https://accounts.google.com", "aud": CLIENT_ID, "exp": time.time() + 300,
            "nonce": query["nonce"][0], "sub": sub, "email": email, "email_verified": True, "name": "Carl",
        }
        claims.update(overrides)
        with mock.patch("server.google.exchange_code", return_value={"id_token": id_token(claims)}) as exchange:
            done = client.get("/api/auth/google/callback", params={"code": "auth-code", "state": query["state"][0]})
        self.assertEqual(done.status_code, 303)
        if exchange.called:
            code, verifier, redirect = exchange.call_args.args
            self.assertEqual((code, redirect), ("auth-code", "https://dcc.example.com/api/auth/google/callback"))
            # PKCE: the verifier sent to Google hashes to the challenge sent at the start.
            import hashlib
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
            self.assertEqual(challenge, query["code_challenge"][0])
        return done.headers["location"]

    def test_start_redirects_to_google_with_pkce_state_and_nonce(self) -> None:
        start = self.client().get("/api/auth/google/start")
        url = urllib.parse.urlparse(start.headers["location"])
        query = urllib.parse.parse_qs(url.query)
        self.assertEqual(f"{url.scheme}://{url.netloc}{url.path}", "https://accounts.google.com/o/oauth2/v2/auth")
        self.assertEqual(query["client_id"], [CLIENT_ID])
        self.assertEqual(query["redirect_uri"], ["https://dcc.example.com/api/auth/google/callback"])
        self.assertEqual(query["scope"], ["openid email profile"])
        self.assertEqual(query["code_challenge_method"], ["S256"])
        self.assertTrue(query["state"][0] and query["nonce"][0])
        self.assertIn("google_oauth=", start.headers["set-cookie"])
        self.assertIn("HttpOnly", start.headers["set-cookie"])
        self.assertTrue(self.client().get("/api/auth/google").json()["enabled"])

    def test_new_google_user_is_created_verified_and_can_save(self) -> None:
        client = self.client()
        self.assertEqual(self.sign_in(client, "sub-new", "New.Person@Gmail.com"), "/?signed_in=google")
        user = client.get("/api/auth/me").json()["user"]
        self.assertEqual((user["email"], user["name"], user["emailVerified"], user["providers"]), ("new.person@gmail.com", "Carl", True, ["google"]))
        self.assertEqual(client.post("/api/characters", json={"state": {"name": "Carl"}}).status_code, 201)
        # Signing in again finds the same account by Google's id, even if the Gmail address changed.
        again = self.client()
        self.sign_in(again, "sub-new", "renamed@gmail.com")
        self.assertEqual(again.get("/api/auth/me").json()["user"]["id"], user["id"])

    def test_links_to_a_verified_password_account_with_the_same_email(self) -> None:
        from server import mailer

        owner = self.client()
        owner.post("/api/auth/register", json={"email": "donut@gmail.com", "password": "princess-pass"})
        code = re.search(r"\b(\d{6})\b", mailer.sent[-1].get_content()).group(1)
        owner.post("/api/auth/verify", json={"code": code})
        uid = owner.get("/api/auth/me").json()["user"]["id"]
        google = self.client()
        self.sign_in(google, "sub-donut", "donut@gmail.com")
        user = google.get("/api/auth/me").json()["user"]
        self.assertEqual((user["id"], user["providers"]), (uid, ["google", "password"]))
        # The password still works too.
        self.assertEqual(self.client().post("/api/auth/login", json={"email": "donut@gmail.com", "password": "princess-pass"}).status_code, 200)

    def test_takes_over_an_unverified_account_and_drops_its_password(self) -> None:
        squatter = self.client()
        squatter.post("/api/auth/register", json={"email": "mordecai@gmail.com", "password": "squatter-pass"})
        google = self.client()
        self.sign_in(google, "sub-mordecai", "mordecai@gmail.com")
        user = google.get("/api/auth/me").json()["user"]
        self.assertEqual((user["emailVerified"], user["providers"]), (True, ["google"]))
        self.assertEqual(squatter.get("/api/auth/me").status_code, 401)  # its session is gone
        self.assertEqual(self.client().post("/api/auth/login", json={"email": "mordecai@gmail.com", "password": "squatter-pass"}).status_code, 401)

    def test_rejects_bad_tokens_and_unverified_google_emails(self) -> None:
        cases = {
            "google_unverified_email": {"email_verified": False},
            "google_bad_token": {"aud": "someone-else"},
        }
        for code, override in cases.items():
            self.assertEqual(self.sign_in(self.client(), f"sub-{code}", f"{code}@gmail.com", **override), f"/?auth_error={code}")
        self.assertEqual(self.sign_in(self.client(), "sub-old", "old@gmail.com", exp=time.time() - 10), "/?auth_error=google_bad_token")
        self.assertEqual(self.sign_in(self.client(), "sub-nonce", "nonce@gmail.com", nonce="replayed"), "/?auth_error=google_bad_token")
        self.assertEqual(self.sign_in(self.client(), "sub-iss", "iss@gmail.com", iss="https://evil.example.com"), "/?auth_error=google_bad_token")

    def test_callback_needs_the_matching_state_cookie(self) -> None:
        client = self.client()
        client.get("/api/auth/google/start")
        with mock.patch("server.google.exchange_code") as exchange:
            wrong = client.get("/api/auth/google/callback", params={"code": "x", "state": "forged"})
            fresh = self.client().get("/api/auth/google/callback", params={"code": "x", "state": "forged"})
        self.assertEqual(wrong.headers["location"], "/?auth_error=google_expired")
        self.assertEqual(fresh.headers["location"], "/?auth_error=google_expired")
        exchange.assert_not_called()
        cancelled = client.get("/api/auth/google/callback", params={"error": "access_denied"})
        self.assertEqual(cancelled.headers["location"], "/?auth_error=google_cancelled")

    def test_google_only_accounts_change_email_without_a_password(self) -> None:
        from server import mailer

        client = self.client()
        self.sign_in(client, "sub-zev", "zev@gmail.com")
        started = client.post("/api/auth/email", json={"email": "zev@example.com"})
        self.assertEqual(started.json()["user"]["pendingEmail"], "zev@example.com", started.text)
        code = re.search(r"\b(\d{6})\b", mailer.sent[-1].get_content()).group(1)
        self.assertEqual(client.post("/api/auth/email/verify", json={"code": code}).json()["user"]["email"], "zev@example.com")

    def test_disabled_without_configuration(self) -> None:
        with mock.patch.dict(os.environ, {"GOOGLE_CLIENT_ID": ""}):
            self.assertFalse(self.client().get("/api/auth/google").json()["enabled"])
            self.assertEqual(self.client().get("/api/auth/google/start").status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
