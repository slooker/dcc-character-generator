from __future__ import annotations

import json
import unittest

from test_pdf_export import export_fields, export_pdf, sheet_pages
from test_race_class import MiniRacer, load_rules

# A finished human Club crawler with Str 6 / Int 5 / Con 4 / Dex 3 / Cha 2, plus helpers.
SETUP = """
function crawler(extra = {}) {
  return humanCrawler({ stats: { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' }, weaponLocation: 'holding', ...extra });
}
function gear(kind, fields = {}) {
  return normalizeGearItem({ ...newGearItem(kind), ...fields });
}
"""


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class EquipmentRulesTests(unittest.TestCase):
    """dist/equipment.js + rules.js: Gear Slots, equipped-only bonuses, gold and Misc. Junk (pp. 98-99)."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.js = load_rules()
        cls.js.eval(SETUP)

    def val(self, expr: str):
        return json.loads(self.js.eval(f"JSON.stringify({expr})"))

    def errors(self, gear_js: str, extra: str = "") -> list:
        return self.val(f"equipmentErrors(crawler({{ gear: [{gear_js}] {extra} }}))")

    def test_only_equipped_gear_changes_enhanced_stats(self) -> None:
        helmet = "gear('item', { name: 'Brain Bucket', location: 'head', bonuses: { stats: { Str: '2', Int: '-1' } } })"
        self.assertEqual(self.val(f"enhancedStats(crawler({{ gear: [{helmet}] }}))"), {"Str": 8, "Int": 4, "Con": 4, "Dex": 3, "Cha": 2})
        self.assertEqual(self.val(f"unenhancedStats(crawler({{ gear: [{helmet}] }})).Str"), 6)
        stowed = helmet.replace("location: 'head'", "location: 'inventory'")
        self.assertEqual(self.val(f"enhancedStats(crawler({{ gear: [{stowed}] }})).Str"), 6)
        hot = helmet.replace("location: 'head'", "location: 'hotlist:4'")
        self.assertEqual(self.val(f"enhancedStats(crawler({{ gear: [{hot}] }})).Str"), 6)
        # Enhanced never drops below 1, and mods use Enhanced.
        cursed = "gear('item', { name: 'Cursed Ring', location: 'accessories', bonuses: { stats: { Cha: '-5' } } })"
        self.assertEqual(self.val(f"enhancedStats(crawler({{ gear: [{cursed}] }})).Cha"), 1)
        self.assertEqual(self.val(f"derived(crawler({{ gear: [{helmet}] }})).lift"), 120)  # Str 8 x 15

    def test_one_item_per_body_slot_including_starting_clothing(self) -> None:
        hat = "gear('item', { name: 'Hat', location: 'head' })"
        self.assertEqual(self.errors(hat), [])
        self.assertTrue(any("Head can hold one item" in x for x in self.errors(f"{hat}, gear('item', {{ name: 'Helmet', location: 'head' }})")))
        clash = self.errors(hat, ", clothing: { Head: 'Ball cap', Torso: '', Arms: '', Hands: '', Legs: '', Feet: '' }")
        self.assertTrue(any("Ball cap" in x and "Hat" in x for x in clash), clash)

    def test_hands_hold_two_and_two_handed_uses_both(self) -> None:
        # The starting Club is already in hand.
        self.assertEqual(self.errors("gear('item', { name: 'Shield', location: 'holding' })"), [])
        too_many = self.errors("gear('item', { name: 'Greatsword', location: 'holding', twoHanded: true })")
        self.assertTrue(any("Holding uses 3 hands" in x for x in too_many), too_many)
        self.assertTrue(any("Holding uses 3 hands" in x for x in self.errors("", ", weaponTwoHanded: true, items: [{ id: 'u', name: 'Torch', qty: 1, kind: 'useful', location: 'holding' }]")))
        # Gloves are separate from holding.
        self.assertEqual(self.errors("gear('item', { name: 'Gloves', location: 'gloves' }), gear('item', { name: 'Shield', location: 'holding' })"), [])

    def test_accessories_max_ten_one_belt_one_cape(self) -> None:
        ten = ", ".join(f"gear('item', {{ name: 'Ring {i}', location: 'accessories' }})" for i in range(10))
        self.assertEqual(self.errors(ten), [])
        self.assertTrue(any("at most 10" in x for x in self.errors(ten + ", gear('item', { name: 'Ring 11', location: 'accessories' })")))
        belts = "gear('item', { name: 'Belt A', location: 'accessories', accessoryType: 'belt' }), gear('item', { name: 'Belt B', location: 'accessories', accessoryType: 'belt' })"
        self.assertTrue(any("one belt" in x for x in self.errors(belts)))

    def test_gear_skill_bonuses_apply_while_equipped_but_not_to_prerequisites(self) -> None:
        goggles = "gear('item', { name: 'Driving Goggles', location: 'head', bonuses: { skills: [{ name: 'Driving', ranks: '5' }, { name: 'Club', ranks: '2' }] } })"
        state = f"crawler({{ gear: [{goggles}] }})"
        skills = {x["name"]: x for x in self.val(f"allSkills({state})")}
        self.assertEqual(skills["Club"]["rank"], 5)  # starting Rank 3 + 2
        self.assertEqual(skills["Driving"]["rank"], 5)  # granted while equipped
        self.assertIn("Gear: Driving Goggles +5", skills["Driving"]["source"])
        # Monster Truck Driver needs Driving 5+; gear doesn't count.
        self.assertNotIn("Monster Truck Driver", self.val(f"eligibleClasses(crawler({{ race: 'Human', gear: [{goggles}] }})).map((x) => x.name)"))
        stowed = goggles.replace("location: 'head'", "location: 'inventory'")
        self.assertNotIn("Driving", [x["name"] for x in self.val(f"allSkills(crawler({{ gear: [{stowed}] }}))")])

    def test_gear_ranks_stop_at_the_rank_limit(self) -> None:
        # Club: Rank 3 + 11 from skill-ups = 14; a +3 Club item only reaches 15.
        ring = "gear('item', { name: 'Club Ring', location: 'accessories', bonuses: { skills: [{ name: 'Club', ranks: '3' }] } })"
        state = f"crawler({{ skillUps: [{{ skill: 'Club', ranks: '11', floor: '1', how: 'Training', note: '' }}], gear: [{ring}] }})"
        club = self.val(f"allSkills({state}).find((x) => x.name === 'Club')")
        self.assertEqual(club["rank"], 15)
        self.assertIn("2 gear Ranks over the Rank 15 limit have no effect.", club["notes"])
        # A Race/Class that allows Rank 20 lets gear go higher (Sasquatch: Smush).
        smush = "gear('item', { name: 'Smush Gloves', location: 'gloves', bonuses: { skills: [{ name: 'Smush', ranks: '4' }] } })"
        state = f"crawler({{ combatType: 'hand', combat: 'Foot Soldier', race: 'Sasquatch', skillUps: [{{ skill: 'Smush', ranks: '2', floor: '2', how: 'Training', note: '' }}, {{ skill: 'Smush', ranks: '20', floor: '3', how: 'Training', note: '' }}], gear: [{smush}] }})"
        self.assertEqual(self.val(f"allSkills({state}).find((x) => x.name === 'Smush').rank"), 20)

    def test_check_bonuses_are_not_ranks_and_are_not_capped(self) -> None:
        lens = "gear('item', { name: 'Lucky Lens', location: 'head', bonuses: { skills: [{ name: 'Club', ranks: '4', type: 'check' }] } })"
        state = f"crawler({{ skillUps: [{{ skill: 'Club', ranks: '12', floor: '1', how: 'Training', note: '' }}], gear: [{lens}] }})"
        club = self.val(f"allSkills({state}).find((x) => x.name === 'Club')")
        self.assertEqual((club["rank"], club["checkBonus"]), (15, 4))
        self.assertIn("+4 to checks (Gear: Lucky Lens).", club["notes"])
        self.assertEqual(self.val(f"bonusText({lens})"), "+4 Club checks")
        # A check bonus doesn't grant a Skill the crawler lacks.
        picks = lens.replace("name: 'Club'", "name: 'Lockpicking'")
        self.assertNotIn("Lockpicking", [x["name"] for x in self.val(f"allSkills(crawler({{ gear: [{picks}] }}))")])

    def test_gear_dr_is_armor(self) -> None:
        vest = "gear('item', { name: 'Kevlar Vest', location: 'torso', bonuses: { dr: '2' } })"
        dr = self.val(f"damageResistance(crawler({{ race: 'Crocodilian', gear: [{vest}] }}))")
        self.assertEqual((dr["armor"], dr["total"]), (2, 5))  # +3 Race, +2 gear

    def test_inventory_rows_for_gear_gold_and_junk(self) -> None:
        state = "crawler({ gold: '250', miscJunk: '7', gear: [gear('scroll', { spell: 'Bang Bro', rank: '3' }), gear('potion', { name: 'Healing Potion', qty: '3', description: 'Heals a lot' })] })"
        rows = {x["name"]: x for x in self.val(f"carriedItems({state})") if x["location"] == "inventory"}
        self.assertIn("Scroll of Bang Bro (Rank 3)", rows)
        self.assertEqual((rows["Gold coins"]["qty"], rows["Misc. Junk"]["qty"]), (250, 7))
        self.assertEqual(rows["Healing Potion"]["notes"], "Heals a lot")
        bad = self.val("equipmentErrors(crawler({ gold: '-3', gear: [gear('scroll', { spell: 'Bang Bro' })] }))")
        self.assertTrue(any("Gold must be a whole number" in x for x in bad), bad)
        self.assertTrue(any("Spell and its Rank" in x for x in bad), bad)

    def test_gear_in_the_hotlist_and_collisions(self) -> None:
        state = "crawler({ healSlot: '1', gear: [gear('potion', { name: 'Healing Potion', qty: 5, location: 'hotlist:2' })] })"
        self.assertEqual(self.val(f"hotlist({state})[1]"), "Healing Potion x5")
        clash = "crawler({ healSlot: '1', gear: [gear('potion', { name: 'Healing Potion', location: 'hotlist:1' })] })"
        self.assertTrue(any("different Hotlist slot" in x for x in self.val(f"errors({clash})")))

    def test_starting_mana_potions_are_a_potion_item(self) -> None:
        spell = "crawler({ weaponLocation: '', combatType: 'spell', combat: 'Shock Treatment', spellSlot: '1', gear: [newManaPotions(%r)%s] })"
        placed = spell % ("hotlist:2", "")
        self.assertTrue(self.val(f"hotlist({placed})[1]").startswith("Standard Mana Potion x5\n"))
        self.assertTrue(self.val(f"stepCompletion({placed}).hotlist"))
        unplaced = spell % ("", "")
        self.assertIn("Place the five Standard Mana Potions together in one Hotlist slot.", self.val(f"errors({unplaced})"))
        self.assertFalse(self.val(f"stepCompletion({unplaced}).hotlist"))
        # Drunk to the last one, then gone: nothing left to place.
        self.assertEqual(self.val(f"hotlist(crawler({{ ...{placed}, gear: [{{ ...newManaPotions('hotlist:2'), qty: 1 }}] }}))[1]").split("\n")[0], "Standard Mana Potion")
        gone = "crawler({ weaponLocation: '', combatType: 'spell', combat: 'Shock Treatment', spellSlot: '1', gear: [] })"
        self.assertTrue(self.val(f"stepCompletion({gone}).hotlist"))

    def test_old_saves_get_mana_potions_from_their_hotlist_slot(self) -> None:
        old = "normalizeState({ ...crawler({ weaponLocation: '', combatType: 'spell', combat: 'Shock Treatment', spellSlot: '1' }), potionsSlot: '3' })"
        self.assertNotIn("potionsSlot", self.val(old))
        self.assertEqual(self.val(f"manaPotions({old})")["location"], "hotlist:3")
        self.assertEqual(self.val(f"manaPotions({old})")["qty"], 5)
        # New saves have no potionsSlot, so drunk potions stay gone.
        self.assertIsNone(self.val("manaPotions(normalizeState({ ...crawler({ combatType: 'spell', combat: 'Shock Treatment' }), gear: [] }))"))

    def test_removed_starting_items_still_count_for_creation(self) -> None:
        state = "crawler({ items: [{ id: 'w', name: 'Rubber duck', qty: 1, kind: 'weird', location: 'inventory' }], removedStarting: { useful: 1, weird: 0 } })"
        self.assertTrue(self.val(f"stepCompletion({state}).gear"))
        self.assertNotIn("Choose exactly one interesting or useful starting item.", self.val(f"errors({state})"))
        none = "crawler({ items: [{ id: 'w', name: 'Rubber duck', qty: 1, kind: 'weird', location: 'inventory' }] })"
        self.assertFalse(self.val(f"stepCompletion({none}).gear"))

    def test_saved_drafts_without_gear_still_load(self) -> None:
        state = self.val("normalizeState({ name: 'Old', gear: [{ name: 'Lamp' }] })")
        self.assertEqual(state["gear"][0]["bonuses"], {"stats": {}, "skills": [], "dr": "", "damage": []})
        self.assertEqual(state["gear"][0]["location"], "inventory")
        self.assertEqual(self.val("normalizeState({ name: 'Older' }).gear"), [])

    def test_attacks_follow_current_skills_and_weapon_items(self) -> None:
        state = """crawler({ skillUps: [{ skill: 'Club', ranks: '4', floor: '1' }, { skill: 'Magic Missile', ranks: '1', floor: '1' }],
          gear: [gear('weapon', { name: 'Enchanted Axe', weaponSkill: 'Axe', location: 'hotlist:3' }),
                 gear('weapon', { name: 'Big Club', weaponSkill: 'Club', location: 'inventory' })] })"""
        rows = self.val(f"allAttacks({state}).map((x) => [x.label, x.rank, x.dice, x.source === 'Gear' ? x.location : ''])")
        self.assertEqual(rows, [
            ["Unarmed Combat", 3, "1d4", ""],
            ["Club", 7, "1d6", ""],             # Club 3 + 4 from the Skill & Spell log
            ["Magic Missile", 1, "1d4", ""],    # learned later
            ["Enchanted Axe (Axe)", 0, "1d6", "hotlist:3"],  # Axe isn't known yet
            ["Big Club (Club)", 7, "1d6", "inventory"],
        ])
        # Weapons in Holding or the Hotlist are on the sheet unless unticked; others need ticking.
        self.assertEqual(self.val(f"attackRowsForSheet({state}).map((x) => x.label)"), ["Club", "Enchanted Axe (Axe)"])

    def test_ready_weapons_can_be_unticked_and_others_ticked(self) -> None:
        self.js.eval("""var w = crawler({ gear: [gear('weapon', { id: 'axe', name: 'Axe of Hot', weaponSkill: 'Axe', location: 'hotlist:2' }),
          gear('weapon', { id: 'bat', name: 'Bat', weaponSkill: 'Club', location: 'holding' }),
          gear('weapon', { id: 'bow', name: 'Spare Bow', weaponSkill: 'Bow', location: 'inventory' })] });""")
        self.assertEqual(self.val("attackRowsForSheet(w).map((x) => x.label)"), ["Club", "Axe of Hot (Axe)", "Bat (Club)"])
        self.js.eval("w.attackOff = ['gear:axe']; w.attackSheet = ['gear:bow'];")
        self.assertEqual(self.val("attackRowsForSheet(w).map((x) => x.label)"), ["Club", "Bat (Club)", "Spare Bow (Bow)"])
        # Saved crawlers without attackOff load with it empty.
        self.assertEqual(self.val("normalizeState({ name: 'Old' }).attackOff"), [])

    def test_damage_bonuses_flat_and_conditional(self) -> None:
        # A weapon's bonuses apply to its own attack; other equipped items' to every attack.
        state = """crawler({ gear: [
          gear('weapon', { name: 'Mercy Stick', weaponSkill: 'Club', location: 'holding',
            bonuses: { damage: [{ amount: '1', condition: 'hitting injured creatures' }, { amount: '2', condition: '' }] } }),
          gear('item', { name: 'Spiked Gloves', location: 'gloves', bonuses: { damage: [{ amount: '1' }] } }),
          gear('item', { name: 'Stowed Ring', location: 'inventory', bonuses: { damage: [{ amount: '5' }] } })] })"""
        rows = {x[0]: x[1:] for x in self.val(f"allAttacks({state}).map((x) => [x.label, x.damageBonus || 0, x.damageNotes || [], damageModText(x, derived({state}))])")}
        self.assertEqual(rows["Club"], [1, [], "+4"])  # Str 6 mod +3, gloves +1
        self.assertEqual(rows["Mercy Stick (Club)"], [3, ["+1 damage (hitting injured creatures)"], "+6"])
        self.assertIn("+1 damage (hitting injured creatures)", self.val(f"carriedItems({state}).find((x) => x.name === 'Mercy Stick').bonus"))
        self.assertIn("Damage bonuses on “Stick” need a whole-number amount.",
                      self.errors("gear('weapon', { name: 'Stick', weaponSkill: 'Club', bonuses: { damage: [{ amount: 'lots', condition: 'always' }] } })"))
        # Bonus fields are text, so "+1" is what's stored; it counts as 1.
        plus = "crawler({ gear: [gear('weapon', { name: 'Poky', weaponSkill: 'Dagger', location: 'holding', bonuses: { stats: { Str: '+2' }, dr: '+1', skills: [{ name: 'Dagger', ranks: '+1', type: 'check' }], damage: [{ amount: '+1', condition: '' }] } })] })"
        self.assertEqual(self.val(f"equipmentErrors({plus})"), [])
        self.assertEqual(self.val(f"allAttacks({plus}).find((x) => x.label === 'Poky (Dagger)').damageBonus"), 1)
        self.assertEqual(self.val(f"[enhancedStats({plus}).Str, gearDr({plus})]"), [8, 1])
        problems = "[{ amount: '', condition: 'x' }, { amount: '0', condition: 'x' }, { amount: 'lots', condition: '' }, { amount: '1', condition: 'x' }, { amount: '', condition: '' }]"
        self.assertEqual(self.val(f"{problems}.map(damageBonusProblem)"), ["missing", "missing", "amount", "", ""])
        # Typed "+N" is stored as "N"; anything else is left for the whole-number check.
        self.assertEqual(self.val("['+1', ' +12 ', '1', '-2', '+', '+x', '++1', ''].map(stripPlus)"), ["1", "12", "1", "-2", "+", "+x", "++1", ""])
        # A condition with a blank (or 0) amount does nothing, so it's flagged; an empty row isn't.
        for amount in ("", " ", "0"):
            self.assertEqual(self.errors(f"gear('weapon', {{ name: 'Poky', weaponSkill: 'Dagger', bonuses: {{ damage: [{{ amount: '{amount}', condition: 'hitting injured creatures' }}] }} }})"),
                             ["The damage bonus on “Poky” (hitting injured creatures) has no amount. Enter one, e.g. 1."])
        self.assertEqual(self.errors("gear('weapon', { name: 'Poky', weaponSkill: 'Dagger', bonuses: { damage: [{ amount: '', condition: ' ' }] } })"), [])
        # Saved items from before damage bonuses load with none.
        self.assertEqual(self.val("normalizeGearItem({ name: 'Old', bonuses: { stats: {} } }).bonuses.damage"), [])

    def quick(self, **fields) -> dict:
        quick = {"kind": "item", "location": "inventory", "name": "", "qty": "1", "spell": "", "rank": "", "weaponSkill": "", **fields}
        return self.val(f"quickGearItem({json.dumps(quick)})")

    def test_quick_add_custom_weapon_is_a_weapon(self) -> None:
        item = self.quick(kind="custom-weapon", name=" The Poky Little Dagger ", weaponSkill="Dagger", location="holding")["item"]
        self.assertEqual([item["kind"], item["name"], item["weaponSkill"], item["location"], item["qty"]],
                         ["weapon", "The Poky Little Dagger", "Dagger", "holding", 1])
        # Like Custom item, the name can wait for the editor; the weapon Skill can't.
        self.assertEqual(self.quick(kind="custom-weapon", weaponSkill="Dagger")["item"]["kind"], "weapon")
        self.assertEqual(self.quick(kind="custom-weapon", name="Dagger"), {"error": "Choose the weapon Skill it attacks with."})

    def test_quick_add_custom_item_and_plain_kinds(self) -> None:
        custom = self.quick(kind="custom", weaponSkill="Dagger")["item"]
        self.assertEqual([custom["kind"], custom["name"], custom["weaponSkill"]], ["item", "", ""])
        weapon = self.quick(kind="weapon", name="Axe", weaponSkill="Axe", qty="2.7")["item"]
        self.assertEqual([weapon["kind"], weapon["weaponSkill"], weapon["qty"]], ["weapon", "Axe", 2])
        self.assertEqual(self.quick(kind="weapon", name="Axe"), {"error": "Choose the weapon Skill it attacks with."})
        self.assertEqual(self.quick(kind="potion", name="  "), {"error": ""})  # nothing to add
        scroll = self.quick(kind="scroll", spell="Magic Missile", rank="3.9", name="ignored")["item"]
        self.assertEqual([scroll["kind"], scroll["spell"], scroll["rank"], scroll["name"]], ["scroll", "Magic Missile", "3", ""])
        self.assertEqual(self.quick(kind="spellbook", spell="Magic Missile"), {"error": "Choose the Spell and its Rank."})

    def test_custom_weapon_damage_bonus_is_its_own(self) -> None:
        # The bug report: a Custom weapon dagger's +1 vs injured goes on the dagger only.
        dagger = """Object.assign(quickGearItem({ kind: 'custom-weapon', name: 'The Poky Little Dagger', weaponSkill: 'Dagger', location: 'holding', qty: '1' }).item,
          { bonuses: { stats: {}, skills: [], dr: '', damage: [{ amount: '1', condition: 'hitting injured creatures' }] } })"""
        rows = {x[0]: x[1] for x in self.val(f"allAttacks(crawler({{ gear: [{dagger}] }})).map((x) => [x.label, x.damageNotes || []])")}
        self.assertEqual(rows["The Poky Little Dagger (Dagger)"], ["+1 damage (hitting injured creatures)"])
        self.assertEqual([notes for label, notes in rows.items() if label != "The Poky Little Dagger (Dagger)"], [[]] * (len(rows) - 1))
        # The same item made with Custom item boosts every attack instead.
        ring = dagger.replace("'custom-weapon'", "'custom'")
        notes = self.val(f"allAttacks(crawler({{ gear: [{ring}] }})).map((x) => x.damageNotes || [])")
        self.assertTrue(notes and all(x == ["+1 damage (hitting injured creatures) from The Poky Little Dagger"] for x in notes), notes)

    def test_attack_effects_have_no_hard_line_breaks(self) -> None:
        # Viewers and printers re-wrap the field; a hard break there would add a line.
        js = PDF_CRAWLER.replace("COUNT", "0").replace("s.gear = [", "s.gear = [ normalizeGearItem({ ...newGearItem('weapon'), name: 'Poky', weaponSkill: 'Dagger', location: 'holding', bonuses: { damage: [{ amount: '1', condition: 'hitting injured creature' }] } }),")
        self.assertEqual(export_fields(js)["Text Field 62"], "Range 5 ft; Piercing; +1 damage (hitting injured creature); AI Favor 1 (conditional)")

    def test_weapons_need_a_weapon_skill(self) -> None:
        self.assertIn("Choose the weapon Skill “Stick” attacks with.", self.errors("gear('weapon', { name: 'Stick' })"))
        self.assertEqual(self.errors("gear('weapon', { name: 'Stick', weaponSkill: 'Club' })"), [])

    def test_portraits_are_small_images_only(self) -> None:
        ok = "data:image/jpeg;base64,AAAA"
        self.assertEqual(self.val(f"normalizeState({{ portrait: '{ok}' }}).portrait"), ok)
        self.assertEqual(self.val("normalizeState({ portrait: 'javascript:alert(1)' }).portrait"), "")
        self.assertEqual(self.val("normalizeState({ portrait: 'data:image/svg+xml;base64,AAAA' }).portrait"), "")
        too_big = "'data:image/jpeg;base64,' + 'A'.repeat(PORTRAIT_MAX_CHARS)"
        self.assertEqual(self.val(f"normalizeState({{ portrait: {too_big} }}).portrait"), "")
        self.assertEqual(self.val("PORTRAIT_MAX_UPLOAD"), 2 * 1024 * 1024)
        self.assertEqual(self.val("initialState().portrait"), "")


PDF_CRAWLER = """(() => {
  const s = initialState();
  s.name = 'Geared'; s.kind = 'human';
  s.backgrounds = backgrounds.human.map((st) => ({ option: 0, picks: st.options[0].skills.slice(0, 2).map((x) => x.name) }));
  s.combatType = 'weapon'; s.combat = 'Club'; s.weaponLocation = 'holding';
  s.stats = { Str: '6', Int: '5', Con: '4', Dex: '3', Cha: '2' };
  s.clothing.Torso = 'Bathrobe';
  s.gold = '42';
  const g = (fields) => normalizeGearItem({ ...newGearItem('item'), ...fields });
  s.gear = [
    g({ name: 'Brain Bucket', location: 'head', bonuses: { stats: { Str: '2' }, dr: '1' } }),
    g({ name: 'Lucky Sock', location: 'accessories', description: 'Smells' }),
    ...Array.from({ length: COUNT }, (_, i) => g({ name: `Rock ${i + 1}` })),
  ];
  return s;
})()"""


@unittest.skipIf(MiniRacer is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class EquipmentPdfTests(unittest.TestCase):
    def test_gear_slots_armor_and_enhanced_on_the_sheet(self) -> None:
        fields = export_fields(PDF_CRAWLER.replace("COUNT", "3"))
        self.assertEqual(fields["Text Field 92"], "Brain Bucket (+2 Str, DR +1)")
        self.assertEqual(fields["Text Field 93"], "Bathrobe")
        self.assertEqual(fields["Text Field 95"], "Holding: Club")
        self.assertIn("Lucky Sock - Smells", fields["Text Field 91"])
        self.assertEqual(fields["Text Field 29"], "1")  # Armor
        self.assertEqual(fields["Text Field 31"], "1")  # DR total
        # Str: Enhanced 8, Unenhanced 6.
        self.assertEqual((fields["Text Field 21"], fields["Text Field 22"]), ("8", "6"))
        inventory = [fields.get(f"Text Field {223 + 3 * i}") for i in range(20)]
        self.assertIn("Gold coins", inventory)
        self.assertNotIn("Brain Bucket", inventory)  # equipped, not in the Inventory

    def test_more_than_twenty_inventory_rows_adds_an_inventory_page(self) -> None:
        reader = export_pdf(PDF_CRAWLER.replace("COUNT", "24"))  # 24 rocks + gold = 25 rows
        self.assertEqual(len(sheet_pages(reader)), 5)
        last = reader.pages[4].extract_text()
        self.assertIn("INVENTORY", last.upper())
        self.assertIn("Gold coins", last)
        self.assertIn("Rock 24", last)


if __name__ == "__main__":
    unittest.main(verbosity=2)
