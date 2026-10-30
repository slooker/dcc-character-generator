from __future__ import annotations

import logging
import os
import re
import tempfile
import unittest

try:
    from fastapi.testclient import TestClient
except ImportError:  # pragma: no cover
    TestClient = None

HEADERS = {"X-Requested-With": "crawler-intake"}


class ModerationTests(unittest.TestCase):
    """server/moderation.py: names and shared text."""

    def test_blocks_slurs_profanity_and_simple_disguises(self) -> None:
        from server.moderation import inappropriate

        for text in ("Fuckface", "f u c k", "sh1t lord", "A$$hole Paladin", "Fuuuuck", "N1gg3r", "Rapist", "Hitler Youth", "SLUT"):
            self.assertTrue(inappropriate(text), text)

    def test_allows_harmless_words_that_contain_blocked_ones(self) -> None:
        from server.moderation import inappropriate

        for text in ("Grape Ape", "Bass Player", "Cockroach King", "Arcanic Untamed", "Scunthorpe Warrior", "Therapist",
                     "Fire Retardant", "Middlesex Mage", "Bastard Swordsman", "Damn Hell Crap", "Dungeon Dad"):
            self.assertFalse(inappropriate(text), text)

    def test_name_rules(self) -> None:
        from server.moderation import name_issue

        self.assertIsNone(name_issue("Dungeon Dad"))
        self.assertIsNone(name_issue("Moth Man/Moth Woman"))
        self.assertIn("2 to 40", name_issue("x"))
        self.assertIn("simple punctuation", name_issue("<b>Bold</b>"))
        self.assertIn("links", name_issue("Buy gold at www.example"))
        self.assertIn("isn’t allowed", name_issue("Shit Wizard"))
        # The book's Vine Porn Skill is allowed, but only that phrase.
        self.assertIsNone(name_issue("Vine Porn Druid"))
        self.assertIsNone(name_issue("V1NE PORN Master"))
        self.assertIn("isn’t allowed", name_issue("Porn Wizard"))
        self.assertIn("isn’t allowed", name_issue("Vine Porn Slut"))


