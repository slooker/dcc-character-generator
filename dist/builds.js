// Custom Races and Classes: the Race & Class Point Build System
// (dcc-classes.pdf pp. 158-162).
//
// - 25 Race Build Points and 30 Class Build Points, separate pools; leftover
//   points are lost.
// - Benefits are bought from a menu of Minor (1), Moderate (2), Major (3),
//   Extreme (4) and Epic (6) benefits, and a benefit can be taken more than
//   once where that does anything (Stat and Skill bonuses, DR...). Players may
//   invent benefits with the GM, so a custom benefit picks its own tier.
// - A Class build can't have more than 5 points of Passive Skills (p. 159;
//   the worked example counts these as Ranks).
// - DR Buffs are limited to +3 (p. 159).
// - Detriments add at most 5 Build Points (p. 161): 1 per 2 points of Stat
//   penalties, 1 per 2 points of Skill penalties, 1 per -1 to all Skills
//   under a Stat, plus Minor (1), Moderate (2) and Major (3) detriments. A
//   Skill penalty needs the Skill at that Rank or higher, which is checked
//   when a crawler takes the Race/Class.
// - Earth Races and Classes get a Silver Earth Box with a guaranteed Earth
//   Hobby Potion; Earth Classes need an Earth Race (pp. 158, 162).
//
// A build is plain data ({ kind, name, benefits, detriments, ... }).
// buildEntry() turns it into the same shape as a book Race/Class in
// races-classes.js, so rules.js applies it like any other.
import { races, classes, skillCatalog } from './races-classes.js';

export const BUILD_POINTS = { race: 25, class: 30 };
export const MAX_DETRIMENT_POINTS = 5;
export const PASSIVE_RANK_LIMIT = 5;
export const DR_LIMIT = 3;
export const MAX_ROWS = 40;
export const NAME_MIN = 2;
export const NAME_MAX = 40;
export const TEXT_MAX = 300;
export const DESCRIPTION_MAX = 1000;

export const STATS = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
export const STAT_NAMES = { Str: 'Strength', Int: 'Intelligence', Con: 'Constitution', Dex: 'Dexterity', Cha: 'Charisma' };
export const CLUBS = ['Desperado Club', 'Club Vanquisher'];
export const CLASS_TYPES = [...new Set(classes.flatMap((x) => x.classTypes || []))].sort();

export const TIERS = [
  ['minor', 'Minor', 1],
  ['moderate', 'Moderate', 2],
  ['major', 'Major', 3],
  ['extreme', 'Extreme', 4],
  ['epic', 'Epic', 6],
];
const TIER_COST = Object.fromEntries(TIERS.map(([id, , cost]) => [id, cost]));
const DETRIMENT_TIERS = TIERS.slice(0, 3);

