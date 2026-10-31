import { attacks, utilitySkills, damageEffects } from './details.js';
import { races, classes, skillCatalog } from './races-classes.js';
import { buildEntry, buildErrors, normalizeBuild } from './builds.js';
import {
  gearItems, gearName, gearStatBonuses, gearSkillBonuses, gearDr, equipmentErrors, normalizeGearItem, bonusText,
} from './equipment.js';

// Source-bound rules for the first-draft builder.
// Approved sources only:
// - character-generation-rules.pdf (book pp. 101-115)
// - skills-and-spells.pdf (book pp. 173-214)
// - dcc-races.pdf (pp. 128-141) and dcc-classes.pdf (pp. 142-158) for Race & Class selection

const parse = (rows) => rows.trim().split('\n').map((row) => {
  const [name, ...skills] = row.split('|');
  return {
    name,
    skills: skills.map((entry) => {
      const [skillName, stat] = entry.split(':');
      return { name: skillName, stat };
    }),
  };
});

export const backgrounds = {
  human: [
    { name: 'Childhood', rank: 1, page: 104, table: 12, die: '1d12', options: parse(`Latchkey Kid|Streetwise:Cha|Perception:Int|Stealth:Dex
Crafty Kid|Fabricate:Int|Repair:Int|Salvage:Int
Excitable Kid|Escape Artist:Dex|Endurance:Con|Running:Dex
Gymnast|Endurance:Con|Jumping:Str|Performance:Cha
Military Brat|Deception:Cha|Streetwise:Cha|Tactics:Int
MMO Kid|Fabricate:Int|Engineering:Int|Tactics:Int
Only Child|Good First Impression:Cha|Investigation:Int|Negotiation:Cha
Outdoor Kid|Animal Handling:Cha|Climbing:Str|Swimming:Str
Problem Child|Intimidate:Str|Deception:Cha|Pugilism:Dex
Scamp|Hide in Shadows:Dex|Jumping:Str|Throwing:Str
Teacher’s Pet|Catcher:None|Perception:Int|Good First Impression:Cha
Wild Child|Stealth:Dex|Survival:Con|Running:Dex`) },
    { name: 'Adolescence', rank: 1, page: 105, table: 13, die: '1d12', options: parse(`Family Farm|Animal Handling:Cha|Fabricate:Int|Tracking:Int
Drama Nerd|Fabricate:Int|Deception:Cha|Performance:Cha
Drop-Out|Chopper Pilot:Dex|Streetwise:Cha|Survival:Con
Greek Life|Negotiation:Cha|Intimidate:Str|Taunt:Cha
Influencer|Negotiation:Cha|Persuasion:Cha|Performance:Cha
Jock|Endurance:Con|Jumping:Str|Throwing:Str
McJob|Determine Value:None|Negotiation:Cha|Repair:Int
Popular|Good First Impression:Cha|Perception:Int|Persuasion:Cha
Religious|Catcher:None|First Aid:Int|Persuasion:Cha
Student Government|Deception:Cha|Persuasion:Cha|Investigation:Int
Nerd|Investigation:Int|Repair:Int|Fabricate:Int
Weirdo|Streetwise:Cha|Intimidate:Str|Fabricate:Int`) },
    { name: 'Career', rank: 3, page: 105, table: 14, die: '1d12', options: parse(`Criminal|Deception:Cha|Stealth:Dex|Streetwise:Cha
Service Industry|Dagger:Dex|Endurance:Con|Sleight of Hand:Dex
Small Business Owner|Determine Value:None|Negotiation:Cha|Perception:Int
Medical|Sleight of Hand:Dex|Detect Lies:Int|First Aid:Int
Law Enforcement|Detect Lies:Int|Handgun:Dex|Investigation:Int
Gig Worker|Driving:Dex|Escape Artist:Dex|Negotiation:Cha
Teacher|Detect Lies:Int|Perception:Int|Performance:Cha
Office Drone|Dumpster Diving:Int|Endurance:Con|Investigation:Int
Entertainer|Deception:Cha|Good First Impression:Cha|Performance:Cha
Unhoused|Dumpster Diving:Int|Streetwise:Cha|Survival:Con
Middle Manager|Deception:Cha|Intimidate:Str|Negotiation:Cha
Military|Handgun:Dex|Survival:Con|Tactics:Int`) },
    { name: 'Hobby', rank: 2, page: 106, table: 15, die: '1d12', options: parse(`Collector|Fabricate:Int|Determine Value:None|Investigation:Int
Cosplay|Fabricate:Int|Performance:Cha|Salvage:Int
Drinker|Deception:Cha|Intimidate:Str|Streetwise:Cha
Gamer|Aiming:Dex|Perception:Int|Tactics:Int
Gym Rat|Running:Dex|Endurance:Con|Swimming:Str
Hunting|Tracking:Int|Shotgun:Dex|Stealth:Dex
Music|Perception:Int|Performance:Cha|Sleight of Hand:Dex
Motorsports|Driving:Dex|Repair:Int|Salvage:Int
Climber|Climbing:Str|Jumping:Str|Endurance:Con
Pop Culture|Determine Value:None|Investigation:Int|Perception:Int
Tinkering|Engineering:Int|Repair:Int|Salvage:Int
Travel|Endurance:Con|Negotiation:Cha|Streetwise:Cha`) },
  ],
  animal: [
    { name: 'Youth', rank: 1, page: 106, table: 16, die: '1d6', options: parse(`Abandoned|Hide in Shadows:Dex|Endurance:Con|Survival:Con
Farmed|Escape Artist:Dex|Climbing:Str|Light on Your Feet:Dex
Litter-Raised|Animal Handling:Cha|Detect Lies:Int|Back Claw:Str
Pampered|Negotiation:Cha|Good First Impression:Cha|Persuasion:Cha
Runt|Hide in Shadows:Dex|Escape Artist:Dex|Stealth:Dex
Stray|Back Claw:Str|Streetwise:Cha|Survival:Con`) },
    { name: 'Training', rank: 1, page: 107, table: 17, die: '1d6', options: parse(`Clever|Investigation:Int|Detect Lies:Int|Dodge:None
Free Range|Escape Artist:Dex|Survival:Con|Tracking:Int
Pack Mentality|Animal Handling:Cha|Persuasion:Cha|Tactics:Int
Mischievous|Deception:Cha|Persuasion:Cha|Sleight of Hand:Dex
Watcher|Ambush:Int|Investigation:Int|Perception:Int
Well-Trained|Light on Your Feet:Dex|Catcher:None|Performance:Cha`) },
    { name: 'Adult', rank: 3, page: 107, table: 19, die: '1d6', options: parse(`Guard|Catcher:None|Perception:Int|Taunt:Cha
Pile of Floof|Escape Artist:Dex|Deception:Cha|Persuasion:Cha
Scrapper|Light on Your Feet:Dex|Streetwise:Cha|Survival:Con
Show Animal|Good First Impression:Cha|Light on Your Feet:Dex|Performance:Cha
Support Animal|Determine Value:None|First Aid:Int|Perception:Int
Working|Animal Handling:Cha|Endurance:Con|Perception:Int`) },
    { name: 'Quirk', rank: 2, page: 107, table: 18, die: '1d6', options: parse(`Chow Hound|Dumpster Diving:Int|Investigation:Int|Intimidate:Str
Cuddly|Good First Impression:Cha|Persuasion:Cha|Negotiation:Cha
Curious|Climbing:Str|Perception:Int|Swimming:Str
Hunter|Hide in Shadows:Dex|Stealth:Dex|Tracking:Int
Playful|Persuasion:Cha|Dodge:None|Intimidate:Str
Social|Animal Handling:Cha|Taunt:Cha|Perception:Int`) },
  ],
};