@unittest.skipIf(TestClient is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class BuildsApiTests(unittest.TestCase):
    """server/builds.py: custom Races and Classes, private or shared."""

    @classmethod
    def setUpClass(cls) -> None:
        logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
        for key in ("BIRD_API_KEY", "SMTP_HOST"):
            os.environ.pop(key, None)
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.tmp.name}/builds.db"
        from server import database
        from server.main import app

        database.get_engine.cache_clear()
        cls.app = app
        cls.lifespan = TestClient(app)
        cls.lifespan.__enter__()
        cls.users = 0

    @classmethod
    def tearDownClass(cls) -> None:
        from server import database

        cls.lifespan.__exit__(None, None, None)
        database.get_engine().dispose()
        database.get_engine.cache_clear()
        os.environ.pop("DATABASE_URL", None)
        cls.tmp.cleanup()

    def client(self) -> TestClient:
        return TestClient(self.app, headers=HEADERS)

    def user(self, name: str = "", verify: bool = True) -> TestClient:
        from server import mailer

        type(self).users += 1
        email = f"builder{self.users}@example.com"
        client = self.client()
        self.assertEqual(client.post("/api/auth/register", json={"email": email, "password": "correct horse", "name": name}).status_code, 201)
        if verify:
            code = re.search(r"\b(\d{6})\b", next(m for m in reversed(mailer.sent) if m["To"] == email).get_content()).group(1)
            client.post("/api/auth/verify", json={"code": code})
        return client

    @staticmethod
    def body(name: str, kind: str = "race", public: bool = False, **data) -> dict:
        return {"kind": kind, "name": name, "public": public, "data": {"v": 1, "benefits": [], "detriments": [], **data}}

    def test_crud_and_privacy(self) -> None:
        owner, other = self.user("Bob"), self.user()
        created = owner.post("/api/builds", json=self.body("  Gutter   Sprite "))
        self.assertEqual(created.status_code, 201, created.text)
        build = created.json()
        self.assertEqual((build["name"], build["data"]["name"], build["author"], build["mine"], build["public"]), ("Gutter Sprite", "Gutter Sprite", "Bob", True, False))
        # Private: only the author sees it.
        self.assertEqual(other.get(f"/api/builds/{build['id']}").status_code, 404)
        self.assertEqual(self.client().get("/api/builds/public?kind=race").json()["builds"], [])
        self.assertEqual(other.put(f"/api/builds/{build['id']}", json=self.body("Mine Now")).status_code, 404)
        # Shared: everyone, signed in or not, can see it.
        shared = owner.put(f"/api/builds/{build['id']}", json=self.body("Gutter Sprite", public=True, description="Small and sneaky."))
        self.assertTrue(shared.json()["public"], shared.text)
        listed = self.client().get("/api/builds/public", params={"kind": "race", "q": "sprite"}).json()["builds"]
        self.assertEqual([(x["name"], x["mine"]) for x in listed], [("Gutter Sprite", False)])
        self.assertEqual(self.client().get("/api/builds/public", params={"kind": "class"}).json()["builds"], [])
        self.assertEqual(self.client().get(f"/api/builds/{build['id']}").json()["data"]["description"], "Small and sneaky.")
        self.assertEqual(owner.put(f"/api/builds/{build['id']}", json=self.body("Gutter Sprite", kind="class")).status_code, 422)
        self.assertEqual(owner.delete(f"/api/builds/{build['id']}").status_code, 204)
        self.assertEqual(owner.get("/api/builds").json()["builds"], [])

    def test_needs_a_verified_account(self) -> None:
        self.assertEqual(self.client().post("/api/builds", json=self.body("Anon")).status_code, 401)
        self.assertEqual(self.user(verify=False).post("/api/builds", json=self.body("Unverified")).status_code, 403)

    def test_names_are_screened(self) -> None:
        client = self.user()
        for name, message in (("Sh1t Lord", "isn’t allowed"), ("Crocodilian", "already a Race or Class in the book"),
                              ("x", "2 to 40"), ("<img src=x>", "simple punctuation")):
            response = client.post("/api/builds", json=self.body(name))
            self.assertEqual(response.status_code, 422, name)
            self.assertIn(message, response.json()["detail"], name)
        book_skill = client.post("/api/builds", json=self.body("Plant Person", benefits=[{"option": "skill", "skill": "Vine Porn", "amount": 1}]))
        self.assertEqual(book_skill.status_code, 201, book_skill.text)
        text = client.post("/api/builds", json=self.body("Fine Name", benefits=[{"option": "custom", "text": "Kills every f.u.c.k.e.r"}]))
        self.assertEqual(text.status_code, 422)
        self.assertIn("description or a benefit", text.json()["detail"])

    def test_profile_names_are_screened(self) -> None:
        client = self.user()
        self.assertEqual(client.patch("/api/auth/profile", json={"name": "Big Dick Energy"}).status_code, 422)
        self.assertEqual(client.patch("/api/auth/profile", json={"name": "Carl"}).status_code, 200)

    def test_duplicate_names(self) -> None:
        first, second = self.user(), self.user()
        self.assertEqual(first.post("/api/builds", json=self.body("Dungeon Dad", kind="class", public=True)).status_code, 201)
        self.assertEqual(first.post("/api/builds", json=self.body("dungeon dad", kind="class")).status_code, 409)
        self.assertEqual(first.post("/api/builds", json=self.body("Dungeon Dad", kind="race")).status_code, 201)  # kinds are separate
        # Another author can keep a private one, but not share a second "Dungeon Dad" Class.
        private = second.post("/api/builds", json=self.body("Dungeon Dad", kind="class"))
        self.assertEqual(private.status_code, 201)
        clash = second.put(f"/api/builds/{private.json()['id']}", json=self.body("DUNGEON DAD", kind="class", public=True))
        self.assertEqual(clash.status_code, 409)
        self.assertIn("Someone already shared", clash.json()["detail"])

    def test_limit(self) -> None:
        from server.builds import BUILD_LIMIT

        client = self.user()
        for i in range(BUILD_LIMIT):
            self.assertEqual(client.post("/api/builds", json=self.body(f"Build {i}")).status_code, 201)
        self.assertEqual(client.post("/api/builds", json=self.body("One Too Many")).status_code, 409)
        self.assertEqual(client.get("/api/builds").json()["limit"], BUILD_LIMIT)


if __name__ == "__main__":
    unittest.main(verbosity=2)