const buildCatalog = new Map(skillCatalog.map((x) => [x.name.toLowerCase(), x]));
export const bookSkill = (name) => buildCatalog.get(String(name || '').trim().toLowerCase()) || null;
// Passive Skills, Spells and Racial Skills are not thematically linked (p. 159).
export const groupable = (skill) => Boolean(skill) && !(skill.passive || skill.kind === 'spell' || /RACIAL/i.test(skill.section));
const canonical = (name) => bookSkill(name)?.name || String(name || '').trim();
const skillWord = (name) => (bookSkill(name)?.kind === 'spell' ? 'Spell' : 'Skill');
const joinNames = (names) => (names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const signed = (n) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
// The Stats a `stats` row raises or lowers.
export function statSpread(row) {
  return Object.fromEntries(STATS.map((s) => [s, toInt(row.stats?.[s])]).filter(([, n]) => n > 0));
}
const statTotal = (row) => Object.values(statSpread(row)).reduce((sum, n) => sum + n, 0);
const rowStatText = (row, sign) => Object.entries(statSpread(row)).map(([s, n]) => `${signed(sign * n)} ${STAT_NAMES[s]}`).join(', ');
// How many times a `per` or pooled row counts.
const rowAmount = (row, option) => (option?.fields?.includes('stats') ? statTotal(row) : Math.max(0, toInt(row.amount)));
const withDetail = (text, row) => (String(row.detail || '').trim() ? `${text}: ${String(row.detail).trim()}` : text);

// Fields a row can use: stat, stats, amount, skill, skills, detail, club, tier,
// text. `per` options cost their tier once per `amount`; for `stats` rows
// (several Stats in one row, { Str: 2, Dex: 1 }) that's the total. Text-only options keep the
// book's wording; their effects are situational and go in the sheet's notes.
function described(tier, id, label, extra = {}) {
  return { id, tier, label, fields: ['detail'], text: (row) => withDetail(label, row), ...extra };
}

export const BENEFITS = [
  { id: 'stat', tier: 'minor', label: '+1 to a Stat', per: true, fields: ['stats'],
    text: (row) => rowStatText(row, 1),
    effects: (row) => [{ type: 'stat', stats: statSpread(row) }] },
  { id: 'rank20', tier: 'minor', label: 'Allow a specific Skill to be raised to Rank 20', fields: ['skill'],
    text: (row) => `${canonical(row.skill)} ${skillWord(row.skill)} can be raised to Rank 20`,
    effects: (row) => [{ type: 'rankLimit', max: 20, skills: [canonical(row.skill)] }] },
  described('minor', 'club', 'Membership in Club Desperado or Club Vanquisher'),
  described('minor', 'advancementSkill', 'At the end of each floor, add 1 to your Skill Advancement Checks for a particular Skill'),
  described('minor', 'modTwiceSkill', 'Add your Stat Mod a second time when using a specific non-combat Skill in a common circumstance'),
  described('minor', 'conditional', 'A benefit that has a condition, such as gaining Advantage when attacking stone creatures'),
  described('minor', 'darkvision', 'Can see in total darkness or has a natural ability to produce light'),
  described('minor', 'manaEnvironment', 'Double Mana regeneration from mending and resting in a specific environment'),
  described('minor', 'farSight', 'You can see twice as far as most creatures'),
  described('minor', 'craftingTable', 'A tier-1 crafting table (as soon as you acquire a personal space, it shows up there)'),
  described('minor', 'saferoom', 'A free room in saferooms'),
  described('minor', 'discount', 'Discount at stores, bonus earned from sales or interest earned'),
  described('minor', 'sessionBenefit', 'Gain a non-combat benefit once per session under very specific conditions'),

  { id: 'skill', tier: 'moderate', label: '+1 in a Skill or Spell', per: true, fields: ['skill', 'amount'],
    text: (row) => `${signed(row.amount)} ${canonical(row.skill)} ${skillWord(row.skill)}`,
    effects: (row) => [{ type: 'skill', bonus: row.amount, skills: [canonical(row.skill)] }] },
  { id: 'skillChoice', tier: 'moderate', label: '+1 in a Skill or Spell of your choice from a list', per: true, fields: ['skills', 'amount'],
    text: (row) => `${signed(row.amount)} to a Skill of your choice (${joinNames(row.skills.map(canonical))})`,
    effects: (row) => [{ type: 'skillPick', bonus: row.amount, count: 1, options: row.skills.map(canonical) }] },
  { id: 'dr', tier: 'moderate', label: '+1 DR Buff (to a limit of +3)', per: true, fields: ['amount'],
    text: (row) => `${signed(row.amount)} DR`,
    effects: (row) => [{ type: 'dr', value: row.amount, buff: false }] },
  { id: 'rank20Group', tier: 'moderate', label: 'Can raise a thematically linked group of Skills to Rank 20', fields: ['detail', 'skills'], group: true,
    text: (row) => `${groupName(row)} Skills (${joinNames(row.skills.map(canonical))}) can be raised to Rank 20`,
    effects: (row) => [{ type: 'rankLimit', max: 20, skills: row.skills.map(canonical) }] },
  described('moderate', 'healOnHit', 'Heal 1 Health Bar slot when you damage or kill a creature with a specific Weapon Skill or Spell, up to 5 Health Bar per combat scene'),
  described('moderate', 'modTwiceAttack', 'Add your Stat Mod a second time when making an attack in a common circumstance'),
  described('moderate', 'advantageAdvancement', 'Roll with Advantage when making Skill Advancement Checks for a particular Skill'),
  described('moderate', 'advancementGroup', 'At the end of each floor, add 1 to your Skill Advancement Checks for a particular group of thematically linked Skills'),
  described('moderate', 'damageType', 'At the start of combat, you can change your damage to a different type for that combat'),
  described('moderate', 'guild', 'Can access any guild of a particular type'),
  described('moderate', 'manaAnywhere', 'Double Mana regeneration from mending and resting without a limit'),
  described('moderate', 'allClubs', 'Membership in all professional and social clubs'),
  described('moderate', 'bookClub', 'Membership in the Dungeon Book of the Floor Club'),
  described('moderate', 'gold', 'Mobs drop 1 × Floor Number gold when you kill them with a specific attack'),
  described('moderate', 'popularity', 'Ability to gain Popularity with specific actions and attacks'),
  described('moderate', 'patron', 'Patron Benefit'),
  described('moderate', 'resistUncommon', 'Resistance to an uncommon damage type (Force, Psychic, Necrotic, etc.)'),
  described('moderate', 'resistEnvironment', 'Resistance to damage dealt by the environment (Falling, Drowning, dungeon traps, etc.)'),
  described('moderate', 'replaceStat', 'Replace a Stat used in an ability with another Stat'),
  described('moderate', 'extraMod', 'A Stat Mod from another ability can be used in addition to the normal Mod for specific Skills'),
  described('moderate', 'crossWeapon', 'Can use Skills designed for one type of weapon on another type of weapon'),
  described('moderate', 'healingBonus', 'When you use a Healing-type Spell, the target heals 1 additional Health Bar'),
  described('moderate', 'terrain', 'Traverse certain terrain types without Skill Checks'),
  described('moderate', 'burrow', 'The ability to burrow'),
  described('moderate', 'waterBreathing', 'The ability to breathe underwater'),
  described('moderate', 'tempSkills', '+1 in all Skills for a temporary duration that’s an hour or less'),
  described('moderate', 'naturalD6', 'A natural attack at Rank = Floor Number that deals 1d6 + Stat Mod damage (another d6 at Rank 5, 10 and 15)'),
  described('moderate', 'reassignStats', 'Reassign this Race or Class’s Stat point benefits once per floor during a Long Rest'),

  { id: 'move', tier: 'major', label: '+5ft Move', per: true, fields: ['amount'],
    text: (row) => `+${5 * row.amount} ft Move`,
    effects: (row) => [{ type: 'move', value: 5 * row.amount }] },
  { id: 'step', tier: 'major', label: '+5 Step', per: true, fields: ['amount'],
    text: (row) => `+${5 * row.amount} Step`,
    effects: (row) => [{ type: 'step', value: 5 * row.amount }] },
  { id: 'small', tier: 'major', label: 'Size 2 (Small) or less', kinds: ['race'], fields: [],
    text: () => 'Size: Small (2)',
    effects: () => [{ type: 'size', value: 'Small (2)' }] },
  described('major', 'assistance', 'Access to significant assistance, akin to the Manager benefit'),
  described('major', 'pet', 'Gain a friendly Pet or a Mount'),
  described('major', 'petBuff', 'Provide a significant Buff or Benefit up to 4 Points to all of your Pets or Mounts'),
  described('major', 'alterEncounter', 'Dramatically alter an encounter once a day, such as by making enemies attack each other'),
  described('major', 'dailyDefense', 'A defensive ability usable once per day, such as negating all damage you take from a single attack'),
  described('major', 'partyBuff', 'Buff the entire party once per day, such as granting them regeneration or extra DR'),
  described('major', 'flyLimited', 'The ability to fly, with some limitations'),
  described('major', 'noBreathing', 'Survive without breathing, with Immunity to inhaled toxins'),
  described('major', 'rage', 'Rage (Benefit): Your melee attacks deal +1 damage for each Health Bar slot you have lost', { fields: [] }),
  described('major', 'd4Checks', 'Add 1d4 to your Evade or Stat Checks for a specific Stat'),
  described('major', 'naturalD8', 'A natural attack at Rank = Floor Number that deals 1d8 + Stat Mod damage (another d8 at Rank 5, 10 and 15)'),
  described('major', 'advantageSkill', 'Advantage when using a specific non-combat Skill or Spell'),
  described('major', 'doubleDamage', 'Situational bonus of up to ×2 damage for one round'),
  described('major', 'swapCon', 'Swap Con for determining Health Bar values with another Stat'),
  described('major', 'climb', 'A Climb Movement: automatically climb most surfaces, even ceilings', { fields: [] }),

  { id: 'unlearnable', tier: 'extreme', label: '+1 in a Skill that you wouldn’t normally be able to learn', per: true, fields: ['skill', 'amount'],
    text: (row) => `${signed(row.amount)} ${canonical(row.skill)} Skill`,
    effects: (row) => [{ type: 'skill', bonus: row.amount, skills: [canonical(row.skill)] }] },
  { id: 'groupSmall', tier: 'extreme', label: '+1 to all Skills in a thematically linked group of 3–5 Skills', per: true, fields: ['detail', 'skills', 'amount'], group: [3, 5],
    text: (row) => `${signed(row.amount)} to all ${groupName(row)} Skills (${joinNames(row.skills.map(canonical))})`,
    effects: (row) => [{ type: 'skillGroup', bonus: row.amount, skills: row.skills.map(canonical) }] },
  { id: 'rank20Group6', tier: 'extreme', label: 'All Skills in a thematically linked group of up to 6 Skills can be raised to Rank 20', fields: ['detail', 'skills'], group: [1, 6],
    text: (row) => `${groupName(row)} Skills (${joinNames(row.skills.map(canonical))}) can be raised to Rank 20`,
    effects: (row) => [{ type: 'rankLimit', max: 20, skills: row.skills.map(canonical) }] },
  described('extreme', 'advantageStat', 'Advantage on all Stat Checks for a specific Stat'),
  described('extreme', 'poisonImmunity', 'Immunity to Poison', { fields: [] }),
  described('extreme', 'resistCommon', 'Resistance to a common damage type (Bludgeoning, Fire)'),
  described('extreme', 'spellDuration', 'Double the duration of your Rank 5 and lower Spells that have a duration', { fields: [] }),
  described('extreme', 'advantageSituation', 'Advantage on all Skills in a limited non-combat situation'),
  described('extreme', 'arm', 'Additional functional arm', { fields: [] }),
  described('extreme', 'doppelganger', 'Doppelgänger shape-changing', { fields: [] }),

  { id: 'groupLarge', tier: 'epic', label: '+1 to all Skills in a thematically linked group of 6+ Skills', per: true, fields: ['detail', 'skills', 'amount'], group: [6, Infinity],
    text: (row) => `${signed(row.amount)} to all ${groupName(row)} Skills (${joinNames(row.skills.map(canonical))})`,
    effects: (row) => [{ type: 'skillGroup', bonus: row.amount, skills: row.skills.map(canonical) }] },
  { id: 'rank20All', tier: 'epic', label: 'All Skills can be raised to Rank 20', fields: [],
    text: () => 'All Skills can be raised to Rank 20',
    effects: () => [{ type: 'rankLimit', max: 20, all: true, skills: [] }] },
  described('epic', 'majorDefense', 'A significant defensive ability, such as Immunity to a common damage type or Advantage on Evade Checks'),
  described('epic', 'limbRegeneration', 'The Limb Regeneration Benefit', { fields: [] }),
  described('epic', 'advantageWide', 'Roll with Advantage on all Skills in a wide-ranging set of circumstances'),
  described('epic', 'diseaseImmunity', 'Immunity to Poison and all diseases', { fields: [] }),
  described('epic', 'flexible', 'A powerful and flexible ability that can significantly change your Stats or Skills'),
  described('epic', 'changeling', 'Changeling shapeshifting', { fields: [] }),
  described('epic', 'advantageStatSkills', 'Roll with Advantage on all Skill Checks for a specific Stat'),
  described('epic', 'fly', 'The ability to fly with no limitations', { fields: [] }),

  { id: 'custom', tier: null, label: 'Your own benefit (agree its tier with your GM)', fields: ['tier', 'text'],
    text: (row) => String(row.text || '').trim() },
];

export const DETRIMENTS = [
  { id: 'statPenalty', pool: 'stat', label: 'Stat penalty (1 Build Point for every −2)', fields: ['stats'],
    text: (row) => rowStatText(row, -1),
    effects: (row) => [{ type: 'stat', stats: Object.fromEntries(Object.entries(statSpread(row)).map(([s, n]) => [s, -n])) }] },
  { id: 'skillPenalty', pool: 'skill', label: 'Skill penalty (1 Build Point for every −2)', fields: ['skill', 'amount'],
    text: (row) => `−${row.amount} ${canonical(row.skill)} ${skillWord(row.skill)}`,
    effects: (row) => [{ type: 'skill', bonus: -row.amount, skills: [canonical(row.skill)] }],
    requires: (row) => [{ type: 'skillRank', skills: [canonical(row.skill)], min: row.amount }] },
  { id: 'statSkillsPenalty', tier: 'minor', per: true, label: 'Penalty to all Skills under a specific Stat (1 Build Point for every −1)', fields: ['stat', 'amount'],
    // Only Skills the crawler has change, and none drops below Rank 1 (as
    // with the book's own "all Strength Skills" penalty).
    text: (row) => `−${row.amount} to all ${STAT_NAMES[row.stat]}-based Skills (to a minimum of Rank 1)`,
    effects: (row) => [{ type: 'skillGroup', bonus: -row.amount, min: 1, skills: skillCatalog.filter((x) => x.kind === 'skill' && x.stat === row.stat).map((x) => x.name) }] },
  { id: 'noClub', tier: 'minor', kinds: ['class'], label: 'Cannot choose this Class due to membership in a specific club', fields: ['club'],
    text: (row) => `Cannot choose this Class if you have access to the ${row.club}`,
    requires: (row) => [{ type: 'noClub', club: row.club }] },
  { id: 'mustWorship', tier: 'minor', label: 'Must worship a deity', fields: [],
    text: () => 'Must worship a deity',
    requires: () => [{ type: 'worshipAllowed' }] },
  { id: 'cannotWorship', tier: 'minor', label: 'Cannot worship a deity', fields: [], text: () => 'Cannot worship a deity' },
  described('minor', 'manaUnfavored', '+1 Mana cost to cast spells not favored by your Class'),
  described('minor', 'conditionalDisadvantage', 'Disadvantage when using a thematically linked group of Skills, when there is a condition'),
  described('minor', 'advancementPenalty', '−1 penalty to Skill Advancement Checks for a specific Skill provided by your Race or Class at Rank 5+'),
  described('minor', 'vulnerableUncommon', 'Vulnerability: An uncommon damage type deals double damage to you'),
  described('minor', 'halveEffects', 'You halve the effects of a broad type of damage that isn’t the focus of your Class'),
  described('minor', 'twoConditionWeakness', 'A weakness that has two conditions'),
  described('minor', 'delay', 'A bonus is delayed to after Level 50 or activates on the 6th Floor'),
  described('moderate', 'broadWeakness', 'A weakness with a single broad condition, such as Disadvantage in all social situations'),
  described('moderate', 'descentOnly', 'A Skill only increases in Rank upon descent to the next floor'),
  described('moderate', 'limitedWeapons', 'Limited choice of weapons available to choose from'),
  described('moderate', 'noWeaponMod', 'No Stat Mod added to Weapon Skills provided by your Race or Class'),
  described('moderate', 'manaClass', '+3 Mana cost to a Class of spells provided by your Race or Class'),
  described('moderate', 'groupDisadvantage', 'Disadvantage when using a thematically linked group of Skills, such as all movement-related Skills'),
  described('moderate', 'prohibitedItems', 'Prohibited from using a wide category of useful items'),
  { id: 'statCap', tier: 'major', label: 'A specific Stat is capped at 10', fields: ['stat'],
    text: (row) => `${STAT_NAMES[row.stat]} is capped at 10. Even magic gear and potions cannot exceed this limit`,
    effects: (row) => [{ type: 'statCap', stat: row.stat, max: 10, strict: true }] },
  described('major', 'vulnerableCommon', 'Vulnerability: A common damage type (such as Bludgeoning or Piercing) deals double damage to you'),
  { id: 'custom', tier: null, label: 'Your own detriment (agree its tier with your GM)', fields: ['tier', 'text'],
    text: (row) => String(row.text || '').trim() },
];

const benefitById = new Map(BENEFITS.map((x) => [x.id, x]));
const detrimentById = new Map(DETRIMENTS.map((x) => [x.id, x]));
export const benefitOption = (id) => benefitById.get(id) || null;
export const detrimentOption = (id) => detrimentById.get(id) || null;

export function optionsFor(kind, detriments = false) {
  return (detriments ? DETRIMENTS : BENEFITS).filter((x) => !x.kinds || x.kinds.includes(kind));
}

export function tiersFor(detriments = false) {
  return detriments ? DETRIMENT_TIERS : TIERS;
}

function groupName(row) {
  return String(row.detail || '').trim() || 'these';
}

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

export function newRow(option = 'stat') {
  return { option, stat: 'Str', stats: {}, amount: 1, skill: '', skills: [], detail: '', club: CLUBS[0], tier: 'minor', text: '' };
}

export function newBuild(kind = 'race') {
  return { v: 1, kind: kind === 'class' ? 'class' : 'race', name: '', description: '', earth: kind !== 'class', classTypes: [], benefits: [], detriments: [] };
}

const clip = (value, max) => String(value ?? '').slice(0, max);

function normalizeRow(raw) {
  const row = { ...newRow(), ...(raw && typeof raw === 'object' ? raw : {}) };
  // Rows saved before a row could hold several Stats have one stat and an amount.
  const legacy = !(raw?.stats && typeof raw.stats === 'object') && ['stat', 'statPenalty'].includes(row.option);
  // Too many points stay, for buildErrors to report.
  const stats = legacy && STATS.includes(row.stat) ? { [row.stat]: Math.max(1, toInt(row.amount, 1)) }
    : Object.fromEntries(STATS.map((s) => [s, Math.min(99, toInt(row.stats?.[s]))]).filter(([, n]) => n > 0));
  return {
    option: String(row.option),
    stat: STATS.includes(row.stat) ? row.stat : 'Str',
    stats,
    amount: toInt(row.amount, 1),
    skill: clip(row.skill, 80),
    skills: (Array.isArray(row.skills) ? row.skills : []).map((x) => clip(x, 80).trim()).filter(Boolean).slice(0, 40),
    detail: clip(row.detail, TEXT_MAX),
    club: CLUBS.includes(row.club) ? row.club : CLUBS[0],
    tier: TIERS.some(([id]) => id === row.tier) ? row.tier : 'minor',
    text: clip(row.text, TEXT_MAX),
  };
}

export function normalizeBuild(raw) {
  const base = newBuild(raw?.kind);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    name: clip(raw.name, NAME_MAX * 2),
    description: clip(raw.description, DESCRIPTION_MAX),
    earth: Boolean(raw.earth),
    classTypes: base.kind === 'class' && Array.isArray(raw.classTypes) ? raw.classTypes.filter((x) => CLASS_TYPES.includes(x)) : [],
    benefits: (Array.isArray(raw.benefits) ? raw.benefits : []).slice(0, MAX_ROWS).map(normalizeRow),
    detriments: (Array.isArray(raw.detriments) ? raw.detriments : []).slice(0, MAX_ROWS).map(normalizeRow),
  };
}

