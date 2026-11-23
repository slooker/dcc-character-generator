from __future__ import annotations

import json
import unittest

from test_race_class import MiniRacer, load_rules


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class AdvancementTests(unittest.TestCase):
    """Levels add 3 Stat points; skill-ups are logged by floor and applied in order."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(
            """
            function crawler(extra = {}) {
              return humanCrawler({ stats: { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' }, ...extra });
            }
            function rank(state, name) {
              const skill = allSkills(state).find((x) => x.name.toLowerCase() === name.toLowerCase());
              return skill ? skill.rank : 0;
            }
            const up = (skill, ranks, floor) => ({ skill, ranks: String(ranks), floor: String(floor), how: 'Training', note: '' });
            """
        )

    def val(self, expr: str):
        return json.loads(self.js.eval(f"JSON.stringify({expr})"))

    def test_levels_add_three_stat_points_to_unenhanced(self) -> None:
        state = "crawler({ levelUps: [{ floor: '1', stats: { Str: 3 } }, { floor: '2', stats: { Dex: 2, Cha: 1 } }] })"
        self.assertEqual(self.val(f"level({state})"), 3)
        self.assertEqual(self.val(f"unenhancedStats({state})"), {"Str": 9, "Int": 5, "Con": 4, "Dex": 5, "Cha": 3})
        self.assertEqual(self.val(f"advancementErrors({state})"), [])
        bad = self.val("advancementErrors(crawler({ levelUps: [{ floor: '1', stats: { Str: 2 } }] }))")
        self.assertTrue(any("exactly 3 Stat points" in x for x in bad), bad)

    def test_race_stat_cap_still_applies_after_levels(self) -> None:
        state = "crawler({ race: 'Pocket Kuma', stats: { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' }, levelUps: Array.from({ length: 4 }, () => ({ floor: '3', stats: { Str: 3 } })) })"
        self.assertEqual(self.val(f"unenhancedStats({state}).Str"), 10)  # 6 - 4 + 12, capped at 10

    def test_human_gains_ai_favor_per_level_after_choosing_human(self) -> None:
        levels = "[{ floor: '2', stats: { Str: 3 } }, { floor: '3', stats: { Str: 3 } }, { floor: '4', stats: { Str: 3 } }]"
        self.assertEqual(self.val(f"derived(crawler({{ race: 'Human', levelUps: {levels} }})).aiFavor"), 3)  # 1 + 2 levels on floor 3+
        self.assertEqual(self.val(f"derived(crawler({{ levelUps: {levels} }})).aiFavor"), 1)

    def test_skill_ups_cap_at_fifteen_and_report_waste(self) -> None:
        state = "crawler({ skillUps: [up('Club', 14, 1)] })"  # Club starts at Rank 3
        self.assertEqual(self.val(f"rank({state}, 'Club')"), 15)
        self.assertEqual(self.val(f"skillUpReport({state})[0]"), {"skill": "Club", "before": 3, "after": 15, "wasted": 2, "cap": 15})

    def test_heal_is_rank_one_maximum(self) -> None:
        # Heal: "Limitations: Rank 1 maximum" (p. 206), before and after Race & Class selection.
        for floor in (1, 4):
            state = f"crawler({{ floor: '4', race: 'Human', skillUps: [up('Heal', 3, {floor})] }})"
            self.assertEqual(self.val(f"rank({state}, 'Heal')"), 1)
            self.assertEqual(self.val(f"skillUpReport({state})[0]"), {"skill": "Heal", "before": 1, "after": 1, "wasted": 3, "cap": 1})
        self.assertEqual(self.val("rankLimit(crawler(), 'Heal')"), 1)
        # Even a Race that lets every Skill reach Rank 20.
        self.js.eval("""var all20 = normalizeBuild({ kind: 'race', name: 'Overachiever', benefits: [{ option: 'rank20All' }] });""")
        self.assertEqual(self.val("rankLimit(crawler({ customRace: { id: 1, build: all20 }, race: 'Overachiever' }), 'Heal')"), 1)

    def test_custom_builds_cannot_raise_heal(self) -> None:
        issues = self.val("buildErrors(normalizeBuild({ kind: 'race', name: 'Medic', benefits: [{ option: 'skill', skill: 'Heal', amount: 1 }] }))")
        self.assertTrue(any("Heal is Rank 1 maximum" in x for x in issues), issues)

    def test_race_or_class_can_allow_rank_twenty(self) -> None:
        # Sasquatch: "Smush Skill can be raised to Rank 20" (Sasquatch also needs Smush 5+).
        state = "crawler({ combatType: 'hand', combat: 'Foot Soldier', race: 'Sasquatch', floor: '4', skillUps: [up('Smush', 2, 2), up('Smush', 20, 3)] })"
        self.assertEqual(self.val(f"rank({state}, 'Smush')"), 20)
        notes = self.val(f"allSkills({state}).find((x) => x.name === 'Smush').notes")
        self.assertIn("come online on Floor 6", notes)

    def test_rank_twenty_pick_needs_a_choice(self) -> None:
        issues = self.val("raceClassErrors(crawler({ className: 'Gladiator' }))")
        self.assertTrue(any("One Weapon Skill can be raised to Rank 20" in x for x in issues), issues)

    def test_skill_ups_before_selection_count_first(self) -> None:
        # Streetwise Rank 1 + 9 on Floor 2 = 10, then Elf, City +2 on Floor 3 is lost.
        state = "crawler({ race: 'Elf, City', skillUps: [up('Streetwise', 9, 2)] })"
        self.assertEqual(self.val(f"rank({state}, 'Streetwise')"), 10)
        # Already above 10 before selection: keeps 12, the bonus is lost.
        state = "crawler({ race: 'Elf, City', skillUps: [up('Streetwise', 11, 2)] })"
        self.assertEqual(self.val(f"rank({state}, 'Streetwise')"), 12)
        # The same skill-up after selection stacks on the Race bonus up to 15.
        state = "crawler({ race: 'Elf, City', skillUps: [up('Streetwise', 11, 3)] })"
        self.assertEqual(self.val(f"rank({state}, 'Streetwise')"), 14)

    def test_skill_up_can_learn_a_catalog_skill(self) -> None:
        state = "crawler({ skillUps: [up('Lockpicking', 2, 1)] })"
        self.assertEqual(self.val(f"rank({state}, 'Lockpicking')"), 2)
        self.assertEqual(self.val(f"allSkills({state}).find((x) => x.name === 'Lockpicking').stat"), "Dex")
        bad = self.val("advancementErrors(crawler({ skillUps: [up('Not A Skill', 1, 1)] }))")
        self.assertTrue(any("choose a Skill or Spell" in x for x in bad), bad)

    def test_skill_up_can_add_a_custom_skill(self) -> None:
        # An Earth hobby potion's Skill isn't in the book; later skill-ups add to it.
        custom = "{ ...up('Competitive Yo-Yo', 2, 1), custom: { stat: 'Dex', check: 'Opposed', description: 'Walk the dog.' } }"
        state = f"crawler({{ skillUps: [{custom}, up('competitive yo-yo', 3, 2)] }})"
        skill = self.val(f"allSkills({state}).find((x) => x.name === 'Competitive Yo-Yo')")
        self.assertEqual((skill["rank"], skill["stat"], skill["check"]), (5, "Dex", "Opposed"))
        self.assertIn("Walk the dog.", skill["notes"])
        self.assertEqual(self.val(f"advancementErrors({state})"), [])
        # A custom entry with a book name is the book's Skill.
        book = "crawler({ skillUps: [{ ...up('Lockpicking', 2, 1), custom: { stat: 'Cha' } }] })"
        self.assertEqual(self.val(f"allSkills({book}).find((x) => x.name === 'Lockpicking').stat"), "Dex")

    def test_earlier_skill_ups_unlock_prerequisites(self) -> None:
        # Monster Truck Driver needs Driving 5+.
        self.assertNotIn("Monster Truck Driver", self.val("eligibleClasses(crawler()).map((x) => x.name)"))
        state = "crawler({ race: 'Human', skillUps: [up('Driving', 5, 2)] })"
        self.assertIn("Monster Truck Driver", self.val(f"eligibleClasses({state}).map((x) => x.name)"))

    def test_level_and_floor_reach_the_sheet(self) -> None:
        d = self.val("derived(crawler({ floor: '4', levelUps: [{ floor: '3', stats: { Con: 3 } }] }))")
        self.assertEqual((d["level"], d["floor"]), (2, 4))


if __name__ == "__main__":
    unittest.main(verbosity=2)