export const weapons = [
  'Club', 'Improvised Weapons', 'Warhammer', 'Axe', 'Dagger', 'Longsword', 'Rapier',
  'Bow', 'Crossbow', 'Handgun', 'Shotgun', 'Javelin', 'Shuriken', 'Slingshot',
  'Herding Weapons', 'Lance', 'Polearm', 'Quarterstaff',
];

export const spells = [
  'Dirt Clod', 'Fire Fingers', 'Frost Scar', 'Mind Tickle',
  'Shock Treatment', 'Soul Collector', 'Vine Porn',
];

export const handToHand = {
  Pugilism: 'Iron Punch',
  'Foot Soldier': 'Smush',
  'Noggin Nocker': 'Skullcracker',
  'Wrasslin’': 'Toss',
};

export const stats = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
export const statNames = {
  Str: 'Strength', Int: 'Intelligence', Con: 'Constitution', Dex: 'Dexterity', Cha: 'Charisma',
};

export const storyOptions = {
  trauma: [
    'I was abused by someone I trusted.',
    'I was in a terrible accident.',
    'I witnessed a death.',
    'I was betrayed by a family member, friend, or lover.',
    'I was abandoned by one or more parents.',
    'I have a fear of open spaces.',
    'I have a fear of the dark or being alone.',
    'My home burned down.',
    'I was falsely accused of a betrayal or crime.',
    'I was deeply humiliated by a family member, friend, or lover.',
    'I let someone take the blame for something terrible that I did.',
    'I have a fear of heights.',
  ],
  looseEnd: [
    'I never finished high school or my college degree.',
    'I was about to open a restaurant or other business.',
    'I didn’t finish writing my novel.',
    'A family member, friend, or lover recently died, but I couldn’t say my goodbyes.',
    'I was on the verge of inventing or discovering something.',
    'I made a promise that I might no longer be able to fulfill.',
    'My collection was almost complete.',
    'I was about to perform for the first time when the collapse happened.',
    'I wanted to dump my partner, but…',
    'I was just about to buy or finish renovating my home.',
    'I never sent that letter to a family member, friend, or loved one.',
    'I never got to travel to my dream destination.',
  ],
  regret: [
    'I didn’t ask them to marry me.',
    'I turned down the perfect job.',
    'I stayed quiet when I shouldn’t have.',
    'I chose my own safety when I should have leapt into action.',
    'I never said goodbye.',
    'I spent way too much time on something pointless.',
    'I did something illegal, immoral, and probably both.',
    'I lied to avoid an event important to those close to me.',
    'I kept a secret that hurt someone badly.',
    'I didn’t apologize for something terrible that I did.',
    'I abandoned someone when they needed me the most.',
    'I trusted the wrong people.',
  ],
};

export const sizeNames = { '2': 'Small (2)', '3': 'Petite (3)', '4': 'Medium (4)' };

export function statMod(value) {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 1) return null;
  return [2, 5, 9, 19, 49, 99, 149, 199, 299, Infinity].findIndex((max) => v <= max) + 1;
}

export function generateCrawlerNumber(cryptoObject = globalThis.crypto) {
  const min = 50000;
  const max = 12900000;
  const span = max - min + 1;
  if (cryptoObject?.getRandomValues) {
    // Rejection sampling avoids modulo bias.
    const limit = Math.floor(0x100000000 / span) * span;
    const buf = new Uint32Array(1);
    let n;
    do {
      cryptoObject.getRandomValues(buf);
      n = buf[0];
    } while (n >= limit);
    return min + (n % span);
  }
  return min + Math.floor(Math.random() * span);
}

export function initialState() {
  return {
    version: 1,
    name: '',
    number: generateCrawlerNumber(),
    pronouns: '',
    kind: '',
    species: '',
    size: '',
    backgrounds: Array.from({ length: 4 }, () => ({ option: null, picks: [] })),
    combatType: '',
    combat: '',
    customWeapon: '',
    stats: { Str: '', Int: '', Con: '', Dex: '', Cha: '' },
    performance: '',
    story: { trauma: '', looseEnd: '', regret: '' },
    storyMode: { trauma: '', looseEnd: '', regret: '' },
    clothing: { Head: '', Torso: '', Arms: '', Hands: '', Legs: '', Feet: '' },
    items: [
      { id: 'useful-1', name: '', qty: 1, kind: 'useful', location: 'inventory', notes: '' },
      { id: 'weird-1', name: '', qty: 1, kind: 'weird', location: 'inventory', notes: '' },
    ],
    weaponLocation: '',
    weaponTwoHanded: false,
    // Equipment step (dcc-gear.pdf): items found after creation, gold and Misc. Junk.
    gear: [],
    // Starting possessions removed on the Equipment step, by kind. Creation
    // still counts them (exactly one useful item, at least one weird item).
    removedStarting: { useful: 0, weird: 0 },
    gold: '',
    miscJunk: '',
    healSlot: '',
    spellSlot: '',
    potionsSlot: '',
    attackSheet: [],
    race: '',
    className: '',
    raceChoices: {},
    classChoices: {},
    customRace: null,
    customClass: null,
    floor: 1,
    raceClassFloor: 3,
    levelUps: [],
    skillUps: [],
    popularity: '',
    achievements: '',
    clubs: { desperado: false, vanquisher: false },
    female: false,
  };
}

export function normalizeState(raw) {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const merged = { ...base, ...raw };
  merged.number = Number.isInteger(Number(raw.number)) && Number(raw.number) >= 50000 && Number(raw.number) <= 12900000
    ? Number(raw.number)
    : base.number;
  merged.stats = { ...base.stats, ...(raw.stats || {}) };
  merged.story = { ...base.story, ...(raw.story || {}) };
  merged.storyMode = { ...base.storyMode, ...(raw.storyMode || {}) };
  merged.clothing = { ...base.clothing, ...(raw.clothing || {}) };
  merged.backgrounds = Array.isArray(raw.backgrounds) && raw.backgrounds.length === 4
    ? raw.backgrounds.map((x) => ({ option: x?.option ?? null, picks: Array.isArray(x?.picks) ? x.picks : [] }))
    : base.backgrounds;
  merged.items = Array.isArray(raw.items) && raw.items.length ? raw.items : base.items;
  merged.attackSheet = Array.isArray(raw.attackSheet) ? raw.attackSheet : [];
  merged.clubs = { ...base.clubs, ...(raw.clubs || {}) };
  merged.raceChoices = raw.raceChoices && typeof raw.raceChoices === 'object' ? raw.raceChoices : {};
  merged.classChoices = raw.classChoices && typeof raw.classChoices === 'object' ? raw.classChoices : {};
  const snapshot = (value) => (value && typeof value === 'object' && value.build && typeof value.build === 'object' ? value : null);
  merged.customRace = snapshot(raw.customRace);
  merged.customClass = snapshot(raw.customClass);
  merged.levelUps = Array.isArray(raw.levelUps) ? raw.levelUps : [];
  merged.skillUps = Array.isArray(raw.skillUps) ? raw.skillUps : [];
  merged.gear = Array.isArray(raw.gear) ? raw.gear.map(normalizeGearItem) : [];
  merged.removedStarting = { ...base.removedStarting, ...(raw.removedStarting || {}) };
  return merged;
}