// Cost of one benefit row (or the fixed points of one detriment row).
export function rowCost(row, detriment = false) {
  const option = (detriment ? detrimentOption : benefitOption)(row.option);
  if (!option || option.pool) return 0;
  const cost = option.tier ? TIER_COST[option.tier] : TIER_COST[row.tier] || 0;
  return option.per ? cost * rowAmount(row, option) : cost;
}

// Points earned from detriments: 1 per 2 points of Stat penalties, 1 per 2 of
// Skill penalties, plus the rest, to a maximum of 5.
export function detrimentPoints(build) {
  const pooled = { stat: 0, skill: 0 };
  let fixed = 0;
  build.detriments.forEach((row) => {
    const option = detrimentOption(row.option);
    if (option?.pool) pooled[option.pool] += rowAmount(row, option);
    else fixed += rowCost(row, true);
  });
  const raw = Math.floor(pooled.stat / 2) + Math.floor(pooled.skill / 2) + fixed;
  return { raw, earned: Math.min(MAX_DETRIMENT_POINTS, raw) };
}

export function buildPoints(build) {
  const base = BUILD_POINTS[build.kind] ?? 0;
  const { raw, earned } = detrimentPoints(build);
  const spent = build.benefits.reduce((sum, row) => sum + rowCost(row), 0);
  return { base, earned, rawDetriments: raw, budget: base + earned, spent, left: base + earned - spent };
}

