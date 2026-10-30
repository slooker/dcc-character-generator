from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

try:
    from py_mini_racer import MiniRacer
except ImportError:  # pragma: no cover
    MiniRacer = None

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
# rules.js and the data modules it imports, in dependency order.
MODULES = ("details.js", "races-classes.js", "equipment.js", "rules.js")


def load_rules() -> "MiniRacer":
    """Evaluate the ES modules as one plain script so tests can call rules.js."""
    source = "\n".join((DIST / name).read_text(encoding="utf-8") for name in MODULES)
    source = re.sub(r"^import .*?;\s*$", "", source, flags=re.M | re.S)
    source = re.sub(r"^export ", "", source, flags=re.M)
    ctx = MiniRacer()
    ctx.eval(source)
    ctx.eval(
        """
        function humanCrawler(extra = {}) {
          const state = initialState();
          state.name = 'Test';
          state.kind = 'human';
          // First two Skills of the first option at each stage.
          state.backgrounds = backgrounds.human.map((stage) => ({
            option: 0, picks: stage.options[0].skills.slice(0, 2).map((x) => x.name),
          }));
          state.combatType = 'weapon';
          state.combat = 'Club';
          return Object.assign(state, extra);
        }
        const names = (list) => JSON.stringify(list.map((x) => x.name));
        """
    )
    return ctx


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class RaceClassEligibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()

    def eligible(self, kind: str, state_js: str) -> list[str]:
        fn = "eligibleRaces" if kind == "race" else "eligibleClasses"
        return json.loads(self.js.eval(f"names({fn}({state_js}))"))

    def test_data_matches_book_counts(self) -> None:
        self.assertEqual(self.js.eval("races.length"), 30)
        self.assertEqual(self.js.eval("classes.length"), 52)
        self.assertEqual(self.js.eval("classes.filter((x) => x.earth).length"), 24)
        self.assertEqual(self.js.eval("races.filter((x) => !x.earth).length"), 7)
        self.assertEqual(self.js.eval("classes.filter((x) => !x.classTypes.length).length"), 0)

    def test_starting_crawler_sees_only_unlimited_races(self) -> None:
        available = self.eligible("race", "humanCrawler()")
        self.assertIn("Human", available)
        self.assertIn("Arachnid", available)
        self.assertIn("Caprid", available)
        # Rank 5+, Popularity and Cat-only Races stay hidden at starting Ranks.
        for name in ("Amazonian", "Cat", "Obsidian Butterfly", "Sasquatch", "Bune", "Grulke", "Hobgoblin"):
            self.assertNotIn(name, available)

    def test_popularity_and_achievement_unlock_limited_options(self) -> None:
        self.assertIn("Bune", self.eligible("race", "humanCrawler({ popularity: '3' })"))
        self.assertNotIn("Bune", self.eligible("race", "humanCrawler({ popularity: '2' })"))
        self.assertIn("Former Child Actor", self.eligible("class", "humanCrawler({ popularity: '3' })"))
        self.assertIn("Bomb Squad Tech", self.eligible("class", "humanCrawler({ achievements: 'Cut!\\nBoom!' })"))
        self.assertNotIn("Bomb Squad Tech", self.eligible("class", "humanCrawler()"))
        self.assertIn("Shieldmaiden", self.eligible("class", "humanCrawler({ female: true })"))
        self.assertNotIn("Shieldmaiden", self.eligible("class", "humanCrawler()"))

    def test_skill_rank_prerequisites_need_rank_five(self) -> None:
        # Compensated Anarchist needs Popularity 3+ AND Explosives Handling 5+.
        self.assertNotIn("Compensated Anarchist", self.eligible("class", "humanCrawler({ popularity: '5' })"))
        self.assertNotIn("Monster Truck Driver", self.eligible("class", "humanCrawler()"))

    def test_alien_race_cannot_take_earth_classes(self) -> None:
        available = self.eligible("class", "humanCrawler({ race: 'Caprid' })")
        self.assertIn("Boring Ol’ Mage", available)
        self.assertNotIn("Harii", available)
        earth = json.loads(self.js.eval("names(classes.filter((x) => x.earth))"))
        self.assertFalse(set(earth) & set(available))
        self.assertIn("Harii", self.eligible("class", "humanCrawler()"))

    def test_race_that_cannot_worship_excludes_worship_classes(self) -> None:
        available = self.eligible("class", "humanCrawler({ race: 'Changbi Demon' })")
        for name in ("Boring Ol’ Cleric", "Santero", "Cavalier", "Sacred Paladin", "Black Inquisitor General"):
            self.assertNotIn(name, available)
        self.assertIn("Cavalier", self.eligible("class", "humanCrawler()"))

    def test_club_access_blocks_listed_classes(self) -> None:
        desperado = self.eligible("class", "humanCrawler({ clubs: { desperado: true, vanquisher: false } })")
        self.assertNotIn("Boring Ol’ Cleric", desperado)
        self.assertNotIn("Sacred Paladin", desperado)
        self.assertIn("Cavalier", desperado)
        vanquisher = self.eligible("class", "humanCrawler({ clubs: { desperado: false, vanquisher: true } })")
        for name in ("Boring Ol’ Rogue", "High Rise Grifter", "Identity Thief"):
            self.assertNotIn(name, vanquisher)

    def test_cat_options(self) -> None:
        cat = "humanCrawler({ kind: 'animal', species: 'House cat', size: '2' })"
        self.assertIn("Cat", self.eligible("race", cat))
        self.assertNotIn("Cat", self.eligible("race", "humanCrawler({ kind: 'animal', species: 'Dog' })"))
        # An animal Cat who keeps their Race counts as cat-based.
        self.assertIn("Feral Cat Berserker", self.eligible("class", cat))
        self.assertIn("Feral Cat Berserker", self.eligible("class", "humanCrawler({ race: 'Tigran' })"))
        self.assertNotIn("Feral Cat Berserker", self.eligible("class", "humanCrawler()"))

    def test_ineligible_selection_is_a_validation_error(self) -> None:
        issues = json.loads(self.js.eval("JSON.stringify(errors(humanCrawler({ race: 'Caprid', className: 'Harii' })))"))
        self.assertTrue(any("Harii Class requires an Earth-based Race" in x for x in issues), issues)
        pending = json.loads(self.js.eval("JSON.stringify(raceClassErrors(humanCrawler({ race: 'Arachnid', className: 'Harii' })))"))
        self.assertTrue(any("choose one" in x for x in pending), pending)
        picked = self.js.eval("""(() => {
          const s = humanCrawler({ race: 'Arachnid', className: 'Harii' });
          const pick = entryEffects(findClass('Harii'), {}).find((x) => x.type === 'skillPick');
          s.classChoices = { [pick.key]: ['Axe'] };
          return JSON.stringify(raceClassErrors(s));
        })()""")
        self.assertEqual(json.loads(picked), [])

    def test_old_drafts_gain_race_class_fields(self) -> None:
        state = json.loads(self.js.eval("JSON.stringify(normalizeState({ name: 'Old', clubs: { desperado: true } }))"))
        self.assertEqual(state["race"], "")
        self.assertEqual(state["className"], "")
        self.assertEqual(state["clubs"], {"desperado": True, "vanquisher": False})


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class RaceClassBenefitTests(unittest.TestCase):
    """Race/Class bonuses: Stats to Unenhanced, Skills add Ranks immediately, cap Rank 10."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(
            """
            function statsCrawler(extra = {}) {
              return humanCrawler({ stats: { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' }, ...extra });
            }
            function rank(state, name) {
              const skill = allSkills(state).find((x) => x.name.toLowerCase() === name.toLowerCase());
              return skill ? skill.rank : 0;
            }
            function choose(state, kind, entry, type, value, text = '') {
              const effect = entryEffects(entry, {}).find((x) => x.type === type && x.benefit.includes(text));
              state[kind] = { ...state[kind], [effect.key]: value };
              return state;
            }
            """
        )

    def val(self, expr: str):
        return json.loads(self.js.eval(f"JSON.stringify({expr})"))

    def test_stat_changes_go_to_unenhanced_and_enhanced_matches(self) -> None:
        human = self.val("unenhancedStats(statsCrawler({ race: 'Human' }))")
        self.assertEqual(human, {"Str": 8, "Int": 7, "Con": 6, "Dex": 5, "Cha": 4})
        self.assertEqual(self.val("enhancedStats(statsCrawler({ race: 'Human' }))"), human)
        # Base assignments are untouched.
        self.assertEqual(self.val("statsCrawler({ race: 'Human' }).stats.Str"), "6")
        # Derived values use the Enhanced Stat: Con 6 -> mod +3 -> Health 30.
        self.assertEqual(self.val("derived(statsCrawler({ race: 'Human' })).health"), 30)

    def test_stat_cap_applies_after_changes(self) -> None:
        stats = self.val("unenhancedStats(humanCrawler({ race: 'Pocket Kuma', stats: { Str: '20', Int: '', Con: '', Dex: '', Cha: '' } }))")
        self.assertEqual(stats["Str"], 10)
        self.assertEqual(stats["Int"], "")

    def test_stat_split_must_total_exactly(self) -> None:
        self.assertTrue(any("split exactly 6" in x for x in self.val("raceClassErrors(statsCrawler({ race: 'Elf, City' }))")))
        stats = self.val("unenhancedStats(choose(statsCrawler({ race: 'Elf, City' }), 'raceChoices', findRace('Elf, City'), 'statSplit', { Int: 2, Dex: 4, Cha: 0 }))")
        self.assertEqual((stats["Int"], stats["Dex"], stats["Cha"]), (7, 7, 2))
        errors = self.val("raceClassErrors(choose(statsCrawler({ race: 'Elf, City' }), 'raceChoices', findRace('Elf, City'), 'statSplit', { Int: 2, Dex: 4, Cha: 0 }))")
        self.assertFalse(any("split" in x for x in errors), errors)

    def test_skill_bonus_stacks_on_existing_rank(self) -> None:
        # Latchkey Kid gives Streetwise at Rank 1; Elf, City adds +2.
        self.assertEqual(self.val("rank(statsCrawler(), 'Streetwise')"), 1)
        self.assertEqual(self.val("rank(statsCrawler({ race: 'Elf, City' }), 'Streetwise')"), 3)
        source = self.val("allSkills(statsCrawler({ race: 'Elf, City' })).find((x) => x.name === 'Streetwise').source")
        self.assertIn("Race +2", source)

    def test_new_skill_or_spell_is_gained_at_bonus_rank(self) -> None:
        self.assertEqual(self.val("rank(statsCrawler(), 'Pugilism')"), 0)
        self.assertEqual(self.val("rank(statsCrawler({ race: 'Crocodilian' }), 'Pugilism')"), 2)
        self.assertEqual(self.val("rank(statsCrawler({ race: 'Arachnid' }), 'Web')"), 3)
        self.assertEqual(self.val("allSkills(statsCrawler({ race: 'Arachnid' })).find((x) => x.name === 'Web').stat"), "Int")

    def test_rank_ten_cap_wastes_excess(self) -> None:
        # Club Rank 3 + Lajabless +3 (pick) + Boring Ol' Fighter +5 (pick) = 11 -> 10.
        expr = """(() => {
          let s = statsCrawler({ race: 'Lajabless', className: 'Boring Ol’ Fighter' });
          s = choose(s, 'raceChoices', findRace('Lajabless'), 'skillPick', ['Club'], 'Weapon');
          s = choose(s, 'classChoices', findClass('Boring Ol’ Fighter'), 'skillPick', ['Club']);
          return allSkills(s).find((x) => x.name === 'Club');
        })()"""
        club = self.val(expr)
        self.assertEqual(club["rank"], 10)
        self.assertEqual(club["wasted"], 1)

    def test_class_prerequisite_counts_race_bonuses(self) -> None:
        # Pugilism Rank 3 from combat + Crocodilian +2 = Rank 5 unlocks Prizefighter.
        hand = "statsCrawler({ combatType: 'hand', combat: 'Pugilism' })"
        self.assertNotIn("Prizefighter", self.val(f"eligibleClasses({hand}).map((x) => x.name)"))
        with_race = "statsCrawler({ combatType: 'hand', combat: 'Pugilism', race: 'Crocodilian' })"
        self.assertIn("Prizefighter", self.val(f"eligibleClasses({with_race}).map((x) => x.name)"))

    def test_group_bonus_raises_owned_and_grants_missing_skills(self) -> None:
        # Skyfowl: +2 in all Charisma-based Skills (p. 141) with the p. 128 grant rule.
        self.assertEqual(self.val("rank(statsCrawler({ race: 'Skyfowl' }), 'Streetwise')"), 3)
        self.assertEqual(self.val("rank(statsCrawler({ race: 'Skyfowl' }), 'Diplomacy')"), 2)

    def test_shotgun_messenger_movement_skills(self) -> None:
        s = "statsCrawler({ className: 'Shotgun Messenger' })"
        for name in ("Climbing", "Jumping", "Running", "Swimming"):
            self.assertGreaterEqual(self.val(f"rank({s}, '{name}')"), 1, name)
        self.assertEqual(self.val(f"rank({s}, 'Balance')"), 0)

    def test_stats_never_drop_below_one(self) -> None:
        # Cha 2 with Hobgoblin's -5 Charisma floors at 1.
        self.assertEqual(self.val("unenhancedStats(statsCrawler({ race: 'Hobgoblin' })).Cha"), 1)

    def test_negative_group_keeps_minimum_one_rank(self) -> None:
        self.assertEqual(self.val("rank(statsCrawler({ className: 'Boring Ol’ Mage' }), 'Club')"), 1)

    def test_lajabless_day_night_values(self) -> None:
        # Str 6, Int 5. Day: Int +5, Str halved. Night: Str +5 then doubled.
        d = self.val("derived(statsCrawler({ race: 'Lajabless' }))")
        self.assertEqual(d["statText"]["Int"], "10/5")
        self.assertEqual(d["statText"]["Str"], "3/22")
        self.assertEqual(d["modText"]["Str"], "+2/+5")
        self.assertEqual(d["statText"]["Con"], "4")
        self.assertEqual(d["manaText"], "10/5")
        self.assertIsNone(self.val("derived(statsCrawler({ race: 'Human' })).manaText"))

    def test_dr_size_and_move(self) -> None:
        dr = self.val("derived(statsCrawler({ race: 'Crocodilian', className: 'Boring Ol’ Barbarian' })).dr")
        self.assertEqual(dr["parts"], [{"value": 3, "from": "Race"}, {"value": 2, "from": "Class"}])
        self.assertEqual(dr["total"], 5)
        self.assertEqual(self.val("derived(statsCrawler({ race: 'Changeling' })).size"), "Large (5)")
        self.assertEqual(self.val("derived(statsCrawler({ race: 'Tigran' })).move"), 30)

    def test_every_pick_has_options(self) -> None:
        empty = self.val("[...races, ...classes].flatMap((e) => e.effects.flat().filter((x) => x.type === 'skillPick' && !x.options.length).map(() => e.name))")
        self.assertEqual(empty, [])


class RaceClassUiTests(unittest.TestCase):
    def test_step_is_wired_into_flow_and_pdf(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        pdf = (DIST / "pdf.js").read_text(encoding="utf-8")
        self.assertIn("['raceclass', 'Race & Class']", app)
        self.assertIn("raceclass: raceClassStep", app)
        self.assertIn("eligibleRaces(state)", app)
        self.assertIn("eligibleClasses(state)", app)
        self.assertIn("setField(form, 'class', state.className", pdf)
        self.assertIn("state.race ||", pdf)


if __name__ == "__main__":
    unittest.main(verbosity=2)
