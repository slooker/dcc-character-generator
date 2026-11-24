// Equipment rules (dcc-gear.pdf pp. 98-99).
//
// - Gear Slots: Head, Torso, Arms, Legs and Feet hold one item each. Hands
//   hold one pair of gloves plus one item per hand; a Shield uses a hand and a
//   "Limitation: Two-Handed" weapon uses both. Accessories hold up to 10
//   items, with at most one belt and one cape.
// - Only items in Gear Slots give bonuses; Inventory and Hotlist items don't.
// - Lifting limit: Strength score x 15 lb (Inventory items are weightless).
// - Gold coins take one Inventory slot; Misc. Junk is counted in points.
// - Scrolls are named "Scroll of <Spell> (Rank N)"; a spellbook grants its
//   Spell at its Rank when read, then disappears.
//
// The book has no item catalog, so items and their bonuses are player-entered.
// A weapon names the weapon Skill it attacks with (its Rank and dice).
// A Skill bonus is either Ranks (capped by the Skill's Rank limit, like any
// other Ranks) or a bonus to that Skill's checks (not Ranks, so not capped).
// A damage bonus, optionally only "when" something is true, applies to a
// weapon's own attacks, or to every attack while another item is equipped.
// This module only reads `state`; rules.js applies the bonuses.

export const STAT_KEYS = ['Str', 'Int', 'Con', 'Dex', 'Cha'];

export const GEAR_SLOTS = [
  { key: 'head', label: 'Head', max: 1 },
  { key: 'torso', label: 'Torso', max: 1 },
  { key: 'arms', label: 'Arms', max: 1 },
  { key: 'gloves', label: 'Hands (gloves)', max: 1 },
  { key: 'holding', label: 'Holding', max: 2, unit: 'hand' },
  { key: 'legs', label: 'Legs', max: 1 },
  { key: 'feet', label: 'Feet', max: 1 },
  { key: 'accessories', label: 'Accessories', max: 10 },
];
const SLOT_KEYS = new Set(GEAR_SLOTS.map((x) => x.key));
// Starting clothing (Starting Gear step) is worn in these slots.
export const CLOTHING_SLOTS = { Head: 'head', Torso: 'torso', Arms: 'arms', Hands: 'gloves', Legs: 'legs', Feet: 'feet' };

export const ITEM_KINDS = [
  ['item', 'Item'],
  ['weapon', 'Weapon'],
  ['potion', 'Potion'],
  ['scroll', 'Scroll'],
  ['spellbook', 'Spellbook'],
];
export const ACCESSORY_TYPES = [['', 'Other accessory'], ['belt', 'Belt'], ['cape', 'Cape']];
export const MAX_GEAR_ITEMS = 200;

export function isEquipped(location) {
  return SLOT_KEYS.has(location);
}

const int = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

