from __future__ import annotations

import json
import unittest

from test_pdf_export import export_fields
from test_race_class import MiniRacer, load_rules

# A finished human Club crawler with Str 6 / Int 5 / Con 4 / Dex 3 / Cha 2, plus a Party buff helper.
SETUP = """
function crawler(extra = {}) {
  return humanCrawler({ stats: { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' }, weaponLocation: 'holding', ...extra });
}
function buff(fields = {}) {
  return normalizePartyBuff({ ...newPartyBuff(), ...fields });
}
function partied(buffs, extra = {}) {
  return crawler({ party: { name: 'Royal Court', notes: '', buffs }, ...extra });
}
"""

AURA = "buff({ name: 'Protective Aura', from: 'Donut', bonuses: { dr: '2' } })"


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class PartyRulesTests(unittest.TestCase):
    """dist/party.js + rules.js: the optional Party, and buffs that work like magic items."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(SETUP)

    def val(self, expr: str):
        return json.loads(self.js.eval(f"JSON.stringify({expr})"))

    def test_party_is_optional_and_normalized(self) -> None:
        self.assertEqual(self.val("initialState().party"), {"name": "", "notes": "", "buffs": []})
        self.assertEqual(self.val("normalizeState({}).party"), {"name": "", "notes": "", "buffs": []})
        self.assertEqual(self.val("partyErrors(crawler())"), [])
        self.assertTrue(self.val("stepCompletion(crawler()).party"))
        raw = self.val("normalizeState({ party: { name: 'Crew', buffs: [{ name: 'Aura', bonuses: { dr: '2' } }] } }).party")
        self.assertEqual(raw["name"], "Crew")
        self.assertTrue(raw["buffs"][0]["active"])
        self.assertEqual(raw["buffs"][0]["bonuses"]["dr"], "2")

    def test_party_dr_goes_in_the_buffs_box(self) -> None:
        dr = self.val(f"damageResistance(partied([{AURA}]))")
        self.assertEqual(dr, {"parts": [{"value": 2, "from": "Donut"}], "armor": 0, "total": 2})
        off = AURA.replace("bonuses:", "active: false, bonuses:")
        self.assertEqual(self.val(f"damageResistance(partied([{off}])).total"), 0)

    def test_party_stats_skills_and_damage_apply_while_active(self) -> None:
        might = "buff({ name: 'Battle Hymn', bonuses: { stats: { Str: '2' }, skills: [{ name: 'Club', ranks: '1' }, { name: 'Perception', ranks: '2', type: 'check' }], damage: [{ amount: '1' }, { amount: '2', condition: 'vs Undead' }] } })"
        state = f"partied([{might}])"
        self.assertEqual(self.val(f"enhancedStats({state}).Str"), 8)
        self.assertEqual(self.val(f"unenhancedStats({state}).Str"), 6)
        club = self.val(f"allSkills({state}).find((x) => x.name === 'Club')")
        self.assertEqual(club["rank"], self.val("allSkills(crawler()).find((x) => x.name === 'Club').rank") + 1)
        self.assertIn("Party: Battle Hymn +1", club["source"])
        attack = self.val(f"allAttacks({state}).find((x) => x.name === 'Club')")
        self.assertEqual(attack["damageBonus"], 1)
        self.assertIn("+2 damage (vs Undead) from Battle Hymn", attack["notes"])
        inactive = might.replace("name: 'Battle Hymn',", "name: 'Battle Hymn', active: false,")
        self.assertEqual(self.val(f"enhancedStats(partied([{inactive}])).Str"), 6)

    def test_buff_errors(self) -> None:
        self.assertIn("Name Party buff 1 or remove it.", self.val("partyErrors(partied([buff()]))"))
        bad = "buff({ name: 'Aura', bonuses: { dr: 'lots' } })"
        self.assertIn("The DR bonus on “Aura” must be a whole number.", self.val(f"errors(partied([{bad}]))"))
        missing = "buff({ name: 'Aura', bonuses: { damage: [{ amount: '', condition: 'at night' }] } })"
        self.assertTrue(any("has no amount" in x for x in self.val(f"partyErrors(partied([{missing}]))")))

    def test_external_buffs_max_three(self) -> None:
        four = ", ".join(f"buff({{ name: 'Buff {n}', bonuses: {{ dr: '1' }} }})" for n in range(1, 5))
        self.assertEqual(self.val(f"externalBuffLines(partied([{AURA}]))"), ["Protective Aura (from Donut): DR +2"])
        self.assertEqual(len(self.val(f"externalBuffLines(partied([{four}]))")), 3)
        self.assertIn("Only 3 External Buffs can be active at a time (4 are). Untick Active on the extras.", self.val(f"partyErrors(partied([{four}]))"))
        three_on = four.replace("name: 'Buff 4',", "name: 'Buff 4', active: false,")
        self.assertEqual(self.val(f"partyErrors(partied([{three_on}]))"), [])

    def test_party_notes(self) -> None:
        notes = self.val(f"partyNotes(partied([{AURA}], {{ party: {{ name: 'Royal Court', notes: 'Meet at the stairwell.', buffs: [{AURA}] }} }}))")
        self.assertEqual(notes, ["Party: Royal Court. Meet at the stairwell.", "Party buffs: Protective Aura (from Donut): DR +2."])
        self.assertEqual(self.val("partyNotes(crawler())"), [])


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class PartyPdfTests(unittest.TestCase):
    def test_party_on_the_sheet(self) -> None:
        fields = export_fields(
            """(() => {
              const s = initialState();
              s.name = 'Partied'; s.kind = 'human';
              s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
              s.combatType = 'weapon'; s.combat = 'Club'; s.weaponLocation = 'holding';
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              s.party = { name: 'Royal Court', notes: '', buffs: [normalizePartyBuff({ name: 'Protective Aura', from: 'Donut', bonuses: { dr: '2' } })] };
              return s;
            })()"""
        )
        self.assertEqual(fields["Text Field 30"], "+2 (Donut)")
        self.assertEqual(fields["Text Field 40"], "Protective Aura (from Donut): DR +2")  # External Buffs 1
        self.assertFalse(fields.get("Text Field 41"))
        self.assertEqual(fields["Text Field 31"], "2")
        self.assertIn("Party: Royal Court", fields["Text Field 102"])
        self.assertIn("Protective Aura (from Donut): DR +2", fields["Text Field 102"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