export function selectedSkills(state) {
  return (backgrounds[state.kind] || []).flatMap((stage, index) => {
    const selection = state.backgrounds[index];
    const background = stage.options[selection?.option];
    return (background?.skills || [])
      .filter((skill) => selection.picks.includes(skill.name))
      .map((skill) => {
        const detail = utilitySkills[skill.name] || attacks[skill.name];
        return {
          ...detail,
          ...skill,
          rank: stage.rank,
          source: `${stage.name}: ${background.name}`,
          tablePage: stage.page,
          page: detail?.page || stage.page,
        };
      });
  });
}

export function combatSkills(state) {
  if (!state.kind) return [];
  const startingName = state.kind === 'animal' ? 'Slice Attack' : 'Unarmed Combat';
  const starting = { name: startingName, label: startingName, ...attacks[startingName], rank: 3, source: 'Starting combat' };
  if (!attacks[state.combat]) return [starting];
  const label = state.combatType === 'weapon' && state.customWeapon.trim()
    ? `${state.customWeapon.trim()} (${state.combat})`
    : state.combat;
  return [starting, { name: state.combat, label, ...attacks[state.combat], rank: 3, source: 'Chosen combat' }];
}

// Skills from Backgrounds, combat and Heal, before any Race/Class bonuses.
export function baseSkills(state) {
  const skills = [...selectedSkills(state), ...combatSkills(state)];
  if (state.combatType === 'hand' && handToHand[state.combat]) {
    const name = handToHand[state.combat];
    skills.push({
      name,
      label: name,
      rank: 3,
      stat: 'None',
      check: 'Passive',
      source: 'Paired hand-to-hand Damage Effect',
      ...damageEffects[name],
    });
  }
  skills.push({ name: 'Heal', label: 'Heal', rank: 1, ...utilitySkills.Heal, source: 'All crawlers' });
  return skills;
}

export function allAttacks(state) {
  const list = [...combatSkills(state), ...selectedSkills(state).filter((x) => attacks[x.name])];
  const seen = new Set();
  return list.filter((x) => {
    if (seen.has(x.name)) return false;
    seen.add(x.name);
    return true;
  });
}

export function attackRowsForSheet(state) {
  const attacksAvailable = allAttacks(state);
  const mandatory = state.combat && attacks[state.combat] ? [state.combat] : [];
  const selected = new Set([...mandatory, ...(state.attackSheet || [])]);
  return attacksAvailable.filter((x) => selected.has(x.name)).slice(0, 5);
}

// Race & Class selection (dcc-races.pdf p. 128 onward, dcc-classes.pdf p. 142
// onward). Requirement types are documented in tools/build_race_class_data.py.
const clubKeys = { 'Desperado Club': 'desperado', 'Club Vanquisher': 'vanquisher' };

// A custom Race/Class (builds.js) is a snapshot on the crawler, in
// state.customRace / state.customClass as { id, author, build }, so the sheet
// doesn't change if its author later edits or deletes it.
const customEntries = new WeakMap();
function customEntry(snapshot, name, kind) {
  if (!snapshot?.build || snapshot.build.kind !== kind) return null;
  if (!customEntries.has(snapshot)) customEntries.set(snapshot, buildEntry(snapshot.build, { buildId: snapshot.id ?? null, author: snapshot.author || '' }));
  const entry = customEntries.get(snapshot);
  return entry.name === name ? entry : null;
}

export function findRace(name, state = null) {
  return races.find((x) => x.name === name) || customEntry(state?.customRace, name, 'race');
}

export function findClass(name, state = null) {
  return classes.find((x) => x.name === name) || customEntry(state?.customClass, name, 'class');
}

export function isRaceEntry(entry) {
  return Boolean(entry) && (entry.kind === 'race' || races.includes(entry));
}

export function skillRanks(skills) {
  const ranks = new Map();
  skills.forEach((skill) => {
    const key = skill.name.toLowerCase();
    ranks.set(key, Math.max(ranks.get(key) || 0, Number(skill.rank) || 0));
  });
  return ranks;
}