export function newGearItem(kind = 'item') {
  return {
    id: `gear-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    name: '',
    qty: 1,
    location: 'inventory',
    description: '',
    twoHanded: false,
    accessoryType: '',
    spell: '',
    rank: '',
    weaponSkill: '',
    bonuses: { stats: {}, skills: [], dr: '', damage: [] },
  };
}

export function normalizeGearItem(raw) {
  const base = newGearItem(raw?.kind);
  const item = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!ITEM_KINDS.some(([kind]) => kind === item.kind)) item.kind = 'item';
  item.weaponSkill = String(item.weaponSkill || '');
  const bonuses = item.bonuses && typeof item.bonuses === 'object' ? item.bonuses : {};
  item.bonuses = {
    stats: bonuses.stats && typeof bonuses.stats === 'object' ? bonuses.stats : {},
    skills: Array.isArray(bonuses.skills)
      ? bonuses.skills.map((x) => ({ name: String(x?.name || ''), ranks: x?.ranks ?? '', type: x?.type === 'check' ? 'check' : 'rank' }))
      : [],
    dr: bonuses.dr ?? '',
    damage: Array.isArray(bonuses.damage)
      ? bonuses.damage.map((x) => ({ amount: x?.amount ?? '', condition: String(x?.condition || '') }))
      : [],
  };
  return item;
}

export function gearName(item) {
  const spell = String(item.spell || '').trim();
  const rank = int(item.rank);
  if (item.kind === 'scroll' && spell) return `Scroll of ${spell}${rank ? ` (Rank ${rank})` : ''}`;
  if (item.kind === 'spellbook' && spell) return `Spellbook of ${spell}${rank ? ` (Rank ${rank})` : ''}`;
  return String(item.name || '').trim();
}

// Items still carried (spent potions and read spellbooks are removed from state.gear).
export function gearItems(state) {
  return (state.gear || []).filter((item) => gearName(item));
}

export function equippedGear(state) {
  return gearItems(state).filter((item) => isEquipped(item.location));
}

export function statBonus(item) {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, int(item.bonuses?.stats?.[key]) || 0]));
}

export const SKILL_BONUS_TYPES = [['rank', 'Skill Ranks'], ['check', 'Bonus to checks']];

export function skillBonuses(item) {
  return (item.bonuses?.skills || [])
    .map((x) => ({ name: String(x.name || '').trim(), ranks: int(x.ranks) || 0, type: x.type === 'check' ? 'check' : 'rank' }))
    .filter((x) => x.name && x.ranks);
}

// [{ amount, condition }]; condition is '' for a bonus that always applies.
export function damageBonuses(item) {
  return (item.bonuses?.damage || [])
    .map((x) => ({ amount: int(x.amount) || 0, condition: String(x.condition || '').trim() }))
    .filter((x) => x.amount);
}

// What's wrong with a typed damage bonus: 'amount' (not a whole number),
// 'missing' (a condition but no amount; the amount's placeholder looks like a
// value, so a blank one is easy to miss) or ''.
export function damageBonusProblem(x) {
  const amount = String(x.amount ?? '').trim();
  if (amount && int(amount) === null) return 'amount';
  return String(x.condition || '').trim() && !int(amount) ? 'missing' : '';
}

export function damageBonusText(x) {
  return `${x.amount > 0 ? '+' : ''}${x.amount} damage${x.condition ? ` (${x.condition})` : ''}`;
}

// "+3" -> "3" for a typed bonus amount; anything else is left (trimmed) for
// equipmentErrors() to check.
export function stripPlus(value) {
  return String(value ?? '').trim().replace(/^\+(?=\d+$)/, '');
}

// The gear Add bar's custom kinds open the full editor; each makes an
// ordinary item of the ITEM_KINDS kind it maps to.
export const CUSTOM_KINDS = { custom: 'item', 'custom-weapon': 'weapon' };

// The new item for the gear Add bar's { kind, location, name, qty, spell, rank,
// weaponSkill }: { item } or { error } ('' when there's simply nothing to add).
export function quickGearItem(quick) {
  const kind = quick.kind;
  const spellItem = kind === 'scroll' || kind === 'spellbook';
  const custom = kind in CUSTOM_KINDS;
  const weapon = kind === 'weapon' || kind === 'custom-weapon';
  const name = String(quick.name || '').trim();
  if (spellItem && !(quick.spell && Number(quick.rank) >= 1)) return { error: 'Choose the Spell and its Rank.' };
  if (!spellItem && !custom && !name) return { error: '' };
  if (weapon && !quick.weaponSkill) return { error: 'Choose the weapon Skill it attacks with.' };
  return {
    item: normalizeGearItem({
      ...newGearItem(CUSTOM_KINDS[kind] || kind),
      qty: Math.max(1, Math.trunc(Number(quick.qty) || 1)),
      location: quick.location,
      ...(spellItem ? { spell: quick.spell, rank: String(Math.trunc(Number(quick.rank))) } : { name }),
      ...(weapon ? { weaponSkill: quick.weaponSkill } : {}),
    }),
  };
}

export function drBonus(item) {
  return int(item.bonuses?.dr) || 0;
}

// Sum of equipped Stat bonuses, e.g. { Str: 2, Int: 0, ... }.
export function gearStatBonuses(state) {
  const total = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
  equippedGear(state).forEach((item) => Object.entries(statBonus(item)).forEach(([key, n]) => { total[key] += n; }));
  return total;
}

// [{ name, ranks, type, item }] for every equipped Skill bonus.
export function gearSkillBonuses(state) {
  return equippedGear(state).flatMap((item) => skillBonuses(item).map((x) => ({ ...x, item: gearName(item) })));
}

export function gearDr(state) {
  return equippedGear(state).reduce((sum, item) => sum + drBonus(item), 0);
}

// Short "+2 Str, +1 Dodge, DR +1" text for the sheet and the UI.
export function bonusText(item) {
  const parts = [];
  Object.entries(statBonus(item)).forEach(([key, n]) => { if (n) parts.push(`${n > 0 ? '+' : ''}${n} ${key}`); });
  skillBonuses(item).forEach((x) => parts.push(`${x.ranks > 0 ? '+' : ''}${x.ranks} ${x.name}${x.type === 'check' ? ' checks' : ''}`));
  const dr = drBonus(item);
  if (dr) parts.push(`DR ${dr > 0 ? '+' : ''}${dr}`);
  damageBonuses(item).forEach((x) => parts.push(damageBonusText(x)));
  return parts.join(', ');
}

function startingWeaponName(state) {
  if (state.combatType !== 'weapon' || !state.combat) return '';
  const custom = String(state.customWeapon || '').trim();
  return custom ? `${custom} (${state.combat})` : state.combat;
}

// What occupies each Gear Slot: starting clothing, starting possessions and gear.
// Each entry: { label, from: 'clothing' | 'starting' | 'gear', hands?, accessoryType?, id? }.
export function slotUsage(state) {
  const usage = Object.fromEntries(GEAR_SLOTS.map((slot) => [slot.key, []]));
  Object.entries(CLOTHING_SLOTS).forEach(([field, slot]) => {
    const text = String(state.clothing?.[field] || '').trim();
    if (text) usage[slot].push({ label: text, from: 'clothing', field });
  });
  const weapon = startingWeaponName(state);
  if (weapon && state.weaponLocation === 'holding') {
    usage.holding.push({ label: weapon, from: 'starting', id: 'starting-weapon', hands: state.weaponTwoHanded ? 2 : 1 });
  }
  (state.items || []).forEach((item) => {
    if (!String(item.name || '').trim() || !usage[item.location]) return;
    usage[item.location].push({ label: item.name.trim(), from: 'starting', id: item.id, hands: 1 });
  });
  gearItems(state).forEach((item) => {
    if (!usage[item.location]) return;
    usage[item.location].push({
      label: gearName(item),
      from: 'gear',
      id: item.id,
      hands: item.twoHanded ? 2 : 1,
      accessoryType: item.accessoryType || '',
    });
  });
  return usage;
}

export function slotCount(slot, entries) {
  return slot.unit === 'hand' ? entries.reduce((sum, x) => sum + (x.hands || 1), 0) : entries.length;
}

export function equipmentErrors(state) {
  const out = [];
  const usage = slotUsage(state);
  GEAR_SLOTS.forEach((slot) => {
    const entries = usage[slot.key];
    const used = slotCount(slot, entries);
    if (used <= slot.max) return;
    const names = entries.map((x) => x.label).join(', ');
    if (slot.unit === 'hand') out.push(`Holding uses ${used} hands (${names}); you have 2. A Two-Handed weapon uses both.`);
    else if (slot.max === 1) out.push(`${slot.label} can hold one item, but has ${used}: ${names}. Move the extras to the Inventory.`);
    else out.push(`${slot.label} can hold at most ${slot.max} items (has ${used}).`);
  });
  ['belt', 'cape'].forEach((type) => {
    const count = usage.accessories.filter((x) => x.accessoryType === type).length;
    if (count > 1) out.push(`Only one ${type} can be worn at a time (Accessories has ${count}).`);
  });
  const gear = state.gear || [];
  if (gear.length > MAX_GEAR_ITEMS) out.push(`Keep the item list to ${MAX_GEAR_ITEMS} entries.`);
  gear.forEach((item, index) => {
    const name = gearName(item) || `Item ${index + 1}`;
    if ((item.kind === 'scroll' || item.kind === 'spellbook') && (!String(item.spell || '').trim() || !(int(item.rank) >= 1))) {
      out.push(`Choose the Spell and its Rank for ${item.kind === 'scroll' ? 'the scroll' : 'the spellbook'} (${name}).`);
    } else if (!gearName(item)) {
      out.push(`Name item ${index + 1} or remove it.`);
    } else if (item.kind === 'weapon' && !String(item.weaponSkill || '').trim()) {
      out.push(`Choose the weapon Skill “${name}” attacks with.`);
    }
    const qty = int(item.qty);
    if (qty === null || qty < 1) out.push(`Give “${name}” a whole-number quantity of at least 1.`);
    if (String(item.location || '').startsWith('hotlist:') && qty > 999) out.push(`A Hotlist slot can hold at most 999 of “${name}”.`);
    const stats = item.bonuses?.stats || {};
    if (STAT_KEYS.some((key) => stats[key] !== '' && stats[key] != null && int(stats[key]) === null)) out.push(`Stat bonuses on “${name}” must be whole numbers.`);
    if ((item.bonuses?.skills || []).some((x) => String(x.name || '').trim() && int(x.ranks) === null)) out.push(`Skill bonuses on “${name}” need a whole number of Ranks.`);
    if (item.bonuses?.dr !== '' && item.bonuses?.dr != null && int(item.bonuses.dr) === null) out.push(`The DR bonus on “${name}” must be a whole number.`);
    (item.bonuses?.damage || []).forEach((x) => {
      const problem = damageBonusProblem(x);
      if (problem === 'amount') out.push(`Damage bonuses on “${name}” need a whole-number amount.`);
      else if (problem === 'missing') out.push(`The damage bonus on “${name}” (${String(x.condition).trim()}) has no amount. Enter one, e.g. 1.`);
    });
  });
  for (const [key, label] of [['gold', 'Gold'], ['miscJunk', 'Misc. Junk']]) {
    const value = state[key];
    if (value !== '' && value != null && !(int(value) >= 0)) out.push(`${label} must be a whole number of 0 or more.`);
  }
  return out;
}
