from __future__ import annotations

import json
import re
import shutil
import subprocess
import unittest
from datetime import date
from pathlib import Path

try:
    from py_mini_racer import MiniRacer
except ImportError:  # pragma: no cover
    MiniRacer = None

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class ChangelogTests(unittest.TestCase):
    """dist/changelog.js: one entry per commit on main, version 0.N for the Nth."""

    @classmethod
    def setUpClass(cls) -> None:
        source = (DIST / "changelog.js").read_text(encoding="utf-8")
        cls.js = MiniRacer()
        cls.js.eval(re.sub(r"^export ", "", source, flags=re.M))
        cls.entries = json.loads(cls.js.eval("JSON.stringify(CHANGELOG)"))

    def test_versions_count_up_newest_first(self) -> None:
        versions = [x["version"] for x in self.entries]
        self.assertEqual(versions, [f"0.{n}" for n in range(len(versions), 0, -1)])
        self.assertEqual(self.js.eval("VERSION"), versions[0])

    def test_entries_have_dates_titles_and_items(self) -> None:
        dates = [date.fromisoformat(x["date"]) for x in self.entries]
        self.assertEqual(dates, sorted(dates, reverse=True))
        for entry in self.entries:
            self.assertTrue(entry["title"].strip(), entry)
            self.assertTrue(entry["items"] and all(x.strip() for x in entry["items"]), entry)

    @unittest.skipIf(shutil.which("git") is None or not (ROOT / ".git").exists(), "needs the git history")
    def test_one_entry_per_commit(self) -> None:
        # The newest entry may describe work that isn't committed yet.
        commits = int(subprocess.run(["git", "rev-list", "--first-parent", "--count", "HEAD"], cwd=ROOT,
                                     capture_output=True, text=True, check=True).stdout)
        self.assertIn(len(self.entries), (commits, commits + 1),
                      f"{commits} commits on main but {len(self.entries)} changelog entries: add one for each commit")

    def test_page_and_footer_link(self) -> None:
        page = self.js.eval("changelogView()")
        self.assertIn("0.1 · First release", page)
        self.assertIn(f"You’re on version {self.entries[0]['version']}.", page)
        index = (DIST / "index.html").read_text(encoding="utf-8")
        self.assertIn('<a href="#changelog" data-nav="changelog">Changelog <span data-version></span></a>', index)


if __name__ == "__main__":
    unittest.main(verbosity=2)
