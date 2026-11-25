// The optional Party step: the party's name, notes about it, and Party buffs.
//
// A Party buff is something a party member gives the whole party, e.g. +2 DR
// while she's in the party. It takes the same bonuses as a magic item (Stats,
// Skills, DR and damage) and applies while it's ticked active:
// - Stat bonuses raise Enhanced Stats, like gear.
// - Skill bonuses work like gear's (Ranks within the Rank limit, or checks).
// - DR goes in the sheet's DR Buffs box, not Armor.
// - Damage bonuses add to all your attacks, like a worn item's.
// This module only reads `state`; rules.js applies the bonuses.

import { STAT_KEYS, normalizeGearItem, statBonus, skillBonuses, drBonus, damageBonuses, damageBonusProblem, bonusText } from './equipment.js';

export const MAX_PARTY_BUFFS = 30;
// The sheet's "External Buffs (Max 3)" box: at most 3 buffs active at a time.
export const MAX_ACTIVE_BUFFS = 3;

export function newPartyBuff() {
  return {
    id: `buff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    from: '',
    active: true,
    description: '',
    bonuses: { stats: {}, skills: [], dr: '', damage: [] },
  };
}

export function normalizePartyBuff(raw) {
  const buff = { ...newPartyBuff(), ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    id: String(buff.id),
    name: String(buff.name || ''),
    from: String(buff.from || ''),
    active: buff.active !== false,
    description: String(buff.description || ''),
    bonuses: normalizeGearItem({ bonuses: buff.bonuses }).bonuses,
  };
}

export function normalizeParty(raw) {
  const party = raw && typeof raw === 'object' ? raw : {};
  return {
    name: String(party.name || ''),
    notes: String(party.notes || ''),
    buffs: Array.isArray(party.buffs) ? party.buffs.map(normalizePartyBuff) : [],
  };
}

// "Shield Aura (from Donut)", or just its name.
export function buffLabel(buff) {
  const name = String(buff.name || '').trim();
  const from = String(buff.from || '').trim();
  return from ? `${name} (from ${from})` : name;
}

// Named buffs that are ticked active.
export function activePartyBuffs(state) {
  return (state.party?.buffs || []).filter((buff) => buff.active && String(buff.name || '').trim());
}

export function partyStatBonuses(state) {
  const total = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
  activePartyBuffs(state).forEach((buff) => Object.entries(statBonus(buff)).forEach(([key, n]) => { total[key] += n; }));
  return total;
}

// [{ name, ranks, type, buff }] for every active Skill bonus.
export function partySkillBonuses(state) {
  return activePartyBuffs(state).flatMap((buff) => skillBonuses(buff).map((x) => ({ ...x, buff: buffLabel(buff) })));
}

// [{ value, from }] per active buff with DR.
export function partyDr(state) {
  return activePartyBuffs(state).map((buff) => ({ value: drBonus(buff), from: String(buff.from || '').trim() || 'Party' })).filter((x) => x.value);
}

// [{ amount, condition, from }] for every active damage bonus.
export function partyDamageBonuses(state) {
  return activePartyBuffs(state).flatMap((buff) => damageBonuses(buff).map((x) => ({ ...x, from: buffLabel(buff) })));
}

// The sheet's External Buffs rows: "Protective Aura (from Donut): DR +2".
export function externalBuffLines(state) {
  return activePartyBuffs(state).slice(0, MAX_ACTIVE_BUFFS).map((buff) => {
    const bonus = bonusText(buff);
    return `${buffLabel(buff)}${bonus ? `: ${bonus}` : ''}`;
  });
}

// Lines for the sheet's notes; none when there's no party.
export function partyNotes(state) {
  const party = state.party || {};
  const name = String(party.name || '').trim();
  const notes = String(party.notes || '').trim();
  const buffs = activePartyBuffs(state).map((buff) => {
    const bonus = bonusText(buff);
    const description = String(buff.description || '').trim();
    return `${buffLabel(buff)}${bonus ? `: ${bonus}` : ''}${description ? `. ${description}` : ''}`;
  });
  const out = [];
  if (name || notes) out.push(`Party${name ? `: ${name}` : ''}${notes ? `${name ? '. ' : ': '}${notes}` : ''}`);
  if (buffs.length) out.push(`Party buffs: ${buffs.join('; ')}.`);
  return out;
}

export function partyErrors(state) {
  const out = [];
  const party = state.party || {};
  if (String(party.name || '').length > 60) out.push('Shorten the Party name to 60 characters.');
  const buffs = party.buffs || [];
  if (buffs.length > MAX_PARTY_BUFFS) out.push(`Keep the Party buff list to ${MAX_PARTY_BUFFS} entries.`);
  const active = activePartyBuffs(state).length;
  if (active > MAX_ACTIVE_BUFFS) out.push(`Only ${MAX_ACTIVE_BUFFS} External Buffs can be active at a time (${active} are). Untick Active on the extras.`);
  buffs.forEach((buff, index) => out.push(...buffErrors(buff, index)));
  return out;
}

// What's wrong with one buff; `index` names an unnamed one.
export function buffErrors(buff, index) {
  const out = [];
  const name = String(buff.name || '').trim();
  const label = name || `Party buff ${index + 1}`;
  if (!name) out.push(`Name Party buff ${index + 1} or remove it.`);
  const stats = buff.bonuses?.stats || {};
  const whole = (value) => value === '' || value == null || Number.isInteger(Number(value));
  if (STAT_KEYS.some((key) => !whole(stats[key]))) out.push(`Stat bonuses on “${label}” must be whole numbers.`);
  if ((buff.bonuses?.skills || []).some((x) => String(x.name || '').trim() && !whole(x.ranks))) out.push(`Skill bonuses on “${label}” need a whole number of Ranks.`);
  if (!whole(buff.bonuses?.dr)) out.push(`The DR bonus on “${label}” must be a whole number.`);
  (buff.bonuses?.damage || []).forEach((x) => {
    const problem = damageBonusProblem(x);
    if (problem === 'amount') out.push(`Damage bonuses on “${label}” need a whole-number amount.`);
    else if (problem === 'missing') out.push(`The damage bonus on “${label}” (${String(x.condition).trim()}) has no amount. Enter one, e.g. 1.`);
  });
  return out;
}