export function achievementList(state) {
  return String(state.achievements || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
}

// Race & Class bonuses (p. 128; user rulings): Skill/Spell bonuses add Ranks
// immediately, a Skill the crawler lacks is gained at the bonus Rank, and
// totals cap at Rank 10 during selection. Stat changes go to the Unenhanced
// Stat; only equipment changes Enhanced.
export const SELECTION_RANK_CAP = 10;
const catalogByKey = new Map(skillCatalog.map((x) => [x.name.toLowerCase(), x]));

// Each effect of an entry with its choice key ("bullet.effect") and the
// player's choice, if the effect needs one.
export function entryEffects(entry, choices = {}) {
  if (!entry) return [];
  return entry.effects.flatMap((list, bullet) => list.map((effect, part) => {
    const key = `${bullet}.${part}`;
    return { ...effect, key, bullet, benefit: entry.benefits[bullet], chosen: choices?.[key] };
  }));
}

export function pickedSkills(effect) {
  const picks = Array.isArray(effect.chosen) ? effect.chosen : [];
  return [...new Set(picks.filter((name) => effect.options.includes(name)))].slice(0, effect.count);
}

export function splitValues(effect) {
  const chosen = effect.chosen && typeof effect.chosen === 'object' ? effect.chosen : {};
  return Object.fromEntries(effect.stats.map((stat) => [stat, Math.max(0, Math.trunc(Number(chosen[stat]) || 0))]));
}

const detailTables = [attacks, utilitySkills, damageEffects];

function skillDetail(name) {
  const key = name.toLowerCase();
  for (const table of detailTables) {
    const match = Object.keys(table).find((x) => x.toLowerCase() === key);
    if (match) return table[match];
  }
  return null;
}

function catalogSkill(name, rank, source) {
  const entry = catalogByKey.get(name.toLowerCase());
  // A custom Skill such as "Creepy Chains (Club)" uses its parenthesized Skill.
  const usesSkill = entry?.custom ? entry.name.match(/\((.+)\)$/)?.[1] : null;
  const detail = skillDetail(usesSkill || entry?.name || name);
  return {
    ...(detail || {}),
    name: entry?.name || name,
    label: entry?.name || name,
    stat: detail?.stat || entry?.stat || 'None',
    // Attacks roll against Evade; otherwise the catalog only tells us Passive.
    check: detail?.check || (entry?.attack ? 'Evade' : entry?.passive ? 'Passive' : ''),
    page: detail?.page || entry?.page,
    rank,
    sources: source ? [source] : [],
  };
}

function applyEntrySkills(skills, entry, choices, from) {
  const credit = (skill, bonus) => {
    skill.sources = [...skill.sources, `${from} ${bonus > 0 ? '+' : ''}${bonus}`];
  };
  const add = (name, bonus) => {
    const current = skills.get(name.toLowerCase());
    if (current) {
      current.rank += bonus;
      credit(current, bonus);
    } else if (bonus > 0) {
      skills.set(name.toLowerCase(), catalogSkill(name, bonus, `${from} +${bonus}`));
    }
  };
  entryEffects(entry, choices).forEach((effect) => {
    if (effect.type === 'skill') effect.skills.forEach((name) => add(name, effect.bonus));
    if (effect.type === 'skillPick') pickedSkills(effect).forEach((name) => add(name, effect.bonus));
    if (effect.type === 'skillGroup' && effect.min === undefined) {
      // "+2 in all Charisma-based Skills" grants every Skill in the group (p. 128 + user ruling).
      effect.skills.forEach((name) => add(name, effect.bonus));
    } else if (effect.type === 'skillGroup') {
      // "−3 Ranks in all Strength Skills (to a minimum of 1 Rank if you have any
      // Ranks)" only changes Skills the crawler has.
      const names = new Set(effect.skills.map((x) => x.toLowerCase()));
      skills.forEach((skill, key) => {
        if (!names.has(key)) return;
        skill.rank = Math.max(effect.min, skill.rank + effect.bonus);
        credit(skill, effect.bonus);
      });
    }
  });
}

// Rank limits outside Race/Class selection (p. 128; user rulings): 15, or 20
// for Skills a Race/Class allows. Ranks 16+ don't come online until Floor 6.
export const RANK_CAP = 15;
export const EXTENDED_RANK_CAP = 20;
export const HIGH_RANK_FLOOR = 6;
export const LEVEL_STAT_POINTS = 3;

const positiveInt = (value, fallback = null) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
};

export function currentFloor(state) {
  return positiveInt(state.floor, 1);
}

// The floor the Race/Class was chosen on (Third Floor by default, p. 128).
export function raceClassFloor(state) {
  return positiveInt(state.raceClassFloor, 3);
}

export function level(state) {
  return 1 + (state.levelUps || []).length;
}

// Skill-ups logged before the Race/Class floor happen before selection.
function beforeSelection(state, entry) {
  return Boolean(state.race || state.className) && positiveInt(entry.floor, 1) < raceClassFloor(state);
}

export function rankLimit(state, name) {
  const key = name.toLowerCase();
  const allows = raceClassEffects(state).some((effect) => {
    if (effect.type === 'rankLimit') return effect.all || effect.skills.some((x) => x.toLowerCase() === key);
    if (effect.type === 'rankLimitPick') return pickedSkills(effect).some((x) => x.toLowerCase() === key);
    return false;
  });
  return allows ? EXTENDED_RANK_CAP : RANK_CAP;
}

function applySkillUps(state, skills, entries, capFor, report) {
  entries.forEach(({ entry, index }) => {
    const ranks = positiveInt(entry.ranks);
    if (!entry.skill || !ranks) return;
    const key = entry.skill.toLowerCase();
    if (!skills.has(key)) {
      if (!catalogByKey.has(key)) return;
      skills.set(key, catalogSkill(entry.skill, 0, ''));
    }
    const skill = skills.get(key);
    const before = skill.rank;
    const cap = capFor(skill.name);
    const after = Math.max(before, Math.min(cap, before + ranks));
    skill.rank = after;
    if (after > before) skill.sources = [...skill.sources, `Floor ${positiveInt(entry.floor, 1)} +${after - before}`];
    report[index] = { skill: skill.name, before, after, wasted: before + ranks - after, cap };
  });
}

// Skills in the order things happened: starting Skills, skill-ups before the
// Race/Class floor (cap 15), Race then Class bonuses (cap 10 during selection;
// a Skill already at 10+ gains nothing), then later skill-ups (cap 15/20).
// `raceName` and the include flags let prerequisites check earlier moments.
function computeSkills(state, { raceName = state.race, includeRace = true, includeClass = true, includeAfter = true } = {}) {
  const skills = new Map(baseSkills(state).map((skill) => [skill.name.toLowerCase(), { ...skill, sources: [skill.source].filter(Boolean) }]));
  const report = [];
  const ups = (state.skillUps || []).map((entry, index) => ({ entry, index }));
  const early = ups.filter(({ entry }) => beforeSelection(state, entry));
  const late = ups.filter(({ entry }) => !beforeSelection(state, entry));
  applySkillUps(state, skills, early, () => RANK_CAP, report);

  const preRank = new Map([...skills].map(([key, skill]) => [key, skill.rank]));
  const race = includeRace ? findRace(raceName, state) : null;
  if (race) applyEntrySkills(skills, race, raceName === state.race ? state.raceChoices : {}, 'Race');
  const cls = includeClass ? findClass(state.className, state) : null;
  if (cls) applyEntrySkills(skills, cls, state.classChoices, 'Class');
  skills.forEach((skill, key) => {
    const raw = skill.rank;
    if (raw > SELECTION_RANK_CAP) skill.rank = Math.max(preRank.get(key) || 0, SELECTION_RANK_CAP);
    skill.wasted = Math.max(0, raw - skill.rank);
  });

  if (includeAfter) applySkillUps(state, skills, late, (name) => rankLimit(state, name), report);
  const list = [...skills.values()].map((skill) => {
    const notes = [skill.notes];
    if (skill.wasted) notes.push(`${skill.wasted} Race/Class Rank${skill.wasted === 1 ? '' : 's'} over the Rank ${SELECTION_RANK_CAP} selection cap wasted.`);
    if (skill.rank > RANK_CAP && currentFloor(state) < HIGH_RANK_FLOOR) notes.push(`Ranks above ${RANK_CAP} come online on Floor ${HIGH_RANK_FLOOR}.`);
    return { ...skill, source: skill.sources.join('; '), notes: notes.filter(Boolean).join(' ') };
  });
  return { skills: list, report };
}

export function skillsWithRaceClass(state, options = {}) {
  return computeSkills(state, options).skills;
}

