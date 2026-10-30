// The Race & Class Workshop: custom Races and Classes made with the Build
// System (builds.js), kept apart from any crawler.
//
// - Verified accounts keep up to the server's limit of builds, private or
//   public. Anyone, signed in or not, can browse public builds.
// - "Use for this crawler" copies the build onto the open crawler as a
//   snapshot (rules.js findRace/findClass), so later edits don't change
//   crawlers already using it; the card offers to update to the new version.
import { api } from './api.js';
import { account, verified } from './account.js';
import {
  BUILD_POINTS, MAX_DETRIMENT_POINTS, PASSIVE_RANK_LIMIT, NAME_MAX, DESCRIPTION_MAX, TEXT_MAX, STATS, STAT_NAMES, CLUBS,
  CLASS_TYPES, TIERS, newBuild, newRow, normalizeBuild, buildEntry, buildErrors, buildPoints, rowCost,
  optionsFor, tiersFor, benefitOption, detrimentOption, bookSkill, groupable, statSpread,
} from './builds.js';
import { skillCatalog } from './races-classes.js';

export const workshop = {
  mine: [],
  limit: 20,
  publicBuilds: [],
  more: false,
  publicKind: 'race',
  query: '',
  draft: null, // the build being edited
  editing: null, // { id, public } of the saved build being edited; id null for a new one
  error: '',
  busy: false,
  pickers: {}, // 'section|index' → which Skills a row's Skill dropdown shows
};

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const kindName = (kind) => (kind === 'class' ? 'Class' : 'Race');

export async function loadWorkshop() {
  workshop.error = '';
  const query = new URLSearchParams({ kind: workshop.publicKind, q: workshop.query });
  const tasks = [api(`builds/public?${query}`).then((data) => {
    workshop.publicBuilds = data.builds;
    workshop.more = data.more;
  })];
  if (verified()) {
    tasks.push(api('builds').then((data) => {
      workshop.mine = data.builds;
      workshop.limit = data.limit;
    }));
  } else {
    workshop.mine = [];
  }
  const failed = (await Promise.allSettled(tasks)).find((x) => x.status === 'rejected');
  if (failed) workshop.error = failed.reason?.message || 'Could not load custom Races and Classes.';
}

function findBuild(id) {
  return [...workshop.mine, ...workshop.publicBuilds].find((x) => x.id === id) || null;
}

function snapshotOf(state, kind) {
  return kind === 'class' ? state.customClass : state.customRace;
}

// The crawler's copy of this build, if it uses it.
function inUse(state, build) {
  const snapshot = snapshotOf(state, build.kind);
  const name = build.kind === 'class' ? state.className : state.race;
  return snapshot?.id === build.id && buildEntry(snapshot.build).name === name ? snapshot : null;
}

export function snapshot(build) {
  return { id: build.id, author: build.author, updatedAt: build.updatedAt, build: build.data };
}

// --- Views -------------------------------------------------------------------