const reservedNames = new Set([...races, ...classes].map((x) => x.name.toLowerCase()));
// Letters, numbers, spaces and simple punctuation. The server also screens
// names and text for inappropriate words.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} '’\-.&,!?():/]*$/u;

export function nameIssue(name, kind) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim();
  if (clean.length < NAME_MIN) return `Give the ${kind === 'class' ? 'Class' : 'Race'} a name of at least ${NAME_MIN} characters.`;
  if (clean.length > NAME_MAX) return `Names can be at most ${NAME_MAX} characters.`;
  if (!NAME_PATTERN.test(clean) || !/\p{L}/u.test(clean)) return 'Names can use letters, numbers, spaces and simple punctuation.';
  if (reservedNames.has(clean.toLowerCase())) return `${clean} is already a Race or Class in the book. Choose a different name.`;
  return null;
}

function rowIssues(row, option, label, kind) {
  const out = [];
  const fields = option.fields || [];
  const amount = toInt(row.amount, NaN);
  if (fields.includes('amount') && !(amount >= 1 && amount <= 20)) out.push(`${label}: the amount must be a whole number from 1 to 20.`);
  if (fields.includes('stats')) {
    const total = statTotal(row);
    if (!total) out.push(`${label}: choose a Stat.`);
    else if (total > 20) out.push(`${label}: at most 20 Stat points in one row.`);
  }
  if (fields.includes('skill')) {
    const name = String(row.skill || '').trim();
    if (!name) out.push(`${label}: choose a Skill.`);
    else if (option.id !== 'unlearnable' && !bookSkill(name)) out.push(`${label}: “${name}” isn’t a Skill or Spell in the book.`);
  }
  if (fields.includes('skills')) {
    const names = row.skills.map((x) => x.trim()).filter(Boolean);
    const unknown = names.filter((x) => !bookSkill(x));
    const unique = new Set(names.map((x) => x.toLowerCase()));
    if (!names.length) out.push(`${label}: list the Skills.`);
    if (unknown.length) out.push(`${label}: not in the book’s Skills: ${unknown.join(', ')}.`);
    if (unique.size !== names.length) out.push(`${label}: a Skill is listed twice.`);
    if (option.group && option.id !== 'skillChoice') {
      const unlinked = names.map(bookSkill).filter((x) => x && !groupable(x));
      if (unlinked.length) out.push(`${label}: Passive Skills and Spells can’t be part of a thematically linked group (${unlinked.map((x) => x.name).join(', ')}).`);
      if (Array.isArray(option.group)) {
        const [min, max] = option.group;
        if (unique.size < min || unique.size > max) out.push(`${label}: this group needs ${max === Infinity ? `${min} or more` : min === 1 ? `at most ${max}` : `${min}–${max}`} Skills (has ${unique.size}).`);
      }
      if (!String(row.detail || '').trim()) out.push(`${label}: name the group (for example “Charisma-based” or “Ranged Weapon”).`);
    }
    if (option.id === 'skillChoice' && unique.size < 2) out.push(`${label}: list at least two Skills to choose from.`);
  }
  if (fields.includes('text') && !String(row.text || '').trim()) out.push(`${label}: describe it.`);
  if (option.kinds && !option.kinds.includes(kind)) out.push(`${label}: only a ${option.kinds[0] === 'race' ? 'Race' : 'Class'} can take this.`);
  return out;
}

