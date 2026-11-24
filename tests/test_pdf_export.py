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
MODULES = ("details.js", "races-classes.js", "builds.js", "equipment.js", "rules.js", "skill-text.js", "pdf.js")


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


def sheet_pages(reader: PdfReader) -> list:
    """The sheet's pages, without the Skills & Spells Reference pages at the end."""
    return [p for p in reader.pages if "SKILLS & SPELLS REFERENCE" not in p.extract_text()]


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
        self.assertEqual(len(sheet_pages(reader)), 5)
        main_rows = {(reader.get_fields() or {}).get(f"Text Field {103 + 6 * i}", {}).get("/V") for i in range(20)}
        extra_text = reader.pages[3].extract_text()
        self.assertIn("Wilbur", extra_text)  # an Elemental Monk spell past row 20
        self.assertNotIn("Wilbur’s Slow-build Fireblast", main_rows)
        # The original Inventory page follows the extra Skills page.
        self.assertIn("INVENTORY", reader.pages[4].extract_text().upper())


if __name__ == "__main__":
    unittest.main(verbosity=2)


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class UnfinishedSheetTests(unittest.TestCase):
    """A sheet with issues can still be downloaded; its notes list the issues."""

    def test_issues_are_listed_in_the_notes(self) -> None:
        fields = export_fields("(() => { const s = initialState(); s.name = 'Half Done'; s.kind = 'human'; return s; })()")
        notes = fields["Text Field 102"]
        self.assertRegex(notes, r"^THIS SHEET STILL HAS \d+ ISSUES:")
        self.assertIn("• Choose or write a Past Trauma.", notes)

    def test_finished_sheet_has_no_issue_note(self) -> None:
        # Stand in for a crawler that passes validation.
        fields = export_fields("(() => { errors = () => []; const s = initialState(); s.name = 'Done'; s.kind = 'human'; return s; })()")
        self.assertNotIn("STILL HAS", fields.get("Text Field 102") or "")


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class SkillDetailTests(unittest.TestCase):
    """Range and Mana on attack rows, Upgrades in Skill notes, and the Reference page."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.reader = export_pdf(
            """(() => {
              const s = initialState(); s.name = 'Tess'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'spell'; s.combat = 'Shock Treatment';
              s.stats = { Str: '2', Int: '6', Con: '4', Dex: '5', Cha: '3' };
              return s;
            })()"""
        )
        cls.fields = {name: field.get("/V") for name, field in (cls.reader.get_fields() or {}).items()}

    def test_attack_rows_show_range_and_mana(self) -> None:
        row = next(i for i in range(5) if self.fields.get(("Text Field 55", "Text Field 61", "Text Field 67", "Text Field 73", "Text Field 79")[i]) == "Shock Treatment")
        effects = self.fields[("Text Field 56", "Text Field 62", "Text Field 68", "Text Field 74", "Text Field 80")[row]]
        self.assertTrue(effects.startswith("Range 30 ft; Mana 2; Electric"), effects)

    def test_skill_notes_give_the_next_upgrade_not_just_the_source(self) -> None:
        notes = [self.fields.get(f"Text Field {107 + 6 * i}") or "" for i in range(20)]
        shock = next(x for x in notes if "Stunned Debuff" in x)
        self.assertTrue(shock.startswith("Range 30 ft; Mana 2. Next, Rank 5: +1d2 base damage"), shock)
        self.assertFalse(any(x.strip() in ("Starting combat", "Chosen combat") for x in notes))

    def test_reference_page_lists_every_upgrade(self) -> None:
        text = "\n".join(p.extract_text() for p in self.reader.pages[4:])
        self.assertIn("SKILLS & SPELLS REFERENCE - TESS", text)
        self.assertIn("Shock Treatment - Rank 3", text)
        self.assertIn("Rank 15: +1d2 base damage, and if you make this attack at melee range", text)


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class CustomRaceAbilityTests(unittest.TestCase):
    """A custom Race's text-only benefits and detriments reach the sheet."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.reader = export_pdf(
            """(() => {
              const s = initialState(); s.name = 'Tess'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              const b = normalizeBuild({ kind: 'race', name: 'Lizardoid', benefits: [
                { option: 'noBreathing' }, { option: 'diseaseImmunity' }, { option: 'climb' },
                { option: 'majorDefense', detail: 'Advantage on Evade Checks' }, { option: 'd4Checks', check: 'Evade' },
                { option: 'large', tier: 'major' } ],
                detriments: [{ option: 'vulnerableUncommon', detail: 'Cold' }] });
              s.customRace = { id: 1, author: 'Bob', build: b }; s.race = b.name;
              return s;
            })()"""
        )
        cls.fields = {name: field.get("/V") for name, field in (cls.reader.get_fields() or {}).items()}

    def test_abilities_lead_the_notes(self) -> None:
        notes = self.fields["Text Field 102"]
        self.assertTrue(notes.startswith("Race (Lizardoid): Doesn’t need to breathe; immune to inhaled toxins; Immune to Poison and all diseases; "
                                         "Climb Movement: climbs most surfaces, even ceilings; Advantage on Evade Checks; +1d4 to Evade Checks; "
                                         "Vulnerable (double damage): Cold."), notes)
        self.assertIn("THIS SHEET STILL HAS", notes)  # after the abilities

    def test_evade_buffs_and_size(self) -> None:
        self.assertEqual(self.fields["Text Field 25"], "Adv +1d4")
        self.assertEqual(self.fields["Text Field 33"], "Large (5)")

    def test_reference_page_has_the_race_in_full(self) -> None:
        text = "\n".join(p.extract_text() for p in self.reader.pages if "REFERENCE" in p.extract_text())
        self.assertIn("Race: Lizardoid (custom)", text)
        self.assertIn("• A Climb Movement: automatically climb most surfaces, even ceilings", text)


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class WeaponItemAttackTests(unittest.TestCase):
    def test_ticked_weapon_item_fills_an_attack_row(self) -> None:
        fields = export_fields(
            """(() => {
              const s = initialState(); s.name = 'Tess'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              s.skillUps = [{ skill: 'Club', ranks: '2', floor: '1' }];
              const axe = normalizeGearItem({ ...newGearItem('weapon'), name: 'Big Club', weaponSkill: 'Club', location: 'hotlist:2' });
              s.gear = [axe]; s.attackSheet = [`gear:${axe.id}`];
              return s;
            })()"""
        )
        rows = [(fields.get(n), fields.get(r), fields.get(d)) for n, r, d in
                (("Text Field 55", "Text Field 551", "Text Field 53"), ("Text Field 61", "Text Field 57", "Text Field 58"))]
        self.assertEqual(rows, [("Club", "5", "1d6"), ("Big Club (Club)", "5", "1d6")])


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class AttackTextSizeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.reader = export_pdf(
            """(() => {
              const s = initialState(); s.name = 'Tess'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Bow';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              const bow = normalizeGearItem({ ...newGearItem('weapon'), weaponSkill: 'Bow', location: 'hotlist:2',
                name: 'The Extremely Long and Ostentatiously Named Hunting Bow of Grandpa Ernie the Third, Scourge of the Ninth Floor' });
              s.gear = [bow];
              return s;
            })()"""
        )
        cls.fields = {name: field.get("/V") for name, field in (cls.reader.get_fields() or {}).items()}

    def appearance_size(self, name: str) -> float:
        widget = next(a.get_object() for a in self.reader.pages[0]["/Annots"] if a.get_object().get("/T") == name)
        return float(re.search(r"/\S+ ([\d.]+) Tf", widget["/DA"]).group(1))

    def appearance_lines(self, name: str) -> list:
        """The lines a field's appearance draws (pdf-lib writes one hex Tj per line)."""
        widget = next(a.get_object() for a in self.reader.pages[0]["/Annots"] if a.get_object().get("/T") == name)
        stream = widget["/AP"]["/N"].get_object().get_data().decode("latin-1")
        return [bytes.fromhex(x).decode("latin-1") for x in re.findall(r"<([0-9A-Fa-f]*)> Tj", stream)]

    def test_name_and_effects_match_the_stats_size_and_wrap(self) -> None:
        for name in ("Text Field 55", "Text Field 551", "Text Field 52", "Text Field 53", "Text Field 54", "Text Field 56", "Text Field 61", "Text Field 62"):
            self.assertEqual(self.appearance_size(name), self.appearance_size("Text Field 21"), name)
        self.assertEqual(self.fields["Text Field 55"], "Bow")
        # The value has no hard line breaks (viewers and printers re-wrap it); the field wraps it.
        self.assertEqual(self.fields["Text Field 56"], "Range 100 ft; Piercing; Requires two hands and proper ammunition")
        self.assertEqual(self.appearance_lines("Text Field 56"), ["Range 100 ft; Piercing; Requires two hands and proper", "ammunition"])

    def test_text_too_long_ends_with_its_reference_page(self) -> None:
        name = self.fields["Text Field 61"]
        self.assertLessEqual(len(self.appearance_lines("Text Field 61")), 3)
        page = int(re.search(r"… Page (\d+)$", name).group(1))
        self.assertTrue(name.startswith("The Extremely Long"))
        self.assertIn("Bow - Rank", self.reader.pages[page - 1].extract_text())


# A 2 x 2 white JPEG.
TINY_JPEG = ("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/"
              "wAALCAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==")


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class PortraitTests(unittest.TestCase):
    def test_portrait_fills_the_portrait_box(self) -> None:
        reader = export_pdf("(() => { const s = initialState(); s.name = 'Tess'; s.portrait = '%s'; return normalizeState(s); })()" % TINY_JPEG)
        button = next(a.get_object() for a in reader.pages[0]["/Annots"] if a.get_object().get("/T") == "Image7_af_image")
        appearance = button["/AP"]["/N"].get_object()
        self.assertTrue(any(x.get_object().get("/Subtype") == "/Image" for x in appearance["/Resources"]["/XObject"].values()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