function benefitList(entry) {
  return `<ul>${entry.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

function buildCard(build, state) {
  const data = normalizeBuild(build.data);
  const entry = buildEntry(data);
  const issues = buildErrors(data);
  const points = buildPoints(data);
  const using = inUse(state, build);
  const outdated = using && using.updatedAt !== build.updatedAt;
  const tags = [
    data.earth ? 'Earth' : build.kind === 'race' ? 'Alien' : 'Any Race',
    build.mine ? (build.public ? 'Public' : 'Private') : '',
  ].filter(Boolean);
  const types = entry.classTypes?.length ? ` · ${entry.classTypes.join(', ')}` : '';
  const useLabel = outdated ? 'Update crawler to this version' : using ? 'Used by this crawler' : 'Use for this crawler';
  return `<article class="rc-card ${using ? 'selected' : ''}">
    <div class="rc-head"><strong>${esc(build.name)}</strong>${tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
    <p class="muted micro">Custom ${kindName(build.kind)} by ${esc(build.author)}${esc(types)} · ${points.spent}/${points.budget} Build Points${entry.prerequisite ? ` · ${esc(entry.prerequisite)}` : ''}</p>
    ${data.description ? `<p class="build-description">${esc(data.description)}</p>` : ''}
    <details><summary>${entry.benefits.length} benefits</summary>${benefitList(entry)}</details>
    ${issues.length ? `<p class="error micro">Doesn’t follow the Build System: ${esc(issues[0])}</p>` : ''}
    <div class="build-actions">
      <button type="button" class="${using && !outdated ? 'secondary' : 'primary'}" data-build-use="${build.id}" ${issues.length || (using && !outdated) ? 'disabled' : ''}>${useLabel}</button>
      ${build.mine ? `<button type="button" class="secondary" data-build-edit="${build.id}">Edit</button>
        <button type="button" class="secondary danger-button" data-build-delete="${build.id}" aria-label="Delete ${esc(build.name)}">Delete</button>` : ''}
      ${!build.mine && verified() ? `<button type="button" class="secondary" data-build-copy="${build.id}">Copy to my builds</button>` : ''}
    </div>
  </article>`;
}

function mineSection(state) {
  let body;
  if (!account.user) {
    body = `<p class="muted">Sign in and verify your email to build your own Races and Classes and share them.</p>
      <button type="button" class="primary" data-action="account">Sign in</button>`;
  } else if (!verified()) {
    body = `<p class="muted">Verify your email to build your own Races and Classes.</p>
      <button type="button" class="primary" data-action="account">Verify email</button>`;
  } else {
    const full = workshop.mine.length >= workshop.limit;
    body = `<div class="build-actions">
        <button type="button" class="primary" data-build-new="race" ${full ? 'disabled' : ''}>New custom Race</button>
        <button type="button" class="primary" data-build-new="class" ${full ? 'disabled' : ''}>New custom Class</button>
      </div>
      ${full ? `<p class="muted micro">You have ${workshop.limit} builds, the most an account can keep. Delete one to make another.</p>` : ''}
      ${workshop.mine.length ? `<div class="rc-grid">${workshop.mine.map((x) => buildCard(x, state)).join('')}</div>` : '<p class="muted">No custom Races or Classes yet.</p>'}`;
  }
  return `<section class="panel">
    <div class="panel-head"><h2>My builds</h2><span class="ref">${account.user && verified() ? `${workshop.mine.length}/${workshop.limit}` : ''}</span></div>
    ${body}
  </section>`;
}

function publicSection(state) {
  const kind = workshop.publicKind;
  return `<section class="panel">
    <div class="panel-head"><h2>Shared by other crawlers</h2></div>
    <div class="stage-tabs" role="tablist">
      ${['race', 'class'].map((k) => `<button type="button" role="tab" aria-selected="${k === kind}" class="${k === kind ? 'active' : ''}" data-build-public-kind="${k}">${kindName(k)}s</button>`).join('')}
    </div>
    <label class="field build-search">Search by name<input type="search" data-build-search value="${esc(workshop.query)}" maxlength="80" placeholder="Dungeon Dad"></label>
    ${workshop.publicBuilds.length
      ? `<div class="rc-grid">${workshop.publicBuilds.map((x) => buildCard(x, state)).join('')}</div>`
      : `<p class="muted">${workshop.query ? 'No shared builds match that name.' : `No one has shared a custom ${kindName(kind)} yet.`}</p>`}
    ${workshop.more ? '<p class="muted micro">Showing the most recent. Search by name to find others.</p>' : ''}
  </section>`;
}

export function workshopView(state) {
  if (!account.available) {
    return `<p class="eyebrow">CUSTOM RACES & CLASSES</p><h1>The workshop is unavailable.</h1>
      <p class="intro">The server isn’t reachable, so custom Races and Classes can’t be loaded right now.</p>`;
  }
  return `<p class="eyebrow">CUSTOM RACES & CLASSES</p>
    <h1>Race & Class Workshop</h1>
    <p class="intro">Didn’t see an option you liked? Build a new Race with 25 Build Points or a Class with 30, using the Build System (pp. 158-162). Keep it to yourself or share it so other crawlers can use it.</p>
    ${workshop.error ? `<p class="error" role="alert">${esc(workshop.error)}</p>` : ''}
    ${mineSection(state)}
    ${publicSection(state)}
    <div class="actions"><div><button class="secondary" data-nav="raceclass">Back to Race & Class</button></div></div>`;
}

// --- Editor ------------------------------------------------------------------

function optionSelect(row, i, section, kind) {
  const detriment = section === 'detriments';
  const options = optionsFor(kind, detriment);
  const group = (label, items) => (items.length ? `<optgroup label="${esc(label)}">${items.map((x) => `<option value="${x.id}" ${x.id === row.option ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</optgroup>` : '');
  const tierGroups = tiersFor(detriment).map(([id, label, cost]) => group(`${label} · ${cost} Build Point${cost === 1 ? '' : 's'}${detriment ? ' gained' : ''}`, options.filter((x) => x.tier === id)));
  return `<select data-build-row="${section}|${i}|option" aria-label="${detriment ? 'Detriment' : 'Benefit'} ${i + 1}">
    ${detriment ? group('Penalties', options.filter((x) => x.pool)) : ''}
    ${tierGroups.join('')}
    ${group('Your own', options.filter((x) => x.id === 'custom'))}
  </select>`;
}

// --- Picking Skills and Stats ------------------------------------------------------
// A row that takes several Skills or Stats adds them one at a time from a
// dropdown, and lists what it has underneath; clicking one removes it. The
// Skill dropdown can be narrowed to one kind of Skill, Spells or a Stat, and
// a thematically linked group can add everything shown at once. Groups leave
// out what can't be in a group.

const pickTitle = (text) => text.toLowerCase().replace(/(^|[\s&-])\w/g, (c) => c.toUpperCase());
const pickSection = (skill) => (skill.kind === 'spell' ? 'Spells' : pickTitle(skill.section || 'Other Skills'));
const PICK_SECTIONS = [...new Set(skillCatalog.filter((x) => x.kind === 'skill').map(pickSection))].sort();
const pickKey = (name) => (bookSkill(name)?.name || name).toLowerCase();

function pickFilterLabel(filter) {
  if (filter.startsWith('stat:')) return `${STAT_NAMES[filter.slice(5)]}-based`;
  if (filter.startsWith('section:')) return filter.slice(8);
  return filter === 'spell' ? 'Spells' : 'All';
}

function pickMatches(skill, filter) {
  if (filter.startsWith('stat:')) return skill.stat === filter.slice(5);
  if (filter.startsWith('section:')) return pickSection(skill) === filter.slice(8);
  return filter !== 'spell' || skill.kind === 'spell';
}

// How a row that takes several Skills picks them: how many, and from which.
function pickMode(row, section) {
  const option = (section === 'detriments' ? detrimentOption : benefitOption)(row.option);
  if (!option?.fields?.includes('skills')) return null;
  const group = Boolean(option.group) && option.id !== 'skillChoice';
  const [min, max] = Array.isArray(option.group) ? option.group : [option.id === 'skillChoice' ? 2 : 1, Infinity];
  return { group, min, max, catalog: group ? skillCatalog.filter(groupable) : skillCatalog };
}

const pickFilter = (key) => workshop.pickers[key] || 'all';

function pickNeed({ min, max }) {
  if (max === Infinity) return min > 1 ? `needs ${min} or more` : '';
  return min === 1 ? `up to ${max}` : `needs ${min}–${max}`;
}

// Skills grouped by kind, for a <select>.
function pickSkillOptions(list, chosen = '') {
  const sections = new Map();
  list.forEach((x) => sections.set(pickSection(x), [...(sections.get(pickSection(x)) || []), x]));
  return [...sections].sort(([a], [b]) => a.localeCompare(b)).map(([label, items]) => `<optgroup label="${esc(label)}">${items
    .map((x) => `<option value="${esc(x.name)}" ${chosen && pickKey(chosen) === x.name.toLowerCase() ? 'selected' : ''}>${esc(x.name)}${x.stat && x.stat !== 'None' ? ` (${x.stat})` : ''}${x.passive ? ' · Passive' : ''}</option>`).join('')}</optgroup>`).join('');
}

function skillSelect(row, i, section) {
  const known = !row.skill || bookSkill(row.skill);
  return `<label class="field">${section === 'detriments' ? 'Skill' : 'Skill or Spell'}<select data-build-row="${section}|${i}|skill">
    <option value="" ${row.skill ? '' : 'selected'}>Choose…</option>
    ${known ? '' : `<option value="${esc(row.skill)}" selected>${esc(row.skill)} (not in the book)</option>`}
    ${pickSkillOptions(skillCatalog, row.skill)}</select></label>`;
}

function skillsPicker(row, i, section) {
  const mode = pickMode(row, section);
  const key = `${section}|${i}`;
  const filter = pickFilter(key);
  const have = new Set(row.skills.map(pickKey));
  const full = have.size >= mode.max;
  const need = pickNeed(mode);
  const available = mode.catalog.filter((x) => pickMatches(x, filter) && !have.has(x.name.toLowerCase()));
  const fits = have.size + available.length <= mode.max;
  const filters = [
    `<option value="all" ${filter === 'all' ? 'selected' : ''}>All kinds</option>`,
    `<optgroup label="Kind">${[...PICK_SECTIONS, ...(mode.group ? [] : ['Spells'])].map((x) => {
      const value = x === 'Spells' ? 'spell' : `section:${x}`;
      return `<option value="${esc(value)}" ${filter === value ? 'selected' : ''}>${esc(x)}</option>`;
    }).join('')}</optgroup>`,
    `<optgroup label="Stat">${STATS.map((s) => `<option value="stat:${s}" ${filter === `stat:${s}` ? 'selected' : ''}>${STAT_NAMES[s]}-based</option>`).join('')}</optgroup>`,
  ].join('');
  const chips = row.skills.map((name) => `<button type="button" class="chip" data-build-unpick="${key}|${esc(name)}" aria-label="Remove ${esc(name)}" title="Remove">${esc(bookSkill(name)?.name || name)} <span aria-hidden="true">×</span></button>`).join('');
  const bad = have.size < mode.min || have.size > mode.max;
  return `<div class="field build-wide pick">
    <span class="pick-label">${mode.group ? 'Skills in the group' : 'Skills to choose from'}</span>
    <div class="pick-tools">
      <select data-build-pick-filter="${key}" aria-label="Show which Skills">${filters}</select>
      <select data-build-pick="${key}" aria-label="Add a Skill" ${full || !available.length ? 'disabled' : ''}>
        <option value="">${full ? `Has ${mode.max}, the most it can` : available.length ? `Add a Skill (${available.length})…` : 'None left to add'}</option>
        ${pickSkillOptions(full ? [] : available)}</select>
      <button type="button" class="secondary" data-build-pick-all="${key}" ${available.length && fits ? '' : 'disabled'}
        ${available.length && !fits ? `title="That would be more than ${mode.max}"` : ''}>Add all ${available.length || ''} shown</button>
    </div>
    <div class="pick-chips"><span class="pick-count ${bad ? 'error' : ''}">${have.size} chosen${need ? ` · ${need}` : ''}${have.size ? ' · click one to remove it' : ''}</span>${chips}</div>
    ${mode.group ? '<p class="muted micro">Passive Skills, Spells and Racial Skills can’t be in a thematically linked group, so they aren’t offered.</p>' : ''}
  </div>`;
}

function statsPicker(row, i, section) {
  const key = `${section}|${i}`;
  const sign = section === 'detriments' ? '−' : '+';
  const spread = statSpread(row);
  const chips = Object.entries(spread).map(([s, n]) => `<button type="button" class="chip" data-build-stat-remove="${key}|${s}" aria-label="Remove 1 from ${STAT_NAMES[s]}" title="Remove 1">${sign}${n} ${STAT_NAMES[s]} <span aria-hidden="true">×</span></button>`).join('');
  return `<div class="field build-wide pick">
    <span class="pick-label">Stats</span>
    <div class="pick-tools"><select data-build-stat-add="${key}" aria-label="Add ${sign}1 to a Stat">
      <option value="">Add ${sign}1 to a Stat…</option>${STATS.map((s) => `<option value="${s}">${STAT_NAMES[s]}${spread[s] ? ` (now ${sign}${spread[s]})` : ''}</option>`).join('')}</select></div>
    <div class="pick-chips">${chips ? `<span class="pick-count">click one to remove 1</span>${chips}` : '<span class="pick-count error">None chosen</span>'}</div>
  </div>`;
}

function rowFields(row, i, section) {
  const option = (section === 'detriments' ? detrimentOption : benefitOption)(row.option);
  const fields = option?.fields || [];
  const name = (field) => `data-build-row="${section}|${i}|${field}"`;
  const out = [];
  if (fields.includes('stats')) out.push(statsPicker(row, i, section));
  if (fields.includes('skill')) out.push(skillSelect(row, i, section));
  if (fields.includes('stat')) out.push(`<label class="field">Stat<select ${name('stat')}>${STATS.map((s) => `<option value="${s}" ${s === row.stat ? 'selected' : ''}>${STAT_NAMES[s]}</option>`).join('')}</select></label>`);
  if (fields.includes('amount')) out.push(`<label class="field build-amount">${section === 'detriments' ? 'Penalty' : 'Times'}<input type="number" min="1" max="20" ${name('amount')} value="${esc(row.amount)}"></label>`);
  if (fields.includes('club')) out.push(`<label class="field">Club<select ${name('club')}>${CLUBS.map((c) => `<option ${c === row.club ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`);
  if (fields.includes('tier')) out.push(`<label class="field">Tier<select ${name('tier')}>${tiersFor(section === 'detriments').map(([id, label, cost]) => `<option value="${id}" ${id === row.tier ? 'selected' : ''}>${label} (${cost})</option>`).join('')}</select></label>`);
  if (fields.includes('text')) out.push(`<label class="field build-wide">Describe it<input ${name('text')} value="${esc(row.text)}" maxlength="${TEXT_MAX}"></label>`);
  if (fields.includes('detail')) {
    const group = option?.group && option.id !== 'skillChoice';
    out.push(`<label class="field build-wide">${group ? 'Group name' : 'Details'} <span class="optional">${group ? 'e.g. Bashing Weapon' : 'optional'}</span><input ${name('detail')} value="${esc(row.detail)}" maxlength="${TEXT_MAX}"></label>`);
  }
  if (fields.includes('skills')) out.push(skillsPicker(row, i, section));
  return out.join('');
}

function rowCostText(row, section) {
  const option = (section === 'detriments' ? detrimentOption : benefitOption)(row.option);
  if (option?.pool) return `−${Math.max(0, Number(row.amount) || 0)} (1 BP per −2)`;
  const cost = rowCost(row, section === 'detriments');
  return `${section === 'detriments' ? '+' : ''}${cost} BP`;
}

function rowEditor(row, i, section, kind) {
  return `<div class="build-row">
    <div class="build-row-head">${optionSelect(row, i, section, kind)}<span class="build-cost" data-live="cost-${section}-${i}">${rowCostText(row, section)}</span>
      <button type="button" class="secondary danger-button" data-build-remove="${section}|${i}" aria-label="Remove ${section === 'detriments' ? 'detriment' : 'benefit'} ${i + 1}">Remove</button></div>
    <div class="build-fields">${rowFields(row, i, section)}</div>
  </div>`;
}

export function buildEditorView() {
  const draft = workshop.draft;
  if (!draft) return workshopView({});
  const kind = draft.kind;
  const points = buildPoints(draft);
  const issues = buildErrors(draft);
  const entry = buildEntry(draft);
  const isNew = !workshop.editing?.id;
  return `<p class="eyebrow">CUSTOM ${kind === 'class' ? 'CLASS' : 'RACE'} · BUILD SYSTEM</p>
    <h1>${isNew ? `New custom ${kindName(kind)}` : `Edit ${esc(entry.name || kindName(kind))}`}</h1>
    <p class="intro">Spend ${BUILD_POINTS[kind]} ${kindName(kind)} Build Points on benefits. Detriments are optional and add up to ${MAX_DETRIMENT_POINTS} more. Leftover points are lost. Benefits without numbers on the sheet, such as conditions or once-a-day abilities, are listed in the sheet’s notes; agree on the details with your GM.</p>
    <section class="panel">
      <div class="panel-head"><h2>Concept</h2>${'<span class="ref">pp. 158-159</span>'}</div>
      <div class="fields">
        <label class="field">Name<input data-build-field="name" value="${esc(draft.name)}" maxlength="${NAME_MAX}" required><small>Names are checked for slurs, sexual terms and strong profanity, and can’t reuse a book Race or Class.</small></label>
        <label class="field">Description <span class="optional">optional</span><textarea data-build-field="description" rows="3" maxlength="${DESCRIPTION_MAX}">${esc(draft.description)}</textarea></label>
      </div>
      <label class="check"><input type="checkbox" data-build-field="earth" ${draft.earth ? 'checked' : ''}> <span>${kind === 'race'
        ? 'Earth Race <small class="muted">(from Earth, including folklore, myth and legend: gets a Silver Earth Box and access to Earth Classes; unchecked is an Alien Race)</small>'
        : 'Earth Class <small class="muted">(needs an Earth Race; gets a Silver Earth Box with a guaranteed Earth Hobby Potion)</small>'}</span></label>
      ${kind === 'class' ? `<fieldset class="build-types"><legend>Class Type</legend>${CLASS_TYPES.map((t) => `<label class="check"><input type="checkbox" data-build-field="classTypes:${esc(t)}" ${draft.classTypes.includes(t) ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}</fieldset>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Benefits</h2><span class="ref">pp. 159-160</span></div>
      <p class="build-meter ${points.left < 0 ? 'error' : ''}" data-live="meter" aria-live="polite"><strong>${points.spent}</strong> of <strong>${points.budget}</strong> Build Points spent${points.earned ? ` (${points.base} + ${points.earned} from detriments)` : ''} · ${points.left >= 0 ? `${points.left} left` : `${-points.left} over`}</p>
      ${draft.benefits.map((row, i) => rowEditor(row, i, 'benefits', kind)).join('')}
      <button type="button" class="secondary" data-build-add="benefits">Add a benefit</button>
      <p class="muted micro">You can take a benefit more than once where it does something, such as Stat and Skill bonuses. DR Buffs are limited to +3.${kind === 'class' ? ` A Class can have at most ${PASSIVE_RANK_LIMIT} points of Passive Skills.` : ''} Passive Skills and Spells aren’t part of thematically linked groups.</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Detriments <span class="optional">optional</span></h2><span class="ref">p. 161</span></div>
      <p class="muted" data-live="detriment-points">${points.rawDetriments} Build Point${points.rawDetriments === 1 ? '' : 's'} from detriments${points.rawDetriments > MAX_DETRIMENT_POINTS ? `, but only ${MAX_DETRIMENT_POINTS} count` : ''}.</p>
      ${draft.detriments.map((row, i) => rowEditor(row, i, 'detriments', kind)).join('')}
      <button type="button" class="secondary" data-build-add="detriments">Add a detriment</button>
      <p class="muted micro">A Skill penalty needs the crawler to have that Skill at that Rank or higher when they take this ${kindName(kind)}.</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Preview</h2></div>
      <div data-live="preview"><article class="rc-card"><div class="rc-head"><strong>${esc(entry.name || `Unnamed ${kindName(kind)}`)}</strong><span class="tag">${draft.earth ? 'Earth' : kind === 'race' ? 'Alien' : 'Any Race'}</span></div>
        ${entry.prerequisite ? `<p class="muted micro">${esc(entry.prerequisite)}</p>` : ''}${benefitList(entry)}</article>
      ${issues.length ? `<ul class="error-list">${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="success">This build follows the Build System.</p>'}</div>
    </section>
    <section class="panel">
      <label class="check"><input type="checkbox" data-build-field="public" ${workshop.editing?.public ? 'checked' : ''}> <span>Share it publicly <small class="muted">(everyone can see it with your profile name, and use it for their crawlers)</small></span></label>
      ${workshop.error ? `<p class="error" role="alert">${esc(workshop.error)}</p>` : ''}
      <div class="actions"><div><button type="button" class="secondary" data-build-cancel>Cancel</button></div>
        <div class="action-right"><button type="button" class="primary" data-build-save data-live="save" ${issues.length || workshop.busy ? 'disabled' : ''}>${isNew ? `Save ${kindName(kind)}` : 'Save changes'}</button></div></div>
    </section>`;
}

// --- Events ------------------------------------------------------------------

function startEditing(build, editing) {
  workshop.draft = normalizeBuild(build);
  workshop.editing = editing;
  workshop.error = '';
  workshop.pickers = {};
}

function pickRow(key) {
  const [section, index] = key.split('|');
  const row = workshop.draft?.[section]?.[Number(index)];
  return row ? { row, mode: pickMode(row, section), filter: pickFilter(key) } : null;
}

function pickSkill(key, name, on) {
  const found = pickRow(key);
  if (!found?.mode || !name) return;
  const rest = found.row.skills.filter((x) => pickKey(x) !== pickKey(name));
  found.row.skills = on && rest.length < found.mode.max ? [...rest, name] : rest;
}

function pickAll(key) {
  const found = pickRow(key);
  if (!found?.mode) return;
  const { row, mode, filter } = found;
  const have = new Set(row.skills.map(pickKey));
  const adding = mode.catalog.filter((x) => pickMatches(x, filter) && !have.has(x.name.toLowerCase())).map((x) => x.name);
  if (!adding.length || have.size + adding.length > mode.max) return;
  row.skills = [...row.skills, ...adding];
  // A group made from one kind or Stat can take its name.
  if (mode.group && filter !== 'all' && !String(row.detail || '').trim()) row.detail = pickFilterLabel(filter).replace(/ Skills$/, '');
}

function changeStat(key, stat, by) {
  const found = pickRow(key);
  if (!found || !STATS.includes(stat)) return;
  const stats = { ...statSpread(found.row) };
  stats[stat] = Math.max(0, Math.min(20, (stats[stat] || 0) + by));
  if (!stats[stat]) delete stats[stat];
  found.row.stats = stats;
}

function setRowField(row, field, value, section) {
  if (field === 'option') {
    const fresh = newRow(value);
    // Keep what still applies when switching between options.
    Object.assign(row, fresh, { stat: row.stat, stats: row.stats, skill: row.skill, skills: row.skills, amount: row.amount });
    if (value === 'custom') row.tier = 'minor';
    return;
  }
  if (field === 'skills') row.skills = value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  else if (field === 'amount') row.amount = value === '' ? '' : Number(value);
  else row[field] = value;
  if (section === 'detriments' && field === 'tier' && !tiersFor(true).some(([id]) => id === value)) row.tier = 'minor';
}

function updateDraft(target) {
  const draft = workshop.draft;
  if (!draft) return false;
  if (target.dataset.buildField) {
    const field = target.dataset.buildField;
    if (field === 'earth') draft.earth = target.checked;
    else if (field === 'public') workshop.editing.public = target.checked;
    else if (field.startsWith('classTypes:')) {
      const type = field.slice('classTypes:'.length);
      draft.classTypes = target.checked ? [...new Set([...draft.classTypes, type])] : draft.classTypes.filter((x) => x !== type);
    } else draft[field] = target.value;
    return true;
  }
  if (target.dataset.buildRow) {
    const [section, index, field] = target.dataset.buildRow.split('|');
    const row = draft[section]?.[Number(index)];
    if (row) setRowField(row, field, target.value, section);
    if (field === 'option') delete workshop.pickers[`${section}|${index}`];
    return true;
  }
  return false;
}

// Redraw only the parts marked data-live (points, costs, preview, errors,
// Save). Redrawing the whole editor while typing would lose focus, and on
// blur would swallow a click on Save.
function refreshLive() {
  const fresh = document.createElement('div');
  fresh.innerHTML = buildEditorView();
  document.querySelectorAll('#main [data-live]').forEach((old) => {
    const next = fresh.querySelector(`[data-live="${old.dataset.live}"]`);
    if (next) old.replaceWith(next);
  });
}

const redraws = (target) => target.type === 'checkbox' || target.tagName === 'SELECT';

export function workshopInput(event) {
  const target = event.target;
  if (redraws(target) || !updateDraft(target)) return false;
  refreshLive();
  return true;
}

// Selects and checkboxes can change which fields a row has: redraw it all.
export function workshopChange(event, ctx) {
  const target = event.target;
  if (target.matches('[data-build-search]')) {
    workshop.query = target.value.trim();
    loadWorkshop().then(ctx.renderMain);
    return true;
  }
  // A dropdown that adds a Skill or Stat goes back to its prompt, with the
  // focus kept on it to add another.
  const pick = ['buildPickFilter', 'buildPick', 'buildStatAdd'].find((x) => target.dataset[x]);
  if (pick) {
    const key = target.dataset[pick];
    if (pick === 'buildPickFilter') workshop.pickers[key] = target.value;
    else if (pick === 'buildPick') pickSkill(key, target.value, true);
    else changeStat(key, target.value, 1);
    ctx.renderMain();
    document.querySelector(`#main [data-${pick.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${CSS.escape(key)}"]`)?.focus();
    return true;
  }
  if (!target.matches('[data-build-field], [data-build-row]')) return false;
  if (redraws(target)) {
    updateDraft(target);
    ctx.renderMain();
  }
  return true;
}

async function saveDraft(ctx) {
  const draft = workshop.draft;
  if (buildErrors(draft).length) return ctx.renderMain();
  const entry = buildEntry(draft);
  const body = { kind: draft.kind, name: entry.name, public: Boolean(workshop.editing.public), data: { ...draft, name: entry.name } };
  workshop.busy = true;
  workshop.error = '';
  ctx.renderMain();
  try {
    const id = workshop.editing.id;
    const saved = await api(id ? `builds/${id}` : 'builds', { method: id ? 'PUT' : 'POST', body });
    workshop.draft = null;
    workshop.editing = null;
    await loadWorkshop();
    // The open crawler follows edits to a build it uses.
    if (id && snapshotOf(ctx.state, saved.kind)?.id === saved.id) ctx.useBuild(saved, { quiet: true });
    ctx.setNotice(`Saved ${saved.name}${saved.public ? ' and shared it' : ''}.`, 4000);
    ctx.navigate('workshop');
  } catch (error) {
    workshop.error = error.message;
  } finally {
    workshop.busy = false;
    ctx.renderMain();
  }
}

// Clicks in the workshop and the editor; true if handled.
export async function workshopClick(event, ctx) {
  const target = event.target.closest('[data-build-new], [data-build-edit], [data-build-delete], [data-build-copy], [data-build-use], [data-build-add], [data-build-remove], [data-build-save], [data-build-cancel], [data-build-public-kind], [data-build-unpick], [data-build-pick-all], [data-build-stat-remove]');
  if (!target) return false;
  const data = target.dataset;
  if (data.buildNew) {
    startEditing(newBuild(data.buildNew), { id: null, public: false });
    ctx.navigate('build-edit');
  } else if (data.buildEdit) {
    const build = findBuild(Number(data.buildEdit));
    if (build) {
      startEditing(build.data, { id: build.id, public: build.public });
      ctx.navigate('build-edit');
    }
  } else if (data.buildCopy) {
    const build = findBuild(Number(data.buildCopy));
    if (!build) return true;
    try {
      const copy = await api('builds', { method: 'POST', body: { kind: build.kind, name: build.name, public: false, data: build.data } });
      await loadWorkshop();
      ctx.setNotice(`Copied ${copy.name} to your builds. It’s private until you share it.`, 4000);
    } catch (error) {
      ctx.setNotice(error.message, 6000);
    }
    ctx.renderMain();
  } else if (data.buildDelete) {
    const build = findBuild(Number(data.buildDelete));
    if (!build || !confirm(`Delete ${build.name}? Crawlers already using it keep their copy. This can’t be undone.`)) return true;
    try {
      await api(`builds/${build.id}`, { method: 'DELETE' });
      await loadWorkshop();
      ctx.setNotice(`Deleted ${build.name}.`);
    } catch (error) {
      ctx.setNotice(error.message, 6000);
    }
    ctx.renderMain();
  } else if (data.buildUse) {
    const build = findBuild(Number(data.buildUse));
    if (build) ctx.useBuild(build);
  } else if (data.buildAdd) {
    const section = data.buildAdd;
    workshop.draft[section].push(newRow(section === 'detriments' ? 'statPenalty' : 'stat'));
    ctx.renderMain();
    const rows = document.querySelectorAll('.build-row select[data-build-row$="|option"]');
    [...rows].filter((x) => x.dataset.buildRow.startsWith(section)).at(-1)?.focus();
  } else if (data.buildRemove) {
    const [section, index] = data.buildRemove.split('|');
    workshop.draft[section].splice(Number(index), 1);
    workshop.pickers = {}; // they're kept by row number
    ctx.renderMain();
  } else if (data.buildUnpick) {
    const [section, index, ...name] = data.buildUnpick.split('|');
    pickSkill(`${section}|${index}`, name.join('|'), false);
    ctx.renderMain();
  } else if (data.buildPickAll) {
    pickAll(data.buildPickAll);
    ctx.renderMain();
  } else if (data.buildStatRemove) {
    const [section, index, stat] = data.buildStatRemove.split('|');
    changeStat(`${section}|${index}`, stat, -1);
    ctx.renderMain();
  } else if ('buildSave' in data) {
    await saveDraft(ctx);
  } else if ('buildCancel' in data) {
    workshop.draft = null;
    workshop.editing = null;
    workshop.error = '';
    ctx.navigate('workshop');
  } else if (data.buildPublicKind) {
    workshop.publicKind = data.buildPublicKind;
    await loadWorkshop();
    ctx.renderMain();
  }
  return true;
}