export function buildErrors(build) {
  const out = [];
  const kindName = build.kind === 'class' ? 'Class' : 'Race';
  const name = nameIssue(build.name, build.kind);
  if (name) out.push(name);
  if (build.benefits.length + build.detriments.length > MAX_ROWS * 2) out.push('That build has too many rows.');
  build.benefits.forEach((row, i) => {
    const option = benefitOption(row.option);
    if (!option) out.push(`Benefit ${i + 1}: choose a benefit from the menu.`);
    else out.push(...rowIssues(row, option, `Benefit ${i + 1}`, build.kind));
  });
  build.detriments.forEach((row, i) => {
    const option = detrimentOption(row.option);
    if (!option) out.push(`Detriment ${i + 1}: choose a detriment from the menu.`);
    else {
      out.push(...rowIssues(row, option, `Detriment ${i + 1}`, build.kind));
      if (row.tier && option.id === 'custom' && !DETRIMENT_TIERS.some(([id]) => id === row.tier)) out.push(`Detriment ${i + 1}: detriments are Minor, Moderate or Major.`);
    }
  });
  const points = buildPoints(build);
  if (points.left < 0) out.push(`This ${kindName} spends ${points.spent} Build Points but has ${points.budget}. Remove ${-points.left}.`);
  const dr = build.benefits.filter((x) => x.option === 'dr').reduce((sum, x) => sum + Math.max(0, toInt(x.amount)), 0);
  if (dr > DR_LIMIT) out.push(`DR Buffs are limited to +${DR_LIMIT} (this build has +${dr}).`);
  if (build.kind === 'class') {
    const passive = build.benefits
      .filter((x) => ['skill', 'unlearnable'].includes(x.option) && bookSkill(x.skill)?.passive)
      .reduce((sum, x) => sum + Math.max(0, toInt(x.amount)), 0);
    if (passive > PASSIVE_RANK_LIMIT) out.push(`A Class build can have at most ${PASSIVE_RANK_LIMIT} points of Passive Skills (this one has ${passive}).`);
  }
  if (build.kind === 'race' && build.benefits.filter((x) => x.option === 'small').length > 1) out.push('Size 2 (Small) only needs to be taken once.');
  const worship = new Set(build.detriments.map((x) => x.option).filter((x) => x === 'mustWorship' || x === 'cannotWorship'));
  if (worship.size > 1) out.push('A build can’t both require and forbid worshipping a deity.');
  if (String(build.description || '').length > DESCRIPTION_MAX) out.push(`Keep the description under ${DESCRIPTION_MAX} characters.`);
  return out;
}

