import { attacks, utilitySkills, damageEffects } from './details.js';

// Source-bound rules for the first-draft builder.
// Approved sources only:
// - character-generation-rules.pdf (book pp. 101-115)
// - skills-and-spells.pdf (book pp. 173-214)

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
Gig Worker|Driving:Dex|Escape Artist:Str|Negotiation:Cha
Teacher|Detect Lies:Int|Perception:Int|Performance:Int
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
    animalPermission: false,
    backgrounds: Array.from({ length: 4 }, () => ({ option: null, picks: [] })),
    combatType: '',
    combat: '',
    customWeapon: '',
    stats: { Str: '', Int: '', Con: '', Dex: '', Cha: '' },
    performance: '',
    rulings: {},
    rulingsApproved: false,
    story: { trauma: '', looseEnd: '', regret: '' },
    storyMode: { trauma: '', looseEnd: '', regret: '' },
    clothing: { Head: '', Torso: '', Arms: '', Hands: '', Legs: '', Feet: '' },
    items: [
      { id: 'useful-1', name: '', qty: 1, kind: 'useful', location: 'inventory', notes: '' },
      { id: 'weird-1', name: '', qty: 1, kind: 'weird', location: 'inventory', notes: '' },
    ],
    weaponLocation: '',
    healSlot: '',
    spellSlot: '',
    potionsSlot: '',
    attackSheet: [],
    handEffectApproved: false,
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
  merged.rulings = { ...(raw.rulings || {}) };
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
        const conflict = Boolean(detail && skill.stat !== detail.stat);
        const chosenStat = conflict ? (state.rulings[skill.name] || skill.stat) : skill.stat;
        return {
          ...detail,
          ...skill,
          stat: chosenStat,
          tableStat: skill.stat,
          detailStat: detail?.stat,
          conflict,
          rank: stage.rank,
          source: `${stage.name}: ${background.name}`,
          tablePage: stage.page,
          page: detail?.page || stage.page,
        };
      });
  });
}

export function conflicts(state) {
  const seen = new Map();
  for (const item of selectedSkills(state).filter((x) => x.conflict)) {
    if (!seen.has(item.name)) seen.set(item.name, item);
  }
  return [...seen.values()];
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

export function allSkills(state) {
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

export function evadeBuff(state) {
  return selectedSkills(state).some((x) => x.name === 'Dodge') ? 1 : 0;
}

export function derived(state) {
  const mods = Object.fromEntries(stats.map((key) => [key, statMod(Number(state.stats[key]))]));
  const con = mods.Con;
  const intScore = Number(state.stats.Int);
  return {
    mods,
    health: con ? con * 10 : null,
    healthSlot: con || null,
    maxMana: Number.isFinite(intScore) && intScore > 0 ? intScore : null,
    currentMana: Number.isFinite(intScore) && intScore > 0 ? intScore : null,
    evadeDex: mods.Dex,
    evadeBuff: evadeBuff(state),
    move: 20,
    step: 10,
    aiFavor: state.kind === 'human' ? 1 : state.kind === 'animal' ? 0 : null,
    size: state.kind === 'human' ? 'Medium (4)' : sizeNames[String(state.size)] || '',
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

export function carriedItems(state) {
  const items = (state.items || []).filter((x) => String(x.name || '').trim()).map((x) => ({ ...x, qty: Number(x.qty) || 1 }));
  const weapon = weaponItem(state);
  return weapon ? [weapon, ...items] : items;
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
    if (!state.animalPermission) out.push('Confirm the GM allows this animal crawler and the group’s one-animal limit is satisfied.');
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

  const sourceConflicts = conflicts(state);
  if (sourceConflicts.some((x) => ![x.tableStat, x.detailStat].includes(state.rulings[x.name]))) {
    out.push('Resolve each printed Stat discrepancy on the Review step.');
  }
  if (sourceConflicts.length && !state.rulingsApproved) out.push('Confirm the GM-approved rulings for the printed Stat discrepancies.');

  if (state.combatType === 'hand' && !state.handEffectApproved) {
    out.push('Confirm the GM accepts Rank 3 for the paired hand-to-hand Damage Effect.');
  }

  for (const key of ['trauma', 'looseEnd', 'regret']) {
    if (!storyValue(state, key)) out.push(`Choose or write a ${key === 'looseEnd' ? 'Loose End' : key === 'trauma' ? 'Past Trauma' : 'Regret'}.`);
  }

  const useful = (state.items || []).filter((x) => x.kind === 'useful' && String(x.name || '').trim());
  if (useful.length !== 1) out.push('Choose exactly one interesting or useful starting item.');
  const weird = (state.items || []).filter((x) => x.kind === 'weird' && String(x.name || '').trim());
  if (weird.length < 1) out.push('Describe at least one piece of weird stuff you brought with you.');

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

  const inventoryCount = carriedItems(state).filter((x) => x.location === 'inventory').length;
  if (inventoryCount > 20) out.push('The supplied character sheet has only 20 Inventory rows; combine or relocate items.');

  const mandatoryAttack = state.combat && attacks[state.combat] ? state.combat : null;
  if (mandatoryAttack && !attackRowsForSheet(state).some((x) => x.name === mandatoryAttack)) out.push('The chosen combat option must appear in the front-page Attacks list.');
  if (new Set(state.attackSheet || []).size > (mandatoryAttack ? 4 : 5)) out.push('The front-page Attacks list has only five rows, including the required chosen combat option.');

  return [...new Set(out)];
}

export function missingDetails(state) {
  const notes = [
    'This builder creates the starting crawler described by the supplied character-creation pages. Class selection, Race changes, and the complete Level 10 / Third Floor advancement process are outside these supplied sources.',
  ];
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
    identity: Boolean(state.name.trim() && ['human', 'animal'].includes(state.kind) && (state.kind !== 'animal' || (state.species.trim() && ['2', '3', '4'].includes(String(state.size)) && state.animalPermission))),
    backgrounds: backgroundsDone,
    combat: Boolean(state.combatType && state.combat),
    stats: statValidationErrors(state).length === 0,
    story: ['trauma', 'looseEnd', 'regret'].every((key) => storyValue(state, key)),
    gear: (state.items || []).filter((x) => x.kind === 'useful' && x.name?.trim()).length === 1 && (state.items || []).some((x) => x.kind === 'weird' && x.name?.trim()) && (state.combatType !== 'weapon' || state.weaponLocation),
    hotlist: state.combatType !== 'spell' || (state.spellSlot !== '' && state.potionsSlot !== ''),
    attacks: !state.combat || attackRowsForSheet(state).some((x) => x.name === state.combat),
    review: errors(state).length === 0,
  };
}