// Skills as the sheet shows them: computeSkills plus bonuses from equipped gear.
// - Rank bonuses obey the Skill's Rank limit (15, or 20 where a Race/Class
//   allows it) like any other Ranks; the excess does nothing (user ruling). A
//   Rank bonus to a Skill the crawler lacks grants it while equipped.
// - Check bonuses aren't Ranks: they add to the Skill's checks, uncapped, and
//   are listed in the Skill's notes.
// Neither counts toward Race/Class prerequisites (those use computeSkills).
export function allSkills(state) {
  const skills = computeSkills(state).skills;
  const find = (name) => skills.find((x) => x.name.toLowerCase() === name.toLowerCase());
  gearSkillBonuses(state).forEach(({ name, ranks, type, item }) => {
    const sign = ranks > 0 ? '+' : '';
    if (type === 'check') {
      const skill = find(name);
      if (!skill) return;
      skill.checkBonus = (skill.checkBonus || 0) + ranks;
      skill.notes = [skill.notes, `${sign}${ranks} to checks (Gear: ${item}).`].filter(Boolean).join(' ');
      return;
    }
    let skill = find(name);
    if (!skill) {
      if (ranks < 1) return;
      skill = { ...catalogSkill(name, 0, ''), source: '', notes: '' };
      skills.push(skill);
    }
    const before = skill.rank;
    const after = Math.max(0, Math.min(Math.max(before, rankLimit(state, skill.name)), before + ranks));
    skill.rank = after;
    skill.gearRanks = (skill.gearRanks || 0) + (after - before);
    skill.source = [skill.source, `Gear: ${item} ${sign}${ranks}`].filter(Boolean).join('; ');
    if (after - before < ranks && ranks > 0) {
      const lost = ranks - (after - before);
      skill.notes = [skill.notes, `${lost} gear Rank${lost === 1 ? '' : 's'} over the Rank ${rankLimit(state, skill.name)} limit ha${lost === 1 ? 's' : 've'} no effect.`].filter(Boolean).join(' ');
    }
  });
  return skills.filter((x) => x.rank > 0 || !x.gearRanks);
}

// Per skill-up entry: { skill, before, after, wasted, cap }.
export function skillUpReport(state) {
  return computeSkills(state).report;
}

function raceClassEffects(state) {
  return [
    ...entryEffects(findRace(state.race, state), state.raceChoices).map((x) => ({ ...x, from: 'Race' })),
    ...entryEffects(findClass(state.className, state), state.classChoices).map((x) => ({ ...x, from: 'Class' })),
  ];
}

// Stat points a level-up entry assigns (each level adds 3, any Stats).
export function levelPoints(entry) {
  return Object.fromEntries(stats.map((key) => [key, Math.max(0, Math.trunc(Number(entry?.stats?.[key]) || 0))]));
}

// Assigned Standard Array plus Race/Class changes and level points, then any caps.
export function unenhancedStats(state) {
  const out = Object.fromEntries(stats.map((key) => [key, state.stats?.[key] === '' || state.stats?.[key] == null ? '' : Number(state.stats[key])]));
  const effects = raceClassEffects(state);
  const add = (stat, n) => { if (out[stat] !== '') out[stat] += n; };
  effects.forEach((effect) => {
    if (effect.type === 'stat') Object.entries(effect.stats).forEach(([stat, n]) => add(stat, n));
    if (effect.type === 'statSplit') Object.entries(splitValues(effect)).forEach(([stat, n]) => add(stat, n));
  });
  (state.levelUps || []).forEach((entry) => Object.entries(levelPoints(entry)).forEach(([stat, n]) => add(stat, n)));
  effects.filter((x) => x.type === 'statCap').forEach((x) => {
    if (out[x.stat] !== '') out[x.stat] = Math.min(out[x.stat], x.max);
  });
  // A Stat can't drop below 1 (user ruling).
  stats.forEach((key) => { if (out[key] !== '') out[key] = Math.max(1, out[key]); });
  return out;
}

// Only equipment changes Enhanced Stats: Unenhanced plus equipped gear bonuses
// (items in the Inventory or Hotlist give none, p. 98), never below 1.
export function enhancedStats(state) {
  const out = unenhancedStats(state);
  const bonus = gearStatBonuses(state);
  stats.forEach((key) => { if (out[key] !== '') out[key] = Math.max(1, out[key] + bonus[key]); });
  // A custom "Stat is capped at 10" detriment holds even against gear (p. 161).
  raceClassEffects(state).filter((x) => x.type === 'statCap' && x.strict).forEach((x) => {
    if (out[x.stat] !== '') out[x.stat] = Math.min(out[x.stat], x.max);
  });
  return out;
}

// Time-of-day Stats (Lajabless, p. 136): additions first, then halving/doubling
// (rounded down, minimum 1). Null when no chosen Race/Class has them.
export function dayNightStats(state) {
  const effects = raceClassEffects(state).filter((x) => x.type === 'dayNight');
  if (!effects.length) return null;
  const base = enhancedStats(state);
  const period = (name) => {
    const out = { ...base };
    effects.forEach((x) => Object.entries(x[name].add || {}).forEach(([stat, n]) => { if (out[stat] !== '') out[stat] += n; }));
    effects.forEach((x) => Object.entries(x[name].multiply || {}).forEach(([stat, f]) => {
      if (out[stat] !== '') out[stat] = Math.max(1, Math.floor(out[stat] * f));
    }));
    return out;
  };
  return { day: period('day'), night: period('night') };
}

export function damageResistance(state) {
  const parts = raceClassEffects(state).filter((x) => x.type === 'dr').map((x) => ({ value: x.value, from: x.from }));
  // Race/Class DR goes in the sheet's Buffs box; equipped gear DR in its Armor box.
  const armor = gearDr(state);
  return { parts, armor, total: armor + parts.reduce((sum, x) => sum + x.value, 0) };
}

// Choices still needed for the chosen Race/Class, with a readable prompt.
export function raceClassChoiceIssues(state) {
  const out = [];
  [['Race', findRace(state.race, state), state.raceChoices], ['Class', findClass(state.className, state), state.classChoices]].forEach(([label, entry, choices]) => {
    entryEffects(entry, choices).forEach((effect) => {
      if ((effect.type === 'skillPick' || effect.type === 'rankLimitPick') && pickedSkills(effect).length !== effect.count) {
        out.push(`${entry.name} ${label}: choose ${effect.count === 1 ? 'one' : effect.count} for “${effect.benefit}”.`);
      }
      if (effect.type === 'statSplit') {
        const spent = Object.values(splitValues(effect)).reduce((a, b) => a + b, 0);
        if (spent !== effect.total) out.push(`${entry.name} ${label}: split exactly ${effect.total} points for “${effect.benefit}” (${spent} assigned).`);
      }
    });
  });
  return out;
}

function catSpecies(state) {
  return state.kind === 'animal' && /\bcats?\b/i.test(String(state.species || ''));
}

// Without a chosen Race the crawler keeps their entering Race (p. 128); every
// starting origin in the supplied creation rules is Earth-based.
function raceContext(state, raceName) {
  const race = findRace(raceName, state);
  if (race) return { name: race.name, earth: race.earth, cannotWorship: race.cannotWorship };
  return { name: state.kind === 'human' ? 'Human' : catSpecies(state) ? 'Cat' : '', earth: true, cannotWorship: false };
}