const REQUIREMENT_TEXT = {
  earthRace: () => 'an Earth-based Race',
  skillRank: (x) => `Rank ${x.min}+ in ${x.skills.join(' or ')}`,
  noClub: (x) => `no access to the ${x.club}`,
  worshipAllowed: () => 'a Race that can worship a deity',
};

// The book-shaped entry rules.js uses: benefits[i] is the text of bullet i
// and effects[i] its mechanical effects (empty for situational ones).
export function buildEntry(raw, meta = {}) {
  const build = normalizeBuild(raw);
  const benefits = [];
  const effects = [];
  const requires = [];
  const push = (textValue, list = []) => {
    if (!textValue) return;
    benefits.push(textValue);
    effects.push(list);
  };
  if (build.kind === 'race' && !build.benefits.some((x) => x.option === 'small')) push('Size: Medium (4)', [{ type: 'size', value: 'Medium (4)' }]);
  if (build.kind === 'class' && build.earth) requires.push({ type: 'earthRace' });
  const add = (rows, find) => rows.forEach((row) => {
    const option = find(row.option);
    if (!option) return;
    const amount = Math.max(1, toInt(row.amount, 1));
    const ready = { ...row, amount };
    push(option.text(ready), option.effects ? option.effects(ready) : []);
    if (option.requires) requires.push(...option.requires(ready));
  });
  add(build.benefits, benefitOption);
  add(build.detriments, detrimentOption);
  if (build.earth) push('Silver Earth Box, with guaranteed Earth Hobby Potion');
  return {
    name: build.name.replace(/\s+/g, ' ').trim(),
    kind: build.kind,
    custom: true,
    page: null,
    earth: build.earth,
    requires,
    prerequisite: requires.length ? `Requires ${requires.map((x) => REQUIREMENT_TEXT[x.type](x)).join('; ')}` : '',
    benefits,
    effects,
    cannotWorship: build.kind === 'race' && build.detriments.some((x) => x.option === 'cannotWorship'),
    ...(build.kind === 'class' ? { classTypes: build.classTypes } : {}),
    description: build.description,
    ...meta,
  };
}
