from __future__ import annotations

import io
import json
import re
import time
import unittest
from pathlib import Path

try:
    from py_mini_racer import MiniRacer
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    MiniRacer = None

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
MODULES = ("details.js", "races-classes.js", "builds.js", "equipment.js", "rules.js", "pdf.js")


def export_pdf(state_js: str) -> PdfReader:
    """Run pdf.js's buildCharacterPdf in V8 with the vendored pdf-lib."""
    ctx = MiniRacer()
    # pdf-lib only needs setTimeout to yield; mini-racer's built-in timer is unusable here.
    ctx.eval("var window = globalThis; var self = globalThis;"
             "globalThis.setTimeout = (fn) => { Promise.resolve().then(fn); return 0; };")
    ctx.eval((DIST / "vendor" / "pdf-lib.min.js").read_text(encoding="utf-8"))
    source = "\n".join((DIST / name).read_text(encoding="utf-8") for name in MODULES)
    source = re.sub(r"^import .*?;\s*$", "", source, flags=re.M | re.S)
    ctx.eval(re.sub(r"^export ", "", source, flags=re.M))
    ctx.eval("var TEMPLATE = new Uint8Array(%s);" % json.dumps(list((DIST / "character-sheet.pdf").read_bytes())))
    ctx.eval(f"var s = ({state_js}); var OUT = null;"
             "buildCharacterPdf(s, PDFLib, TEMPLATE).then((b) => { OUT = JSON.stringify(Array.from(b)); },"
             " (e) => { OUT = 'ERR ' + e; });")
    for _ in range(400):
        out = ctx.eval("OUT")
        if out:
            break
        time.sleep(0.05)
    if not out or out.startswith("ERR"):
        raise AssertionError(f"PDF export failed: {out}")
    return PdfReader(io.BytesIO(bytes(json.loads(out))))


def export_fields(state_js: str) -> dict:
    fields = export_pdf(state_js).get_fields() or {}
    return {name: field.get("/V") for name, field in fields.items()}


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class RaceClassPdfExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fields = export_fields(
            """(() => {
              const s = initialState();
              s.name = 'Tess'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              s.race = 'Crocodilian'; s.className = 'Boring Ol’ Barbarian';
              const pick = entryEffects(findClass('Boring Ol’ Barbarian'), {}).find((x) => x.type === 'skillPick');
              s.classChoices = { [pick.key]: ['Club'] };
              return s;
            })()"""
        )

    def test_race_and_class_fields(self) -> None:
        self.assertEqual(self.fields["Race"], "Crocodilian")
        self.assertEqual(self.fields["class"], "Boring Ol’ Barbarian")

    def test_stats_include_race_and_class_with_enhanced_equal(self) -> None:
        # Str 6 +4 (Crocodilian) +6 (Barbarian); Con 4 +3 +5. Fields: Enhanced, Unenhanced, Mod.
        self.assertEqual((self.fields["Text Field 21"], self.fields["Text Field 22"], self.fields["Text Field 23"]), ("16", "16", "+4"))
        self.assertEqual((self.fields["Text Field 43"], self.fields["Text Field 44"]), ("12", "12"))

    def test_dr_buffs_list_each_source(self) -> None:
        self.assertEqual(self.fields["Text Field 30"], "+3 (Race) +2 (Class)")
        self.assertEqual(self.fields["Text Field 31"], "5")
        self.assertEqual(self.fields["Text Field 33"], "Large (5)")

    def test_skill_rows_include_bonuses(self) -> None:
        rows = {self.fields.get(f"Text Field {103 + 6 * i}"): self.fields.get(f"Text Field {104 + 6 * i}") for i in range(20)}
        self.assertEqual(rows["Club"], "6")  # Rank 3 + 3 (Weapon Skill of your choice)
        self.assertEqual(rows["Pugilism"], "2")  # gained at the bonus Rank
        self.assertEqual(rows["Endurance"], "2")

    def test_situational_benefits_go_to_notes(self) -> None:
        self.assertIn("Rage (Benefit)", self.fields["Text Field 102"])



@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class DayNightPdfTests(unittest.TestCase):
    def test_lajabless_writes_day_night_pairs_and_note(self) -> None:
        fields = export_fields(
            """(() => {
              const s = initialState();
              s.name = 'Night'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              s.race = 'Lajabless';
              return s;
            })()"""
        )
        self.assertEqual((fields["Text Field 21"], fields["Text Field 22"], fields["Text Field 23"]), ("3/22", "3/22", "+2/+5"))
        self.assertEqual(fields["Text Field 38"], "10/5")
        self.assertIn("the first is daytime, the second is night time", fields["Text Field 102"])
        self.assertIn("Spells cost half the Mana", fields["Text Field 102"])


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class SkillOverflowPageTests(unittest.TestCase):
    def test_more_than_twenty_skills_adds_a_skills_page(self) -> None:
        # Skyfowl grants 10 Charisma-based Skills; Elemental Monk grants 10 Electric/Fire/Ice Spells.
        reader = export_pdf(
            """(() => {
              const s = initialState();
              s.name = 'Overflow'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              s.race = 'Skyfowl'; s.className = 'Elemental Monk';
              return s;
            })()"""
        )
        self.assertEqual(len(reader.pages), 5)
        main_rows = {(reader.get_fields() or {}).get(f"Text Field {103 + 6 * i}", {}).get("/V") for i in range(20)}
        extra_text = reader.pages[3].extract_text()
        self.assertIn("Wilbur", extra_text)  # an Elemental Monk spell past row 20
        self.assertNotIn("Wilbur’s Slow-build Fireblast", main_rows)
        # The original Inventory page follows the extra Skills page.
        self.assertIn("INVENTORY", reader.pages[4].extract_text().upper())


if __name__ == "__main__":
    unittest.main(verbosity=2)