function requirementIssue(state, requirement, skills, race) {
  const ranks = skillRanks(skills);
  const popularity = Number(state.popularity) || 0;
  switch (requirement.type) {
    case 'skillRank':
      return requirement.skills.some((name) => (ranks.get(name.toLowerCase()) || 0) >= requirement.min)
        ? null : `Rank ${requirement.min}+ in ${requirement.skills.join(' or ')}`;
    case 'skillStatRank':
      return skills.some((skill) => requirement.stats.includes(skill.stat) && Number(skill.rank) >= requirement.min)
        ? null : `a ${requirement.stats.join(' or ')}-based Skill at Rank ${requirement.min}+`;
    case 'animalSpecies':
      return catSpecies(state) ? null : `already being a ${requirement.species}`;
    case 'race':
      return requirement.races.includes(race.name) ? null : `a ${requirement.races.join(', ')} Race`;
    case 'earthRace':
      return race.earth ? null : 'an Earth-based Race';
    case 'popularity':
      return popularity >= requirement.min ? null : `Popularity ${requirement.min}+`;
    case 'achievement':
      return achievementList(state).some((x) => x.toLowerCase() === requirement.name.toLowerCase())
        ? null : `the ${requirement.name} achievement`;
    case 'female':
      return state.female ? null : 'a female crawler';
    case 'noClub':
      return state.clubs?.[clubKeys[requirement.club]] ? `no access to the ${requirement.club}` : null;
    case 'worshipAllowed':
      return race.cannotWorship ? `a Race that can worship a deity (${race.name} cannot)` : null;
    default:
      return `an unknown requirement (${requirement.type})`;
  }
}

// Unmet requirements for a Race or Class entry, as short phrases. A Class is
// checked against `raceName` (default: the crawler's chosen Race).
export function raceClassRequirementIssues(state, entry, raceName = state.race) {
  if (!entry) return ['an entry from the supplied Race/Class lists'];
  // Race comes before Class (p. 128): Races check base Skills; Classes check
  // Skills after that Race's bonuses.
  const skills = skillsWithRaceClass(state, { raceName, includeRace: !isRaceEntry(entry), includeClass: false, includeAfter: false });
  const race = raceContext(state, raceName);
  return entry.requires.map((x) => requirementIssue(state, x, skills, race)).filter(Boolean);
}

export function eligibleRaces(state) {
  return races.filter((race) => raceClassRequirementIssues(state, race).length === 0);
}

export function eligibleClasses(state, raceName = state.race) {
  return classes.filter((entry) => raceClassRequirementIssues(state, entry, raceName).length === 0);
}

export function raceClassErrors(state) {
  const out = [];
  if (state.race) {
    const issues = raceClassRequirementIssues(state, findRace(state.race, state));
    if (issues.length) out.push(`${state.race} Race requires ${issues.join('; ')}.`);
  }
  if (state.className) {
    const issues = raceClassRequirementIssues(state, findClass(state.className, state));
    if (issues.length) out.push(`${state.className} Class requires ${issues.join('; ')}.`);
  }
  // A shared build could have been saved by something other than this editor.
  [['Race', state.race, state.customRace], ['Class', state.className, state.customClass]].forEach(([label, name, snapshot]) => {
    if (!snapshot || snapshot.build?.name?.replace(/\s+/g, ' ').trim() !== name) return;
    const issues = buildErrors(normalizeBuild(snapshot.build));
    if (issues.length) out.push(`The custom ${label} ${name} doesn’t follow the Build System: ${issues[0]}`);
  });
  const popularity = String(state.popularity ?? '').trim();
  if (popularity && !/^\d{1,4}$/.test(popularity)) out.push('Popularity must be a whole number of 0 or more.');
  out.push(...raceClassChoiceIssues(state));
  if (state.race || state.className) {
  }
  return out;
}

// Levels and skill-ups (user design): each level-up assigns exactly 3 Stat
// points; skill-ups are a log of Skill/Spell Ranks gained, with the floor.
export function advancementErrors(state) {
  const out = [];
  if (!positiveInt(state.floor)) out.push('Current Floor must be a whole number of 1 or more.');
  if ((state.race || state.className) && !positiveInt(state.raceClassFloor)) out.push('The floor the Race/Class was chosen on must be a whole number of 1 or more.');
  (state.levelUps || []).forEach((entry, i) => {
    const spent = Object.values(levelPoints(entry)).reduce((a, b) => a + b, 0);
    if (spent !== LEVEL_STAT_POINTS) out.push(`Level ${i + 2}: assign exactly ${LEVEL_STAT_POINTS} Stat points (${spent} assigned).`);
    if (!positiveInt(entry.floor)) out.push(`Level ${i + 2}: the floor must be a whole number of 1 or more.`);
  });
  const known = new Set(allSkills(state).map((x) => x.name.toLowerCase()));
  (state.skillUps || []).forEach((entry, i) => {
    const name = String(entry.skill || '').toLowerCase();
    if (!name || !(known.has(name) || catalogByKey.has(name))) out.push(`Skill-up ${i + 1}: choose a Skill or Spell.`);
    if (!positiveInt(entry.ranks)) out.push(`Skill-up ${i + 1}: Ranks gained must be 1 or more.`);
    if (!positiveInt(entry.floor)) out.push(`Skill-up ${i + 1}: the floor must be a whole number of 1 or more.`);
  });
  return out;
}

// Human: "Gain 1 AI Favor each time you level up" (p. 135) — levels gained on
// or after the floor the Human Race was chosen.
function humanLevelFavor(state) {
  if (state.race !== 'Human') return 0;
  return (state.levelUps || []).filter((x) => positiveInt(x.floor, 1) >= raceClassFloor(state)).length;
}

export function evadeBuff(state) {
  return allSkills(state).some((x) => x.name === 'Dodge') ? 1 : 0;
}

export function derived(state) {
  const enhanced = enhancedStats(state);
  const mods = Object.fromEntries(stats.map((key) => [key, statMod(Number(enhanced[key]))]));
  // Sheet text: "day/night" when a Stat changes with the time of day.
  const dayNight = dayNightStats(state);
  const plus = (n) => (n ? `+${n}` : '');
  const pair = (fn, key) => {
    if (!dayNight || dayNight.day[key] === dayNight.night[key]) return null;
    return `${fn(dayNight.day[key])}/${fn(dayNight.night[key])}`;
  };
  const statText = Object.fromEntries(stats.map((key) => [key, pair((v) => v, key) ?? (enhanced[key] === '' ? '' : String(enhanced[key]))]));
  const modText = Object.fromEntries(stats.map((key) => [key, pair((v) => plus(statMod(v)), key) ?? plus(mods[key])]));
  const con = mods.Con;
  const intScore = Number(enhanced.Int);
  const effects = raceClassEffects(state);
  const raceSize = effects.find((x) => x.type === 'size' && x.from === 'Race')?.value;
  const moveBonus = effects.filter((x) => x.type === 'move').reduce((sum, x) => sum + x.value, 0);
  const stepBonus = effects.filter((x) => x.type === 'step').reduce((sum, x) => sum + x.value, 0);
  return {
    mods,
    health: con ? con * 10 : null,
    healthSlot: con || null,
    maxMana: Number.isFinite(intScore) && intScore > 0 ? intScore : null,
    manaText: pair((v) => v, 'Int'),
    statText,
    modText,
    dayNight: Boolean(dayNight),
    currentMana: Number.isFinite(intScore) && intScore > 0 ? intScore : null,
    evadeDex: mods.Dex,
    evadeBuff: evadeBuff(state),
    move: 20 + moveBonus,
    step: 10 + stepBonus,
    aiFavor: state.kind === 'human' ? 1 + humanLevelFavor(state) : state.kind === 'animal' ? 0 + humanLevelFavor(state) : null,
    level: level(state),
    floor: currentFloor(state),
    size: raceSize || (state.kind === 'human' ? 'Medium (4)' : sizeNames[String(state.size)] || ''),
    dr: damageResistance(state),
    // Lifting limit: Strength score x 15 lb (p. 98).
    lift: enhanced.Str === '' ? null : Number(enhanced.Str) * 15,
  };
}

