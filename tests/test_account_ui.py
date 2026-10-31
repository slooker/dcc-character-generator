from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

try:
    from py_mini_racer import MiniRacer
except ImportError:  # pragma: no cover
    MiniRacer = None

DIST = Path(__file__).resolve().parents[1] / "dist"


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class AccountUiTests(unittest.TestCase):
    """dist/account.js: save status, the header bar and the My Crawlers page."""

    def setUp(self) -> None:
        source = "\n".join((DIST / name).read_text(encoding="utf-8") for name in ("api.js", "account.js"))
        source = re.sub(r"^import .*?;\s*$", "", source, flags=re.M | re.S)
        source = re.sub(r"^export ", "", source, flags=re.M)
        self.js = MiniRacer()
        self.js.eval(
            """
            const store = {};
            var localStorage = {
              getItem: (k) => (k in store ? store[k] : null),
              setItem: (k, v) => { store[k] = String(v); },
              removeItem: (k) => { delete store[k]; },
            };
            """
        )
        self.js.eval(source)
        self.js.eval(
            """
            account.ready = true;
            const verifiedUser = { id: 1, email: 'carl@example.com', name: '', emailVerified: true, pendingEmail: null };
            account.user = { ...verifiedUser };
            const crawler = (name) => ({ name, levelUps: [] });
            const row = (id, name) => ({ id, name, level: 1, floor: 1, race: '', className: '', number: 123456, updatedAt: '2026-10-29T12:00:00Z' });
            """
        )

    def val(self, expr: str):
        return json.loads(self.js.eval(f"JSON.stringify({expr})"))

    def test_save_status_tracks_changes_since_last_save(self) -> None:
        self.js.eval("var s = crawler('Carl');")
        self.assertEqual(self.val("saveStatus(s)"), "new")
        self.js.eval("setLink(7, s);")
        self.assertEqual(self.val("saveStatus(s)"), "saved")
        self.js.eval("s.name = 'Carl the Crawler';")
        self.assertEqual(self.val("saveStatus(s)"), "unsaved")
        # The link survives a reload (it's kept in localStorage).
        self.assertEqual(self.val("readLink().id"), 7)
        self.js.eval("setLink(null);")
        self.assertEqual(self.val("readLink()"), None)

    def test_header_bar_by_account_state(self) -> None:
        self.js.eval("account.user = null;")
        signed_out = self.val("accountBar(crawler('Carl'))")
        self.assertIn("Sign in to save", signed_out)
        # Custom Races & Classes need a verified account: greyed out, and says so when clicked.
        self.assertIn('class="secondary account-button locked" aria-disabled="true" data-action="workshop-locked"', signed_out)
        self.assertIn("Sign in with a verified email", self.val("workshopLockedMessage()"))
        self.js.eval("account.user = { ...verifiedUser }; account.characters = [row(7, 'Carl')];")
        bar = self.val("accountBar(crawler('Donut'))")
        self.assertIn('My Crawlers <span class="account-slots">1/5</span>', bar)
        self.assertIn("Save crawler", bar)
        self.js.eval("var s = crawler('Carl'); setLink(7, s);")
        self.assertRegex(self.val("accountBar(s)"), r"disabled>Saved<")
        self.js.eval("account.available = false;")
        self.assertEqual(self.val("accountBar(s)"), "")

    def test_account_pages_are_in_a_menu_under_the_name(self) -> None:
        self.js.eval("account.user.name = 'Carl';")
        bar = self.val("accountBar(crawler('x'))")
        menu = bar[bar.index('<details class="account-menu">'):]
        self.assertIn('<span class="account-name">Carl</span>', menu)
        actions = re.findall(r'role="menuitem" data-action="([^"]+)"', menu)
        self.assertEqual(actions, ["account", "workshop", "profile", "sign-out"])
        # Save stays outside the menu.
        self.assertLess(bar.index("save-crawler"), bar.index("account-menu"))

    def test_unverified_account_must_verify_first(self) -> None:
        self.js.eval("account.user = { ...verifiedUser, emailVerified: false };")
        bar = self.val("accountBar(crawler('Carl'))")
        self.assertIn("Verify email", bar)
        self.assertNotIn("save-crawler", bar)
        self.assertIn("Sign out", bar)
        self.assertIn('data-action="workshop-locked"', bar)
        self.assertIn("Verify your email", self.val("workshopLockedMessage()"))
        # No code out yet (e.g. signed in before verification existed): offer to send one.
        page = self.val("accountView(crawler('Carl'))")
        self.assertIn('data-account-action="resend-verify"', page)
        self.assertNotIn('data-account-form="verify"', page)
        self.js.eval("account.user.verifyCodeSent = true;")
        for view in ("accountView(crawler('Carl'))", "profileView()"):
            page = self.val(view)
            self.assertIn('data-account-form="verify"', page)
            self.assertIn("carl@example.com", page)

    def test_profile_shows_the_pending_email_change(self) -> None:
        page = self.val("profileView()")
        self.assertIn('data-account-form="profile"', page)
        self.assertIn('data-account-form="change-email"', page)
        self.js.eval("account.user.pendingEmail = 'new@example.com';")
        page = self.val("profileView()")
        self.assertIn('data-account-form="confirm-email"', page)
        self.assertIn("new@example.com", page)
        self.assertIn('data-account-action="cancel-email"', page)

    def test_only_verified_accounts_can_start_another_crawler(self) -> None:
        self.assertTrue(self.val("canStartNewCrawler()"))
        self.js.eval("account.user = { ...verifiedUser, emailVerified: false };")
        self.assertFalse(self.val("canStartNewCrawler()"))
        self.js.eval("account.user = null;")
        self.assertFalse(self.val("canStartNewCrawler()"))  # signed out
        self.js.eval("account.available = false;")
        self.assertTrue(self.val("canStartNewCrawler()"))  # no server: nothing to verify against

    def test_google_button_only_when_configured(self) -> None:
        self.js.eval("account.user = null;")
        self.assertNotIn("with Google", self.val("accountView(crawler('x'))"))
        self.js.eval("account.google = true;")
        page = self.val("accountView(crawler('x'))")
        self.assertIn('href="api/auth/google/start">', page)
        self.assertIn("<span>Sign in with Google</span>", page)
        self.js.eval("account.mode = 'register';")
        self.assertIn("<span>Sign up with Google</span>", self.val("accountView(crawler('x'))"))

    def test_google_only_profile_has_no_password_field(self) -> None:
        self.js.eval("account.user.providers = ['google'];")
        page = self.val("profileView()")
        self.assertIn('data-account-form="change-email"', page)
        self.assertNotIn('name="password"', page)
        self.assertIn("You sign in with Google.", page)
        self.js.eval("account.user.providers = ['google', 'password'];")
        page = self.val("profileView()")
        self.assertIn('name="password"', page)
        self.assertIn("Google and email and password", page)

    def test_full_account_cannot_save_a_new_crawler(self) -> None:
        self.js.eval("account.characters = [1, 2, 3, 4, 5].map((i) => row(i, `Crawler ${i}`));")
        page = self.val("accountView(crawler('Sixth'))")
        self.assertIn("all 5 slots are full", page)
        self.assertRegex(page, r'data-action="save-crawler" disabled')
        # A crawler that's already saved can still be updated.
        self.js.eval("var s = crawler('Crawler 2'); setLink(2, s); s.name = 'Renamed';")
        page = self.val("accountView(s)")
        self.assertNotRegex(page, r'data-action="save-crawler" disabled')
        self.assertIn('data-delete-character="2"', page)
        self.assertNotIn('data-open-character="2"', page)  # already open

    def test_names_are_escaped(self) -> None:
        self.js.eval("account.characters = [row(1, '<img src=x onerror=alert(1)>')];")
        page = self.val("accountView(crawler('<b>x</b>'))")
        self.assertNotIn("<img", page)
        self.assertNotIn("<b>x</b>", page)


if __name__ == "__main__":
    unittest.main(verbosity=2)
