from __future__ import annotations

import json
import unittest

from test_race_class import MiniRacer, load_rules


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class BuildSystemTests(unittest.TestCase):
    """dist/builds.js: the Race & Class Point Build System (dcc-classes.pdf pp. 158-162)."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(
            """
            function build(kind, benefits = [], detriments = [], extra = {}) {
              // normalizeBuild turns { stat, amount } rows into { stats }, as for builds saved before rows held several Stats.
              return normalizeBuild(Object.assign(newBuild(kind), { name: 'Test Build', benefits, detriments }, extra));
            }
            """
        )

    def eval(self, code: str):
        return json.loads(self.js.eval(f"JSON.stringify({code})"))

    def points(self, code: str) -> dict:
        return self.eval(f"buildPoints({code})")

    def errors(self, code: str) -> list[str]:
        return self.eval(f"buildErrors({code})")

    def test_pools_and_costs(self) -> None:
        self.assertEqual(self.points("build('race')")["budget"], 25)
        self.assertEqual(self.points("build('class')")["budget"], 30)
        points = self.points("""build('race', [
            { option: 'stat', stat: 'Str', amount: 3 },      // Minor x3
            { option: 'skill', skill: 'Dodge', amount: 2 },  // Moderate x2
            { option: 'move', amount: 1 },                    // Major
            { option: 'poisonImmunity' },                     // Extreme
            { option: 'rank20All' },                          // Epic
            { option: 'custom', tier: 'moderate', text: 'Glows when lying' },
        ])""")
        self.assertEqual(points["spent"], 3 + 4 + 3 + 4 + 6 + 2)

    def test_detriments_add_at_most_five_points(self) -> None:
        # -3 Dex is 1 point (1 per -2), -1 to all Cha Skills is 1, a Major detriment is 3.
        points = self.points("""build('class', [], [
            { option: 'statPenalty', stat: 'Dex', amount: 3 },
            { option: 'statSkillsPenalty', stat: 'Cha', amount: 1 },
            { option: 'vulnerableCommon' },
        ])""")
        self.assertEqual((points["rawDetriments"], points["earned"], points["budget"]), (5, 5, 35))
        capped = self.points("build('class', [], [{ option: 'vulnerableCommon' }, { option: 'statCap', stat: 'Int' }])")
        self.assertEqual((capped["rawDetriments"], capped["earned"]), (6, 5))

    def test_overspending_and_limits_are_errors(self) -> None:
        over = self.errors("build('race', [{ option: 'stat', stat: 'Str', amount: 20 }, { option: 'skill', skill: 'Dodge', amount: 3 }])")
        self.assertTrue(any("spends 26 Build Points but has 25" in x for x in over), over)
        self.assertTrue(any("limited to +3" in x for x in self.errors("build('race', [{ option: 'dr', amount: 4 }])")))
        # Catcher and Hot Stuff Aura are Passive: a Class can have 5 Ranks of them, not 6.
        passive = "build('class', [{ option: 'skill', skill: 'Catcher', amount: 3 }, { option: 'skill', skill: 'Hot Stuff Aura', amount: %d }])"
        self.assertEqual(self.errors(passive % 2), [])
        self.assertTrue(any("Passive Skills" in x for x in self.errors(passive % 3)))
        self.assertEqual(self.errors(passive.replace("'class'", "'race'") % 3), [])

    def test_row_validation(self) -> None:
        self.assertTrue(any("isn’t a Skill or Spell in the book" in x for x in self.errors("build('race', [{ option: 'skill', skill: 'Juggling Chainsaws', amount: 1 }])")))
        group = "build('race', [{ option: 'groupSmall', detail: 'Bashing', skills: %s, amount: 1 }])"
        self.assertTrue(any("needs 3–5 Skills" in x for x in self.errors(group % "['Club', 'Hammer']")))
        self.assertTrue(any("Passive Skills and Spells" in x for x in self.errors(group % "['Club', 'Dodge', 'Catcher']")))
        self.assertTrue(any("only a Race can take this" in x for x in self.errors("build('class', [{ option: 'small' }])")))
        self.assertTrue(any("describe it" in x for x in self.errors("build('race', [{ option: 'custom', tier: 'minor', text: ' ' }])")))

    def test_one_row_can_hold_several_stats(self) -> None:
        mixed = "build('race', [{ option: 'stat', stats: { Str: 2, Dex: 1 } }], [{ option: 'statPenalty', stats: { Int: 2, Cha: 2 } }])"
        points = self.points(mixed)
        self.assertEqual((points["spent"], points["rawDetriments"]), (3, 2))
        entry = self.eval(f"buildEntry({mixed})")
        self.assertIn("+2 Strength, +1 Dexterity", entry["benefits"])
        self.assertIn("−2 Intelligence, −2 Charisma", entry["benefits"])
        self.assertIn({"type": "stat", "stats": {"Str": 2, "Dex": 1}}, sum(entry["effects"], []))
        self.assertTrue(any("choose a Stat" in x for x in self.errors("build('race', [{ option: 'stat', stats: {} }])")))
        # A row saved with one stat and an amount still works.
        self.assertEqual(self.eval("normalizeBuild({ benefits: [{ option: 'stat', stat: 'Con', amount: 3 }] }).benefits[0].stats"), {"Con": 3})

    def test_names(self) -> None:
        self.assertIsNone(self.eval("nameIssue('Dungeon Dad', 'class')"))
        self.assertIsNone(self.eval("nameIssue('Moth Man/Moth Woman', 'race')"))
        self.assertIn("already a Race or Class in the book", self.eval("nameIssue('crocodilian', 'race')"))
        self.assertIn("at least 2", self.eval("nameIssue(' x ', 'race')"))
        self.assertIn("simple punctuation", self.eval("nameIssue('<script>', 'race')"))

    def test_entry_matches_the_book_shape(self) -> None:
        entry = self.eval("""buildEntry(build('class', [
            { option: 'stat', stat: 'Cha', amount: 2 },
            { option: 'skillChoice', skills: ['Club', 'Sword'], amount: 2 },
            { option: 'rage' },
        ], [{ option: 'mustWorship' }, { option: 'noClub', club: 'Club Vanquisher' }], { earth: true, classTypes: ['Bard', 'Fighter'] }))""")
        self.assertEqual(entry["benefits"], [
            "+2 Charisma", "+2 to a Skill of your choice (Club and Sword)",
            "Rage (Benefit): Your melee attacks deal +1 damage for each Health Bar slot you have lost",
            "Must worship a deity", "Cannot choose this Class if you have access to the Club Vanquisher",
            "Silver Earth Box, with guaranteed Earth Hobby Potion",
        ])
        self.assertEqual([x["type"] for x in entry["requires"]], ["earthRace", "worshipAllowed", "noClub"])
        self.assertEqual(entry["classTypes"], ["Bard", "Fighter"])
        self.assertEqual(entry["effects"][1], [{"type": "skillPick", "bonus": 2, "count": 1, "options": ["Club", "Sword"]}])
        race = self.eval("buildEntry(build('race'))")
        self.assertEqual(race["benefits"][0], "Size: Medium (4)")
        self.assertEqual(self.eval("buildEntry(build('race', [{ option: 'small' }])).benefits[0]"), "Size: Small (2)")


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class CustomRaceOnCrawlerTests(unittest.TestCase):
    """A custom build on a crawler goes through the same rules as a book Race/Class."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(
            """
            function crawler(raceBuild, classBuild, extra = {}) {
              const s = humanCrawler(extra);
              s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
              if (raceBuild) { s.customRace = { id: 1, author: 'Bob', build: raceBuild }; s.race = raceBuild.name; }
              if (classBuild) { s.customClass = { id: 2, author: 'Bob', build: classBuild }; s.className = classBuild.name; }
              return s;
            }
            function rows(list) { return normalizeBuild({ benefits: list }).benefits; }
            const goblinish = Object.assign(newBuild('race'), { name: 'Gutter Sprite', earth: false, benefits: rows([
              { option: 'stat', stat: 'Dex', amount: 4 },
              { option: 'skill', skill: 'Dodge', amount: 2 },
              { option: 'rank20', skill: 'Dodge' },
              { option: 'dr', amount: 1 },
              { option: 'step', amount: 1 },
              { option: 'small' },
              { option: 'farSight' },
            ]) });
            const earthClass = Object.assign(newBuild('class'), { name: 'Dungeon Dad', earth: true, benefits: rows([{ option: 'stat', stat: 'Cha', amount: 2 }]) });
            """
        )

    def eval(self, code: str):
        return json.loads(self.js.eval(f"JSON.stringify({code})"))

    def test_effects_apply(self) -> None:
        self.js.eval("var s = crawler(goblinish, null)")
        self.assertEqual(self.eval("findRace(s.race, s).name"), "Gutter Sprite")
        self.assertIsNone(self.eval("findRace(s.race)"))  # only through the crawler's snapshot
        self.assertEqual(self.eval("unenhancedStats(s).Dex"), 7)
        self.assertEqual(self.eval("allSkills(s).find((x) => x.name === 'Dodge').rank"), 2)
        self.assertEqual(self.eval("rankLimit(s, 'Dodge')"), 20)
        d = self.eval("derived(s)")
        self.assertEqual((d["size"], d["step"], d["dr"]["total"]), ("Small (2)", 15, 1))
        self.assertEqual(self.eval("raceClassErrors(s)"), [])

    def test_earth_class_needs_earth_race(self) -> None:
        issues = self.eval("raceClassRequirementIssues(crawler(goblinish, earthClass), findClass('Dungeon Dad', crawler(goblinish, earthClass)))")
        self.assertEqual(issues, ["an Earth-based Race"])
        self.assertEqual(self.eval("raceClassRequirementIssues(crawler(null, earthClass), findClass('Dungeon Dad', crawler(null, earthClass)))"), [])

    def test_skill_penalty_needs_the_skill(self) -> None:
        self.js.eval("""var owned = allSkills(crawler(null, null))[0];
            var penalized = Object.assign(newBuild('race'), { name: 'Rusty', detriments: rows([{ option: 'skillPenalty', skill: owned.name, amount: 1 }]) });
            var tooMuch = Object.assign(newBuild('race'), { name: 'Rustier', detriments: rows([{ option: 'skillPenalty', skill: owned.name, amount: owned.rank + 1 }]) });""")
        self.assertEqual(self.eval("raceClassRequirementIssues(crawler(penalized), findRace('Rusty', crawler(penalized)))"), [])
        rank = self.eval("owned.rank")
        self.assertEqual(self.eval("allSkills(crawler(penalized)).find((x) => x.name === owned.name).rank"), rank - 1)
        self.assertEqual(len(self.eval("raceClassRequirementIssues(crawler(tooMuch), findRace('Rustier', crawler(tooMuch)))")), 1)

    def test_strict_stat_cap_holds_against_gear(self) -> None:
        self.js.eval("""var capped = Object.assign(newBuild('race'), { name: 'Weakling', benefits: rows([{ option: 'stat', stat: 'Str', amount: 8 }]),
              detriments: rows([{ option: 'statCap', stat: 'Str' }]) });
            var t = crawler(capped);
            t.gear = [Object.assign(newGearItem(), { name: 'Belt of Might', location: 'torso', bonuses: { stats: { Str: 5 }, skills: [], dr: '' } })];""")
        self.assertEqual((self.eval("unenhancedStats(t).Str"), self.eval("enhancedStats(t).Str")), (10, 10))

    def test_invalid_shared_build_is_an_error(self) -> None:
        self.js.eval("var bad = Object.assign(newBuild('race'), { name: 'Overclocked', benefits: rows([{ option: 'stat', stat: 'Str', amount: 30 }]) });")
        errors = self.eval("raceClassErrors(crawler(bad))")
        self.assertTrue(any("doesn’t follow the Build System" in x for x in errors), errors)

    def test_snapshot_survives_normalize(self) -> None:
        self.assertEqual(self.eval("findRace('Gutter Sprite', normalizeState(JSON.parse(JSON.stringify(crawler(goblinish))))).name"), "Gutter Sprite")


if __name__ == "__main__":
    unittest.main(verbosity=2)