export function weaponItem(state) {
  if (state.combatType !== 'weapon' || !state.combat) return null;
  return {
    id: 'starting-weapon',
    name: state.customWeapon.trim() ? `${state.customWeapon.trim()} (${state.combat})` : state.combat,
    qty: 1,
    kind: 'weapon',
    location: state.weaponLocation,
    notes: attacks[state.combat]?.notes || '',
  };
}

// Everything carried: the starting weapon and possessions, gear from the
// Equipment step, then gold and Misc. Junk as Inventory rows.
export function carriedItems(state) {
  const items = (state.items || []).filter((x) => String(x.name || '').trim()).map((x) => ({ ...x, qty: Number(x.qty) || 1 }));
  const weapon = weaponItem(state);
  const gear = gearItems(state).map((x) => {
    const bonus = bonusText(x);
    return {
      id: x.id,
      name: gearName(x),
      qty: Number(x.qty) || 1,
      kind: x.kind,
      location: x.location,
      bonus,
      notes: [bonus, String(x.description || '').trim()].filter(Boolean).join('. '),
    };
  });
  const money = [['gold', 'Gold coins', state.gold], ['misc-junk', 'Misc. Junk', state.miscJunk]]
    .filter(([, , value]) => Number(value) > 0)
    .map(([id, name, value]) => ({ id, name, qty: Number(value), kind: id, location: 'inventory', notes: '' }));
  return [...(weapon ? [weapon] : []), ...items, ...gear, ...money];
}

export function hotlist(state) {
  const slots = Array(10).fill('');
  const put = (slot, text) => {
    const n = Number(slot);
    if (Number.isInteger(n) && n >= 1 && n <= 10) slots[n - 1] = text;
  };
  if (state.healSlot !== '') {
    put(state.healSlot, 'Heal | Rank 1 (max)\n2 Mana | Interrupt\nSelf only: heals 2 Health Bar slots.');
  }
  if (state.combatType === 'spell' && attacks[state.combat]) {
    const attack = attacks[state.combat];
    const range = attack.range === 5 ? 'Melee' : `${attack.range} ft`;
    put(state.spellSlot, `${state.combat} | Rank 3\n${attack.mana} Mana | ${range}\n${attack.dice}${attack.damageStat ? ` + ${attack.damageStat}` : ''} ${attack.effect}`);
    put(state.potionsSlot, 'Standard Mana Potions x5\nAction: drink one to fully restore Mana.');
  }
  carriedItems(state).forEach((item) => {
    if (String(item.location || '').startsWith('hotlist:')) {
      put(String(item.location).split(':')[1], `${item.name}${item.qty > 1 ? ` x${item.qty}` : ''}${item.notes ? `\n${item.notes}` : ''}`);
    }
  });
  return slots;
}

export function occupiedHotlistSlots(state) {
  const result = [];
  if (state.healSlot !== '') result.push(Number(state.healSlot));
  if (state.combatType === 'spell') {
    if (state.spellSlot !== '') result.push(Number(state.spellSlot));
    if (state.potionsSlot !== '') result.push(Number(state.potionsSlot));
  }
  carriedItems(state).forEach((item) => {
    if (String(item.location || '').startsWith('hotlist:')) result.push(Number(String(item.location).split(':')[1]));
  });
  return result;
}

export function backgroundStageComplete(state, stageIndex) {
  const stage = (backgrounds[state.kind] || [])[stageIndex];
  const selection = state.backgrounds?.[stageIndex];
  const background = stage?.options?.[selection?.option];
  if (!background || !Array.isArray(selection?.picks) || selection.picks.length !== 2) return false;
  if (new Set(selection.picks).size !== 2) return false;
  return selection.picks.every((name) => background.skills.some((skill) => skill.name === name));
}

export function firstIncompleteBackgroundStage(state) {
  const stages = backgrounds[state.kind] || [];
  if (!stages.length) return 0;
  const index = stages.findIndex((_, stageIndex) => !backgroundStageComplete(state, stageIndex));
  return index;
}

