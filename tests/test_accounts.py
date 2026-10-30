from __future__ import annotations

import logging
import os
import re
import tempfile
import unittest
from datetime import timedelta

try:
    from fastapi.testclient import TestClient
    from sqlalchemy import update
    from sqlalchemy.orm import Session
except ImportError:  # pragma: no cover
    TestClient = None

HEADERS = {"X-Requested-With": "crawler-intake"}


@unittest.skipIf(TestClient is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class AccountTests(unittest.TestCase):
    """Email/password accounts, cookie sessions and up to 5 saved crawlers per account."""

    @classmethod
    def setUpClass(cls) -> None:
        logging.getLogger("uvicorn.error").setLevel(logging.ERROR)  # no SMTP: emails are only logged
        for key in ("BIRD_API_KEY", "SMTP_HOST"):  # never send real email from tests
            os.environ.pop(key, None)
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.tmp.name}/accounts.db"
        from server import database
        from server.main import app

        database.get_engine.cache_clear()
        cls.app = app
        cls.lifespan = TestClient(app)
        cls.lifespan.__enter__()  # runs migrations

    @classmethod
    def tearDownClass(cls) -> None:
        from server import database

        cls.lifespan.__exit__(None, None, None)
        database.get_engine().dispose()
        database.get_engine.cache_clear()
        os.environ.pop("DATABASE_URL", None)
        cls.tmp.cleanup()

    def setUp(self) -> None:
        from server.auth import login_limiter

        login_limiter.reset()

    def client(self) -> TestClient:
        return TestClient(self.app, headers=HEADERS)

    def code_for(self, email: str) -> str:
        """The code in the newest email sent to `email` (SMTP isn't set, so mailer.sent holds it)."""
        from server import mailer

        message = next(m for m in reversed(mailer.sent) if m["To"] == email.strip().lower())
        return re.search(r"\b(\d{6})\b", message.get_content()).group(1)

    def signed_up(self, email: str, password: str = "correct horse", verify: bool = True) -> TestClient:
        client = self.client()
        response = client.post("/api/auth/register", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 201, response.text)
        if verify:
            verified = client.post("/api/auth/verify", json={"code": self.code_for(email)})
            self.assertTrue(verified.json()["user"]["emailVerified"], verified.text)
        return client

    def expire_code_cooldown(self) -> None:
        from server.database import get_engine
        from server.models import EmailCode, utcnow

        with Session(get_engine()) as db:
            db.execute(update(EmailCode).values(created_at=utcnow() - timedelta(minutes=2)))
            db.commit()

    def test_register_sets_session_and_me_reports_user(self) -> None:
        client = self.signed_up("  Carl@Example.com ")
        cookie = client.cookies.get("crawler_session")
        self.assertTrue(cookie)
        me = client.get("/api/auth/me")
        self.assertEqual(me.json()["user"]["email"], "carl@example.com")
        # The cookie is HttpOnly and SameSite=Lax.
        raw = client.post("/api/auth/login", json={"email": "carl@example.com", "password": "correct horse"}).headers["set-cookie"]
        self.assertIn("HttpOnly", raw)
        self.assertIn("samesite=lax", raw.lower())

    def test_register_rejects_duplicates_bad_email_and_short_password(self) -> None:
        self.signed_up("donut@example.com")
        client = self.client()
        self.assertEqual(client.post("/api/auth/register", json={"email": "DONUT@example.com", "password": "whatever123"}).status_code, 409)
        self.assertEqual(client.post("/api/auth/register", json={"email": "not-an-email", "password": "whatever123"}).status_code, 422)
        self.assertEqual(client.post("/api/auth/register", json={"email": "mongo@example.com", "password": "short"}).status_code, 422)

    def test_login_logout_and_wrong_password(self) -> None:
        self.signed_up("katia@example.com", "s3cret-pass")
        client = self.client()
        self.assertEqual(client.get("/api/auth/me").status_code, 401)
        self.assertEqual(client.post("/api/auth/login", json={"email": "katia@example.com", "password": "nope-nope"}).status_code, 401)
        self.assertEqual(client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "nope-nope"}).status_code, 401)
        self.assertEqual(client.post("/api/auth/login", json={"email": "Katia@example.com", "password": "s3cret-pass"}).status_code, 200)
        self.assertEqual(client.get("/api/auth/me").status_code, 200)
        token = client.cookies.get("crawler_session")
        self.assertEqual(client.post("/api/auth/logout").status_code, 204)
        # The old token no longer works, even if a client kept it.
        stale = self.client()
        stale.cookies.set("crawler_session", token)
        self.assertEqual(stale.get("/api/auth/me").status_code, 401)

    def test_failed_logins_are_rate_limited(self) -> None:
        self.signed_up("elle@example.com", "right-password")
        client = self.client()
        for _ in range(10):
            client.post("/api/auth/login", json={"email": "elle@example.com", "password": "wrong-password"})
        blocked = client.post("/api/auth/login", json={"email": "elle@example.com", "password": "right-password"})
        self.assertEqual(blocked.status_code, 429)

    def test_rate_limit_is_per_visitor_behind_the_tunnel(self) -> None:
        # Through Cloudflare + Caddy every request has the same peer; one
        # visitor's failures must not lock out everyone else.
        from unittest import mock

        self.signed_up("victim@example.com", "victim-pass")
        with mock.patch("server.proxy.peer_trusted", return_value=True):
            attacker = TestClient(self.app, headers={**HEADERS, "CF-Connecting-IP": "203.0.113.66"})
            for i in range(10):
                attacker.post("/api/auth/login", json={"email": f"guess{i}@example.com", "password": "wrong-password"})
            self.assertEqual(attacker.post("/api/auth/login", json={"email": "victim@example.com", "password": "victim-pass"}).status_code, 429)
            visitor = TestClient(self.app, headers={**HEADERS, "CF-Connecting-IP": "198.51.100.7"})
            self.assertEqual(visitor.post("/api/auth/login", json={"email": "victim@example.com", "password": "victim-pass"}).status_code, 200)

    def test_expired_session_is_rejected(self) -> None:
        from server.database import get_engine
        from server.models import UserSession, utcnow

        client = self.signed_up("imani@example.com")
        with Session(get_engine()) as db:
            db.execute(update(UserSession).values(expires_at=utcnow() - timedelta(seconds=1)))
            db.commit()
        self.assertEqual(client.get("/api/auth/me").status_code, 401)

    def test_mutating_requests_need_the_api_header(self) -> None:
        bare = TestClient(self.app)
        response = bare.post("/api/auth/register", json={"email": "csrf@example.com", "password": "whatever123"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(bare.get("/api/health").status_code, 200)

    def test_save_list_update_and_delete_characters(self) -> None:
        client = self.signed_up("mordecai@example.com")
        state = {"version": 1, "name": "Mordecai", "race": "Human", "floor": 3, "levelUps": [{"floor": "2", "stats": {"Int": 3}}]}
        created = client.post("/api/characters", json={"state": state})
        self.assertEqual(created.status_code, 201, created.text)
        cid = created.json()["id"]
        listing = client.get("/api/characters").json()
        self.assertEqual(listing["limit"], 5)
        self.assertEqual(
            {k: listing["characters"][0][k] for k in ("id", "name", "level", "race", "floor")},
            {"id": cid, "name": "Mordecai", "level": 2, "race": "Human", "floor": 3},
        )
        state["name"] = "Mordecai the Game Guide"
        self.assertEqual(client.put(f"/api/characters/{cid}", json={"state": state}).json()["name"], "Mordecai the Game Guide")
        self.assertEqual(client.get(f"/api/characters/{cid}").json()["state"], state)
        self.assertEqual(client.delete(f"/api/characters/{cid}").status_code, 204)
        self.assertEqual(client.get(f"/api/characters/{cid}").status_code, 404)

    def test_sixth_character_is_rejected(self) -> None:
        client = self.signed_up("bautista@example.com")
        for i in range(5):
            self.assertEqual(client.post("/api/characters", json={"state": {"name": f"Crawler {i}"}}).status_code, 201)
        sixth = client.post("/api/characters", json={"state": {"name": "One too many"}})
        self.assertEqual(sixth.status_code, 409)
        self.assertIn("5 saved crawlers", sixth.json()["detail"])
        # Deleting one frees a slot.
        first = client.get("/api/characters").json()["characters"][0]["id"]
        client.delete(f"/api/characters/{first}")
        self.assertEqual(client.post("/api/characters", json={"state": {"name": "Now it fits"}}).status_code, 201)

    def test_users_cannot_see_or_change_each_others_characters(self) -> None:
        owner = self.signed_up("zev@example.com")
        cid = owner.post("/api/characters", json={"state": {"name": "Zev"}}).json()["id"]
        other = self.signed_up("quan@example.com")
        self.assertEqual(other.get("/api/characters").json()["characters"], [])
        self.assertEqual(other.get(f"/api/characters/{cid}").status_code, 404)
        self.assertEqual(other.put(f"/api/characters/{cid}", json={"state": {"name": "Stolen"}}).status_code, 404)
        self.assertEqual(other.delete(f"/api/characters/{cid}").status_code, 404)
        self.assertEqual(owner.get(f"/api/characters/{cid}").json()["name"], "Zev")
        self.assertEqual(self.client().get("/api/characters").status_code, 401)

    def test_state_must_be_an_object_of_reasonable_size(self) -> None:
        client = self.signed_up("signet@example.com")
        self.assertEqual(client.post("/api/characters", json={"state": ["not", "an", "object"]}).status_code, 422)
        huge = {"name": "Big", "notes": "x" * (300 * 1024)}
        self.assertEqual(client.post("/api/characters", json={"state": huge}).status_code, 413)

    def test_new_accounts_must_verify_their_email_before_saving(self) -> None:
        client = self.signed_up("new@example.com", verify=False)
        user = client.get("/api/auth/me").json()["user"]
        self.assertEqual((user["emailVerified"], user["verifyCodeSent"]), (False, True))
        saved = client.post("/api/characters", json={"state": {"name": "Too soon"}})
        self.assertEqual((saved.status_code, saved.json()["detail"]), (403, "Verify your email address first."))
        self.assertEqual(client.patch("/api/auth/profile", json={"name": "Nope"}).status_code, 403)
        wrong = client.post("/api/auth/verify", json={"code": "000000" if self.code_for("new@example.com") != "000000" else "111111"})
        self.assertEqual(wrong.status_code, 400)
        self.assertIn("4 tries left", wrong.json()["detail"])
        code = self.code_for("new@example.com")
        self.assertTrue(client.post("/api/auth/verify", json={"code": f"{code[:3]} {code[3:]}"}).json()["user"]["emailVerified"])
        self.assertEqual(client.post("/api/characters", json={"state": {"name": "Now"}}).status_code, 201)

    def test_codes_stop_working_after_five_wrong_tries_and_resend_has_a_cooldown(self) -> None:
        client = self.signed_up("typo@example.com", verify=False)
        code = self.code_for("typo@example.com")
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            client.post("/api/auth/verify", json={"code": wrong})
        self.assertEqual(client.post("/api/auth/verify", json={"code": code}).status_code, 400)
        self.assertEqual(client.post("/api/auth/verify/resend").status_code, 429)  # within a minute
        self.expire_code_cooldown()
        self.assertFalse(client.get("/api/auth/me").json()["user"]["verifyCodeSent"])  # used up
        self.assertTrue(client.post("/api/auth/verify/resend").json()["user"]["verifyCodeSent"])
        self.assertNotEqual(client.post("/api/auth/verify", json={"code": self.code_for("typo@example.com")}).status_code, 400)

    def test_signing_in_unverified_sends_a_new_code_once_the_old_one_expires(self) -> None:
        from server import mailer
        from server.database import get_engine
        from server.models import EmailCode, utcnow

        self.signed_up("later@example.com", "a-password", verify=False)
        with Session(get_engine()) as db:
            db.execute(update(EmailCode).values(created_at=utcnow() - timedelta(hours=1), expires_at=utcnow() - timedelta(minutes=1)))
            db.commit()
        before = len([m for m in mailer.sent if m["To"] == "later@example.com"])
        response = self.client().post("/api/auth/login", json={"email": "later@example.com", "password": "a-password"})
        self.assertTrue(response.json()["codeSent"])
        self.assertEqual(len([m for m in mailer.sent if m["To"] == "later@example.com"]), before + 1)

    def test_an_unverified_address_can_be_registered_again(self) -> None:
        self.signed_up("claimed@example.com", "stranger-pass", verify=False)
        owner = self.signed_up("claimed@example.com", "owners-pass")
        self.assertTrue(owner.get("/api/auth/me").json()["user"]["emailVerified"])
        stranger = self.client().post("/api/auth/login", json={"email": "claimed@example.com", "password": "stranger-pass"})
        self.assertEqual(stranger.status_code, 401)

    def test_edit_profile_name(self) -> None:
        client = self.client()
        client.post("/api/auth/register", json={"email": "named@example.com", "password": "a-password", "name": "  Carl  "})
        client.post("/api/auth/verify", json={"code": self.code_for("named@example.com")})
        self.assertEqual(client.get("/api/auth/me").json()["user"]["name"], "Carl")
        self.assertEqual(client.patch("/api/auth/profile", json={"name": "Princess Donut"}).json()["user"]["name"], "Princess Donut")
        self.assertEqual(client.patch("/api/auth/profile", json={"name": "x" * 81}).status_code, 422)

    def test_changing_email_needs_password_and_a_code_sent_to_the_new_address(self) -> None:
        from server import mailer

        client = self.signed_up("old@example.com", "the-password")
        self.assertEqual(client.post("/api/auth/email", json={"email": "new-addr@example.com", "password": "wrong-one"}).status_code, 403)
        started = client.post("/api/auth/email", json={"email": "New-Addr@example.com", "password": "the-password"})
        self.assertEqual(started.json()["user"]["pendingEmail"], "new-addr@example.com")
        # Nothing changes until the code is entered; the old address still signs in.
        self.assertEqual(client.get("/api/auth/me").json()["user"]["email"], "old@example.com")
        self.assertEqual(self.client().post("/api/auth/login", json={"email": "old@example.com", "password": "the-password"}).status_code, 200)
        confirmed = client.post("/api/auth/email/verify", json={"code": self.code_for("new-addr@example.com")})
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        user = confirmed.json()["user"]
        self.assertEqual((user["email"], user["emailVerified"], user["pendingEmail"]), ("new-addr@example.com", True, None))
        self.assertEqual(self.client().post("/api/auth/login", json={"email": "new-addr@example.com", "password": "the-password"}).status_code, 200)
        self.assertEqual(self.client().post("/api/auth/login", json={"email": "old@example.com", "password": "the-password"}).status_code, 401)
        self.assertEqual(mailer.sent[-1]["To"], "old@example.com")  # heads-up to the old address
        self.assertIn("was changed", mailer.sent[-1]["Subject"])

    def test_email_change_rejects_taken_addresses_and_can_be_cancelled(self) -> None:
        self.signed_up("taken@example.com")
        client = self.signed_up("mover@example.com", "the-password")
        self.assertEqual(client.post("/api/auth/email", json={"email": "taken@example.com", "password": "the-password"}).status_code, 409)
        client.post("/api/auth/email", json={"email": "elsewhere@example.com", "password": "the-password"})
        self.assertEqual(client.delete("/api/auth/email").status_code, 204)
        self.assertIsNone(client.get("/api/auth/me").json()["user"]["pendingEmail"])
        self.assertEqual(client.post("/api/auth/email/verify", json={"code": self.code_for("elsewhere@example.com")}).status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