export function statValidationErrors(state) {
  const out = [];
  const rawValues = stats.map((key) => state.stats?.[key]);
  const values = rawValues.map((value) => Number(value));
  const assigned = values.filter((value) => [2, 3, 4, 5, 6].includes(value));

  if (assigned.length !== stats.length) {
    out.push('Assign a value to every Stat using the Standard Array: 2, 3, 4, 5, and 6.');
  }

  const counts = new Map();
  for (const value of assigned) counts.set(value, (counts.get(value) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort((a, b) => a - b);
  if (duplicates.length) {
    out.push(`Each Standard Array value can be used only once. Duplicate value${duplicates.length === 1 ? '' : 's'}: ${duplicates.join(', ')}.`);
  }

  if (assigned.length === stats.length && !duplicates.length) {
    const sorted = [...assigned].sort((a, b) => a - b).join(',');
    if (sorted !== '2,3,4,5,6') out.push('Assign 2, 3, 4, 5, and 6 to the five Stats, using each number once.');
  }

  if (state.combatType === 'spell' && Number(state.stats?.Int) < 4) {
    out.push('A starting attack Spell requires Intelligence 4 or higher.');
  }
  return out;
}

export function selectedNames(state, exceptStage = -1) {
  const names = new Set();
  (backgrounds[state.kind] || []).forEach((stage, index) => {
    if (index === exceptStage) return;
    for (const name of state.backgrounds[index]?.picks || []) names.add(name);
  });
  if (state.combat) names.add(state.combat);
  const start = state.kind === 'human' ? 'Unarmed Combat' : state.kind === 'animal' ? 'Slice Attack' : '';
  if (start) names.add(start);
  return names;
}

export function storyValue(state, key) {
  return String(state.story?.[key] || '').trim();
}

function textLengthErrors(state, errors) {
  if (state.name.length > 60) errors.push('Shorten the crawler name so it fits the character sheet.');
  if (state.pronouns.length > 50) errors.push('Shorten the gender/pronouns text so it fits the character sheet.');
  if (state.species.length > 50) errors.push('Shorten the animal species description so it fits the character sheet.');
  if (state.customWeapon.length > 55) errors.push('Shorten the unique weapon name so it fits the character sheet.');
}

// Starting possessions of a kind, counting ones later removed on the Equipment step.
function startingCount(state, kind) {
  const held = (state.items || []).filter((x) => x.kind === kind && String(x.name || '').trim()).length;
  return held + (Number(state.removedStarting?.[kind]) || 0);
}

export function errors(state) {
  const out = [];
  if (!String(state.name || '').trim()) out.push('Enter your crawler’s name.');
  textLengthErrors(state, out);
  if (!Number.isInteger(Number(state.number)) || Number(state.number) < 50000 || Number(state.number) > 12900000) {
    out.push('The assigned crawler number is invalid. Start a new crawler to generate a new number.');
  }
  if (!['human', 'animal'].includes(state.kind)) out.push('Choose Human or an allowed earth-based animal.');
  if (state.kind === 'animal') {
    if (!String(state.species || '').trim()) out.push('Name the earth-based animal species.');
    if (!['2', '3', '4'].includes(String(state.size))) out.push('Choose an animal size from 2 to 4.');
  }

  const stages = backgrounds[state.kind] || [];
  stages.forEach((stage, index) => {
    const selection = state.backgrounds[index];
    const background = stage.options[selection?.option];
    if (!background || selection.picks.length !== 2 || new Set(selection.picks).size !== 2 || selection.picks.some((name) => !background.skills.some((x) => x.name === name))) {
      out.push(`Choose one ${stage.name.toLowerCase()} background and exactly two of its Skills.`);
    }
  });

  const skillNames = [...selectedSkills(state), ...combatSkills(state)].map((x) => x.name);
  if (new Set(skillNames).size !== skillNames.length) out.push('Background and combat Skills must be different; starting Ranks do not stack.');

  const combatOptions = state.combatType === 'weapon'
    ? weapons
    : state.combatType === 'spell'
      ? spells
      : state.combatType === 'hand'
        ? Object.keys(handToHand)
        : [];
  if (!combatOptions.includes(state.combat)) out.push('Choose the second Rank 3 combat option.');
  if (state.combatType === 'weapon' && !state.weaponLocation) out.push('Choose where the starting weapon is carried.');

  out.push(...statValidationErrors(state));

  if (selectedSkills(state).some((x) => x.name === 'Performance') && !String(state.performance || '').trim()) {
    out.push('Choose a starting Performance specialty.');
  }

  for (const key of ['trauma', 'looseEnd', 'regret']) {
    if (!storyValue(state, key)) out.push(`Choose or write a ${key === 'looseEnd' ? 'Loose End' : key === 'trauma' ? 'Past Trauma' : 'Regret'}.`);
  }

  if (startingCount(state, 'useful') !== 1) out.push('Choose exactly one interesting or useful starting item.');
  if (startingCount(state, 'weird') < 1) out.push('Describe at least one piece of weird stuff you brought with you.');

  for (const item of state.items || []) {
    if (!String(item.name || '').trim()) continue;
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) out.push(`Give “${item.name}” a whole-number quantity of at least 1.`);
    if (!item.location) out.push(`Choose where “${item.name}” is carried.`);
    if (String(item.location).startsWith('hotlist:') && qty > 999) out.push(`A Hotlist slot can hold at most 999 of “${item.name}”.`);
  }

  const occupied = occupiedHotlistSlots(state);
  if (occupied.some((n) => !Number.isInteger(n) || n < 1 || n > 10)) out.push('Hotlist slots must be numbered 1 through 10.');
  if (new Set(occupied).size !== occupied.length) out.push('Use a different Hotlist slot for each spell or item entry.');
  if (state.combatType === 'spell') {
    if (state.spellSlot === '') out.push('Place the chosen attack Spell in a Hotlist slot.');
    if (state.potionsSlot === '') out.push('Place the five Standard Mana Potions together in one Hotlist slot.');
  }

  const mandatoryAttack = state.combat && attacks[state.combat] ? state.combat : null;
  if (mandatoryAttack && !attackRowsForSheet(state).some((x) => x.name === mandatoryAttack)) out.push('The chosen combat option must appear in the front-page Attacks list.');
  if (new Set(state.attackSheet || []).size > (mandatoryAttack ? 4 : 5)) out.push('The front-page Attacks list has only five rows, including the required chosen combat option.');
  out.push(...raceClassErrors(state));
  out.push(...advancementErrors(state));
  out.push(...equipmentErrors(state));

  return [...new Set(out)];
}

export function missingDetails(state) {
  const notes = [
    'The complete Level 10 / Third Floor advancement process is not built yet.',
  ];
  if (state.race || state.className) notes.push('Race and Class Stat, Skill, Spell, DR, Size and Move bonuses are applied. Situational benefits are written to the sheet notes for your GM.');
  if (findClass(state.className, state)?.requires.some((x) => x.type === 'worshipAllowed')) notes.push(`${state.className} must worship a deity (p. 163). Deity selection is not built yet.`);
  if (state.healSlot === '') notes.push('Heal is known but not placed in the Hotlist; the spell rules say Spells must be in the Hotlist for combat or other stressful situations.');
  if (state.combatType === 'hand') notes.push('The Bronze Weapon Box’s weapon and drawback are not defined by the supplied creation pages; the GM determines them.');
  if (['Mind Tickle', 'Vine Porn'].includes(state.combat)) notes.push('The sheet uses the listed base Mana cost. These Spells are Favored by a Class, but no Class is assigned by the supplied starting-crawler rules.');
  if (state.combat === 'Lance') notes.push('Lance requires a mount. The supplied starting-gear rules do not automatically grant one.');
  if (['Bow', 'Crossbow', 'Handgun', 'Shotgun'].includes(state.combat)) notes.push('This weapon requires ammunition. The supplied starting-gear rules do not give an automatic ammunition quantity.');
  return notes;
}

export function stepCompletion(state) {
  const stages = backgrounds[state.kind] || [];
  const backgroundsDone = stages.length === 4 && stages.every((_, i) => backgroundStageComplete(state, i));
  return {
    identity: Boolean(state.name.trim() && ['human', 'animal'].includes(state.kind) && (state.kind !== 'animal' || (state.species.trim() && ['2', '3', '4'].includes(String(state.size))))),
    backgrounds: backgroundsDone,
    combat: Boolean(state.combatType && state.combat),
    stats: statValidationErrors(state).length === 0,
    story: ['trauma', 'looseEnd', 'regret'].every((key) => storyValue(state, key)),
    gear: startingCount(state, 'useful') === 1 && startingCount(state, 'weird') >= 1 && (state.combatType !== 'weapon' || state.weaponLocation),
    hotlist: state.combatType !== 'spell' || (state.spellSlot !== '' && state.potionsSlot !== ''),
    attacks: !state.combat || attackRowsForSheet(state).some((x) => x.name === state.combat),
    raceclass: raceClassErrors(state).length === 0,
    advancement: advancementErrors(state).length === 0,
    equipment: equipmentErrors(state).length === 0,
    review: errors(state).length === 0,
  };
}
