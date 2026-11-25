import {
  backgrounds, weapons, spells, handToHand, stats, statNames, storyOptions,
  initialState, normalizeState, selectedSkills, selectedNames, allSkills, allAttacks,
  attackRowsForSheet, tickedAttacks, derived, carriedItems, hotlist, errors, missingDetails,
  stepCompletion, sizeNames, statMod, statValidationErrors, firstIncompleteBackgroundStage, backgroundStageComplete,
  findRace, findClass, eligibleRaces, eligibleClasses, raceClassRequirementIssues,
  entryEffects, splitValues, unenhancedStats, enhancedStats, currentFloor, SELECTION_RANK_CAP,
  skillUpReport, levelPoints, rankLimit, CUSTOM_SKILL_CHECKS, LEVEL_STAT_POINTS, RANK_CAP, EXTENDED_RANK_CAP, HIGH_RANK_FLOOR,
  PORTRAIT_MAX_UPLOAD, PORTRAIT_MAX_CHARS,
} from './rules.js';
import { races, classes, skillCatalog } from './races-classes.js';
import { buildEntry } from './builds.js';
import { attacks, damageEffects } from './details.js';
import { downloadCharacterSheet } from './pdf.js';
import {
  GEAR_SLOTS, ITEM_KINDS, ACCESSORY_TYPES, STAT_KEYS, CLOTHING_SLOTS, newGearItem, normalizeGearItem, gearItems, gearName,
  isEquipped, slotUsage, slotCount, bonusText, equipmentErrors, gearStatBonuses, SKILL_BONUS_TYPES,
  CUSTOM_KINDS, quickGearItem, stripPlus, damageBonusProblem,
} from './equipment.js';
import {
  account, accountBar, accountView, profileView, refreshAccount, signOut, saveCharacter, openCharacter,
  deleteCharacter, setLink, linkedId, saveStatus, verified, workshopLink, workshopLockedMessage, canStartNewCrawler, submitAccountForm, accountAction, isAccountForm, isAccountAction,
} from './account.js';
import { aboutView } from './about.js';
import { changelogView, VERSION } from './changelog.js';
import { newPartyBuff, normalizePartyBuff, buffLabel, activePartyBuffs, partyErrors, buffErrors, MAX_PARTY_BUFFS, MAX_ACTIVE_BUFFS } from './party.js';
import { workshop, loadWorkshop, workshopView, buildEditorView, workshopClick, workshopChange, workshopInput, snapshot } from './workshop.js';

const STORAGE_KEY = 'dcc-crawler-builder-v1';
const steps = [
  ['identity', 'Identity'],
  ['backgrounds', 'Backgrounds'],
  ['combat', 'Combat'],
  ['stats', 'Stats'],
  ['story', 'Story'],
  ['gear', 'Starting Gear'],
  ['hotlist', 'Hotlist'],
  ['attacks', 'Sheet Attacks'],
  ['raceclass', 'Race & Class'],
  ['advancement', 'Level & Skills'],
  ['equipment', 'Equipment'],
  ['party', 'Party (optional)'],
  ['review', 'Review & PDF'],
];

let state = loadState();
let activeStep = 'identity';
let activeBackgroundStage = 0;
let exporting = false;
let draggedHotlistSlot = null;
let touchHotlistDrag = null;
// Unsaved "next level" and "new skill-up" forms on the Level & Skills step.
let levelDraft = { floor: '', stats: {} };
let skillUpDraft = { skill: '', ranks: '1', floor: '', how: 'Skill Advancement Check', note: '', customName: '', customStat: 'None', customCheck: 'Unopposed', customDescription: '' };
// The draft's Skill select value for a Skill that isn't in the book.
const CUSTOM_SKILL = '__custom__';
const SKILL_UP_METHODS = ['Skill Advancement Check', 'Training', 'Potion or item', 'Other'];

const $ = (selector) => document.querySelector(selector);
const main = $('#main');
const nav = $('#steps');
const summary = $('#summary');
const notice = $('#notice');
const accountBarEl = $('#account-bar');

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : initialState();
  } catch {
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAccountBar();
}

function renderAccountBar() {
  accountBarEl.innerHTML = accountBar(state);
}

function setNotice(message, timeout = 2600) {
  notice.textContent = message;
  if (timeout) setTimeout(() => {
    if (notice.textContent === message) notice.textContent = '';
  }, timeout);
}

function setPath(path, value) {
  const parts = path.split('.');
  let cursor = state;
  // "buffDraft.<id>.…" edits an unsaved Party buff, not the crawler.
  const draft = parts[0] === 'buffDraft' ? buffDrafts.get(parts[1]) : null;
  if (draft) {
    parts.splice(0, 2);
    cursor = draft.buff;
  }
  while (parts.length > 1) {
    const key = parts.shift();
    cursor = cursor[key];
  }
  cursor[parts[0]] = value;
  if (!draft) saveState();
}

function navigate(step) {
  if (activeStep === 'party' && step !== 'party' && buffDrafts.size) {
    const unsaved = unsavedBuffs();
    if (unsaved.length && !confirm(`${unsaved.map((x) => buffLabel(x.buff) || 'A new Party buff').join(', ')} ${unsaved.length === 1 ? 'has' : 'have'} unsaved changes. Leave without saving?`)) return;
    buffDrafts.clear();
  }
  if (step !== 'identity') openedCrawler = false;
  if ((step === 'workshop' || step === 'build-edit') && !verified()) {
    setNotice(workshopLockedMessage(), 5000);
    return;
  }
  if (step === 'account' || step === 'profile' || step === 'workshop' || step === 'build-edit' || step === 'about' || step === 'changelog') {
    if (step === 'build-edit' && !workshop.draft) step = 'workshop';
    activeStep = step;
    render();
    if (step === 'workshop') loadWorkshop().then(() => { if (activeStep === 'workshop') renderMain(); });
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const targetIndex = steps.findIndex(([id]) => id === step);
  if (targetIndex === -1) return;
  const currentIndex = steps.findIndex(([id]) => id === activeStep);

  // Forward navigation cannot bypass required choices on the two multi-part
  // pages that have explicit progression validation. Going backward remains free.
  if (targetIndex > currentIndex && activeStep === 'backgrounds') {
    const missingStage = firstIncompleteBackgroundStage(state);
    if (missingStage !== -1) {
      activeBackgroundStage = missingStage;
      renderMain();
      renderNav();
      renderSummary();
      const stage = (backgrounds[state.kind] || [])[missingStage];
      setNotice(stage ? `Complete ${stage.name}: choose one background and exactly two Skills.` : 'Complete all background choices before continuing.');
      return;
    }
  }
  if (targetIndex > currentIndex && activeStep === 'stats') {
    const statIssues = statValidationErrors(state);
    if (statIssues.length) {
      renderMain();
      setNotice(statIssues[0]);
      return;
    }
  }

  activeStep = step;
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actions(previous, next, extra = '') {
  return `<div class="actions">
    <div>${previous ? `<button class="secondary" data-nav="${previous}">Back</button>` : ''}</div>
    <div class="action-right">${extra}${next ? `<button class="primary" data-nav="${next}">Continue</button>` : ''}</div>
  </div>`;
}

function sourceRef(text) {
  return `<span class="ref">${esc(text)}</span>`;
}

function hotlistAssignments() {
  const assignments = [];
  const push = (key, slot, label, setSlot) => {
    const n = Number(slot);
    if (!Number.isInteger(n) || n < 1 || n > 10) return;
    assignments.push({ key, slot: n, label, setSlot });
  };

  if (state.healSlot !== '') {
    push('heal', state.healSlot, 'Heal', (slot) => { state.healSlot = String(slot); });
  }
  if (state.combatType === 'spell' && state.combat) {
    if (state.spellSlot !== '') {
      push('spell', state.spellSlot, state.combat, (slot) => { state.spellSlot = String(slot); });
    }
    if (state.potionsSlot !== '') {
      push('potions', state.potionsSlot, '5 Standard Mana Potions', (slot) => { state.potionsSlot = String(slot); });
    }
  }
  if (String(state.weaponLocation || '').startsWith('hotlist:')) {
    const weaponName = state.customWeapon.trim()
      ? `${state.customWeapon.trim()} (${state.combat})`
      : state.combat || 'Starting weapon';
    push('weapon', String(state.weaponLocation).split(':')[1], weaponName, (slot) => {
      state.weaponLocation = `hotlist:${slot}`;
    });
  }
  (state.items || []).forEach((item) => {
    if (!String(item.location || '').startsWith('hotlist:')) return;
    push(`item:${item.id}`, String(item.location).split(':')[1], item.name || 'Unnamed item', (slot) => {
      item.location = `hotlist:${slot}`;
    });
  });
  gearItems(state).forEach((item) => {
    if (!String(item.location || '').startsWith('hotlist:')) return;
    push(`gear:${item.id}`, String(item.location).split(':')[1], gearName(item), (slot) => {
      item.location = `hotlist:${slot}`;
    });
  });
  return assignments;
}

function hotlistOwner(slot, excludingKey = '') {
  const n = Number(slot);
  return hotlistAssignments().find((entry) => entry.slot === n && entry.key !== excludingKey) || null;
}

function hotlistSlotFromValue(value) {
  const text = String(value ?? '');
  if (text.startsWith('hotlist:')) return Number(text.split(':')[1]);
  const n = Number(text);
  return Number.isInteger(n) ? n : null;
}

function warnIfHotlistCollision(value, excludingKey = '') {
  const slot = hotlistSlotFromValue(value);
  if (!slot) return false;
  const owner = hotlistOwner(slot, excludingKey);
  if (!owner) return false;
  setNotice(`Hotlist slot ${slot} is already being used by ${owner.label}. Choose another slot.`, 5200);
  return true;
}

function hotlistSlotOptions(selected, currentKey = '', prefix = 'Slot') {
  return Array.from({ length: 10 }, (_, i) => {
    const slot = i + 1;
    const owner = hotlistOwner(slot, currentKey);
    const suffix = owner ? ` — in use: ${owner.label}` : '';
    return `<option value="${slot}" ${String(selected) === String(slot) ? 'selected' : ''}>${prefix} ${slot}${esc(suffix)}</option>`;
  }).join('');
}

function reorderHotlist(fromSlot, toSlot) {
  const from = Number(fromSlot);
  const to = Number(toSlot);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || from > 10 || to < 1 || to > 10 || from === to) return false;
  const entries = hotlistAssignments();
  const moving = entries.find((entry) => entry.slot === from);
  if (!moving) return false;

  // Treat the ten Hotlist slots as a real ordered list: the dragged slot moves
  // to the target position and every intervening occupied entry shifts by one.
  // Empty slots shift too conceptually, so gaps remain predictable.
  if (from < to) {
    entries.filter((entry) => entry.key !== moving.key && entry.slot > from && entry.slot <= to)
      .forEach((entry) => entry.setSlot(entry.slot - 1));
  } else {
    entries.filter((entry) => entry.key !== moving.key && entry.slot >= to && entry.slot < from)
      .forEach((entry) => entry.setSlot(entry.slot + 1));
  }
  moving.setSlot(to);
  saveState();
  return true;
}

function renderNav() {
  const done = stepCompletion(state);
  nav.innerHTML = `<div class="nav-heading">CRAWLER CREATION</div>${steps.map(([id, label], index) => {
    const isDone = done[id];
    return `<button type="button" data-nav="${id}" class="${id === activeStep ? 'active' : ''} ${isDone ? 'done' : ''}">
      <span>${isDone ? '✓' : String(index + 1).padStart(2, '0')}</span>${esc(label)}
    </button>`;
  }).join('')}
  <div class="nav-note">First draft: every book choice is player-selected. Book-accurate dice randomizers are intentionally deferred.</div>`;
}

function renderSummary() {
  const d = derived(state);
  const mods = d.mods;
  const completion = stepCompletion(state);
  const completedCount = Object.entries(completion).filter(([key, value]) => key !== 'review' && value).length;
  const totalSteps = steps.length - 1;
  const origin = state.kind === 'human' ? 'Human' : state.kind === 'animal' ? state.species || 'Animal' : '—';
  const race = [state.race || origin, state.className].filter(Boolean).join(' · ');
  summary.innerHTML = `
    <div class="aside-top">LIVE CRAWLER FILE</div>
    <div class="crawler-name">${esc(state.name || 'Unnamed Crawler')}</div>
    <div class="muted micro">#${esc(state.number)} · ${esc(race)}</div>
    <div class="stat-strip">${stats.map((key) => `<div><small>${key.toUpperCase()}</small><b>${d.statText[key] || '—'}</b><span>${d.modText[key]}</span></div>`).join('')}</div>
    <dl>
      <div><dt>Health</dt><dd>${d.health ?? '—'}</dd></div>
      <div><dt>Mana</dt><dd>${d.manaText ?? d.maxMana ?? '—'}</dd></div>
      <div><dt>Evade</dt><dd>${d.evadeDex ? evadeText(d) : '—'}</dd></div>
      <div><dt>Move / Step</dt><dd>${d.move} / ${d.step} ft</dd></div>
      <div><dt>AI Favor</dt><dd>${d.aiFavor ?? '—'}</dd></div>
      <div><dt>Size</dt><dd>${esc(d.size || '—')}</dd></div>
      ${d.dr.total ? `<div><dt>DR</dt><dd>${d.dr.total}</dd></div>` : ''}
    </dl>
    <div class="divider"></div>
    <div class="muted micro">Progress ${completedCount}/${totalSteps}</div>
    <div class="meter ${completedCount === totalSteps ? 'ready' : ''}">${Array.from({ length: totalSteps }, (_, i) => `<i class="${i < completedCount ? 'filled' : ''}"></i>`).join('')}</div>
    ${state.combat ? `<span class="tag">${esc(state.combat)}</span>` : ''}
  `;
}

// "d20 + 2 + 1 + 1d4, with Advantage"
function evadeText(d) {
  const dice = d.evadeExtras.includes('+1d4') ? ' + 1d4' : '';
  return `d20 + ${d.evadeDex}${d.evadeBuff ? ` + ${d.evadeBuff}` : ''}${dice}${d.evadeExtras.includes('Adv') ? ', with Advantage' : ''}`;
}

// Set when a saved crawler is opened from My Crawlers; Identity says so
// until the player moves to another page.
let openedCrawler = false;

function identityStep() {
  const animal = state.kind === 'animal';
  return `
    ${openedCrawler ? `<div class="callout success-panel opened-callout" role="status"><strong>${esc(state.name || 'Your crawler')} is open.</strong> Click any step in the sidebar to edit that part of the sheet, then Save to keep your changes in your account.</div>` : ''}
    <p class="eyebrow">STEP 1 · IDENTITY & ORIGIN</p>
    <h1>Who entered the dungeon?</h1>
    <p class="intro">Name the crawler, then choose Human or the optional earth-animal path. Your crawler number is assigned once and cannot be rerolled or edited.</p>
    <section class="panel">
      <div class="panel-head"><h2>Identity</h2>${sourceRef('Character creation pp. 102-103')}</div>
      <div class="fields">
        <label class="field"><span class="field-label">Crawler name</span><input data-bind="name" value="${esc(state.name)}" maxlength="60" autocomplete="off"></label>
        <label class="field"><span class="field-label">Gender / pronouns <span class="optional">optional</span></span><input data-bind="pronouns" value="${esc(state.pronouns)}" maxlength="50" autocomplete="off"><small>The rules explicitly allow this to be left blank.</small></label>
      </div>
      <label class="field">Assigned crawler number<input value="${esc(state.number)}" readonly aria-readonly="true"><small>Automatically generated once: 50,000-12,900,000. Starting a completely new crawler generates a new number.</small></label>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Portrait <span class="optional">optional</span></h2></div>
      <div class="portrait-box">
        <div class="portrait-preview">${state.portrait ? `<img src="${esc(state.portrait)}" alt="Portrait of ${esc(state.name || 'your crawler')}">` : 'No portrait'}</div>
        <div class="portrait-actions">
          <label class="field"><span class="field-label">${state.portrait ? 'Replace the portrait' : 'Add a portrait'}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-portrait></label>
          ${state.portrait ? '<button type="button" class="secondary small" data-portrait-remove>Remove portrait</button>' : ''}
          <small class="muted">JPEG, PNG, WebP or GIF up to ${PORTRAIT_MAX_UPLOAD / 1024 / 1024} MB. It's shrunk to fit the sheet's Portrait box.</small>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Origin</h2>${sourceRef('p. 102')}</div>
      <div class="cards">
        <button type="button" class="choice" data-origin="human" aria-pressed="${state.kind === 'human'}"><span class="symbol">H</span><strong>Human</strong><small>Normal starting path. Starts with AI Favor 1 and is typically Medium (4).</small></button>
        <button type="button" class="choice" data-origin="animal" aria-pressed="${state.kind === 'animal'}"><span class="symbol">A</span><strong>Earth-based animal</strong><small>Optional path: check with your GM. Starting AI Favor is spent, and a group can have only one animal crawler.</small></button>
      </div>
      ${animal ? `<div class="animal-fields">
        <div class="fields">
          <label class="field">Animal species<input data-bind="species" value="${esc(state.species)}" maxlength="50" placeholder="Cat, raccoon, dog, goat…"></label>
          <label class="field">Size<select data-bind="size" data-rerender="true"><option value="">Choose size</option>${Object.entries(sizeNames).map(([value, label]) => `<option value="${value}" ${String(state.size) === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select><small>Standard animal creation allows sizes 2-4.</small></label>
        </div>
        <div class="callout">The Enhanced Pet Biscuit / later Race transformation discussion does not supply a complete starting transformation builder here. This first draft records the earth-animal crawler you are creating.</div>
      </div>` : ''}
    </section>
    ${actions(null, 'backgrounds')}
  `;
}

function stageStatus(stageIndex) {
  return backgroundStageComplete(state, stageIndex);
}

function backgroundsStep() {
  if (!state.kind) {
    return `<p class="eyebrow">STEP 2 · BACKGROUNDS</p><h1>Choose an origin first.</h1><p class="intro">Human and animal crawlers use different background tables.</p>${actions('identity', null, '<button class=\"primary\" data-action=\"continue-backgrounds\">Continue</button>')}`;
  }
  const stages = backgrounds[state.kind];
  const stage = stages[activeBackgroundStage];
  const selection = state.backgrounds[activeBackgroundStage];
  const selectedOption = stage.options[selection.option];
  const unavailable = selectedNames(state, activeBackgroundStage);
  return `
    <p class="eyebrow">STEP 2 · BACKGROUND SKILLS</p>
    <h1>Your previous life left marks.</h1>
    <p class="intro">Choose one background in each life stage, then choose exactly two of its three Skills. The book offers dice as an alternative; this first draft intentionally leaves all of these choices in your hands.</p>
    <div class="stage-tabs">${stages.map((item, index) => `<button type="button" data-stage="${index}" class="${index === activeBackgroundStage ? 'active' : ''}">${stageStatus(index) ? '✓ ' : ''}${esc(item.name)} · Rank ${item.rank}</button>`).join('')}</div>
    <section class="panel">
      <div class="panel-head"><h2>${esc(stage.name)} background</h2>${sourceRef(`Table ${stage.table} · p. ${stage.page}`)}</div>
      <div class="bg-grid">${stage.options.map((option, index) => `<button type="button" class="choice compact" data-background="${index}" aria-pressed="${selection.option === index}"><strong>${esc(option.name)}</strong><small>${option.skills.map((x) => `${esc(x.name)} (${esc(x.stat)})`).join(' · ')}</small></button>`).join('')}</div>
      ${selectedOption ? `<div class="skill-choice-box"><h3>Pick exactly two Skills</h3><p class="muted micro">Both start at Rank ${stage.rank}. Duplicate background/combat Skills are not allowed.</p><div class="skill-picks">${selectedOption.skills.map((skill) => {
        const picked = selection.picks.includes(skill.name);
        const disabled = !picked && unavailable.has(skill.name);
        return `<button type="button" data-skill="${esc(skill.name)}" aria-pressed="${picked}" ${disabled ? 'disabled title="Already selected elsewhere"' : ''}>${esc(skill.name)} <small>${esc(skill.stat)}</small>${disabled ? ' · already used' : ''}</button>`;
      }).join('')}</div></div>` : '<p class="muted">Choose a background above to reveal its Skills.</p>'}
    </section>
    ${selectedSkills(state).some((x) => x.name === 'Performance') ? `<section class="panel"><div class="panel-head"><h2>Performance specialty</h2>${sourceRef('Skill entry p. 196')}</div><label class="field">Starting performance type<input data-bind="performance" value="${esc(state.performance)}" maxlength="80" placeholder="Comedy, guitar, singing, acting…"><small>The Performance Skill tells you to choose a type to specialize in as your starting type.</small></label></section>` : ''}
    ${actions('identity', null, '<button class="primary" data-action="continue-backgrounds">Continue</button>')}
  `;
}

function optionCard(name, info, disabled = false) {
  const selected = state.combat === name;
  return `<button type="button" class="choice combat-choice" data-combat="${esc(name)}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
    <strong>${esc(name)}</strong><small>${esc(info)}</small>${disabled ? '<span class="disabled-note">Already selected as a background Skill</span>' : ''}
  </button>`;
}

function combatStep() {
  const used = new Set(selectedSkills(state).map((x) => x.name));
  const type = state.combatType;
  let options = '';
  if (type === 'weapon') {
    options = weapons.map((name) => {
      const a = attacks[name];
      const range = a.range === 5 ? 'Melee' : `${a.range} ft`;
      return optionCard(name, `${a.stat} to hit · ${a.dice}${a.damageStat ? ` + ${a.damageStat}` : ''} ${a.effect} · ${range}`, used.has(name) && state.combat !== name);
    }).join('');
  } else if (type === 'spell') {
    options = spells.map((name) => {
      const a = attacks[name];
      const range = a.range === 5 ? 'Melee' : `${a.range} ft`;
      return optionCard(name, `${a.mana} Mana · ${a.stat} · ${a.dice} + ${a.damageStat} ${a.effect} · ${range}`, used.has(name) && state.combat !== name);
    }).join('');
  } else if (type === 'hand') {
    options = Object.entries(handToHand).map(([name, effect]) => {
      const a = attacks[name];
      return optionCard(name, `${a.stat} · ${a.dice} + ${a.damageStat} ${a.effect} · paired with ${effect}`, used.has(name) && state.combat !== name);
    }).join('');
  }

  const selectedAttack = attacks[state.combat];
  return `
    <p class="eyebrow">STEP 3 · COMBAT</p>
    <h1>How do you plan to survive?</h1>
    <p class="intro">Every Human starts with Unarmed Combat Rank 3; an animal starts with Slice Attack Rank 3. You choose the second Rank 3 combat option.</p>
    <section class="panel">
      <div class="panel-head"><h2>Second combat option</h2>${sourceRef('pp. 108-109; Skills pp. 177-183, Spells pp. 202-213')}</div>
      <div class="cards three">
        <button type="button" class="choice" data-combat-type="weapon" aria-pressed="${type === 'weapon'}"><strong>Weapon</strong><small>Choose a listed weapon Skill. You may give it a unique real-world name while using listed mechanics.</small></button>
        <button type="button" class="choice" data-combat-type="spell" aria-pressed="${type === 'spell'}"><strong>Attack Spell</strong><small>Choose one of the seven low-Mana starting options. Intelligence must be at least 4.</small></button>
        <button type="button" class="choice" data-combat-type="hand" aria-pressed="${type === 'hand'}"><strong>Hand-to-hand</strong><small>Choose the listed hand-to-hand Skill and its paired Damage Effect.</small></button>
      </div>
      ${type ? `<div class="combat-options">${options}</div>` : ''}
      ${type === 'weapon' && state.combat ? `<label class="field unique-weapon">Unique weapon name <span class="optional">optional</span><input data-bind="customWeapon" value="${esc(state.customWeapon)}" maxlength="55" placeholder="Example: Tire Iron"><small>If entered, the sheet will show “${esc(state.customWeapon || 'Tire Iron')} (${esc(state.combat)})”; the selected listed weapon supplies the mechanics.</small></label>` : ''}
      ${type === 'spell' ? '<div class="callout">Choosing an attack Spell grants five Standard Mana Potions. You will place the Spell and the potions in Hotlist slots later. All crawlers also know Heal.</div>' : ''}
      ${type === 'hand' && state.combat ? `<div class="callout"><strong>${esc(handToHand[state.combat])}</strong> is the paired Damage Effect. Both hand-to-hand Skills start at Rank 3 (p. 109).</div>` : ''}
      ${selectedAttack?.notes ? `<p class="micro muted"><strong>Restriction:</strong> ${esc(selectedAttack.notes)}</p>` : ''}
    </section>
    ${actions('backgrounds', 'stats')}
  `;
}

function statsStep() {
  const d = derived(state);
  const statIssues = statValidationErrors(state);
  const duplicateValues = new Set();
  const counts = new Map();
  for (const key of stats) {
    const value = Number(state.stats[key]);
    if (!Number.isFinite(value) || ![2, 3, 4, 5, 6].includes(value)) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  for (const [value, count] of counts) if (count > 1) duplicateValues.add(value);
  return `
    <p class="eyebrow">STEP 4 · STATS</p>
    <h1>Assign the Standard Array.</h1>
    <p class="intro">For this first draft, use the player-chosen Standard Array: assign 2, 3, 4, 5, and 6 once each. The book’s dice method will be added later as an explicit optional mode.</p>
    <section class="panel">
      <div class="panel-head"><h2>Starting Stats</h2>${sourceRef('pp. 109-110 · Table 20')}</div>
      ${stats.map((key) => {
        const value = Number(state.stats[key]);
        const duplicate = duplicateValues.has(value);
        return `<div class="stat-row ${duplicate ? 'invalid' : ''}"><div><strong>${esc(statNames[key])}</strong><small>${key}</small></div><select data-stat="${key}" aria-invalid="${duplicate}"><option value="">—</option>${[2,3,4,5,6].map((n) => `<option value="${n}" ${value === n ? 'selected' : ''}>${n}</option>`).join('')}</select><b>${d.mods[key] ? `+${d.mods[key]}` : '—'}</b></div>`;
      }).join('')}
      ${statIssues.length ? `<div class="validation-box" role="alert"><strong>Finish the Standard Array before continuing.</strong><ul>${statIssues.map((issue) => `<li>${esc(issue)}</li>`).join('')}</ul></div>` : '<p class="success micro">Standard Array is valid: each value from 2 through 6 is used exactly once.</p>'}
    </section>
    <section class="panel derived-panel">
      <div class="panel-head"><h2>Calculated automatically</h2>${sourceRef('pp. 110-112')}</div>
      <div class="derived-grid">
        <div><small>Health</small><strong>${d.health ?? '—'}</strong><span>CON Mod × 10</span></div>
        <div><small>Max Mana</small><strong>${d.maxMana ?? '—'}</strong><span>Enhanced INT score</span></div>
        <div><small>Evade</small><strong>${d.evadeDex ? evadeText(d) : '—'}</strong><span>DEX Mod${d.evadeBuff ? ' + Dodge' : ''}${d.evadeExtras.length ? ' + Race/Class' : ''}</span></div>
        <div><small>Move / Step</small><strong>20 / 10</strong><span>feet</span></div>
      </div>
    </section>
    <div class="actions">
      <div><button class="secondary" data-nav="combat">Back</button></div>
      <div class="action-right"><button class="primary" data-action="continue-stats" ${statIssues.length ? 'disabled aria-disabled="true"' : ''}>Continue</button></div>
    </div>
  `;
}

function storyField(key, label, table, page) {
  const mode = state.storyMode[key] || '';
  const current = state.story[key] || '';
  const predefined = storyOptions[key];
  const currentIndex = predefined.indexOf(current);
  const effectiveMode = mode || (currentIndex >= 0 ? 'table' : current ? 'custom' : '');
  return `<section class="panel story-panel">
    <div class="panel-head"><h2>${esc(label)}</h2>${sourceRef(`Table ${table} · p. ${page}`)}</div>
    <div class="story-mode">
      <button type="button" data-story-mode="${key}:table" class="secondary small ${effectiveMode === 'table' ? 'selected' : ''}">Choose from the table</button>
      <button type="button" data-story-mode="${key}:custom" class="secondary small ${effectiveMode === 'custom' ? 'selected' : ''}">Write my own</button>
    </div>
    ${effectiveMode === 'table' ? `<label class="field">Choose ${esc(label)}<select data-story-select="${key}"><option value="">Select one</option>${predefined.map((option) => `<option value="${esc(option)}" ${current === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select></label>` : ''}
    ${effectiveMode === 'custom' ? `<label class="field">Your ${esc(label)}<textarea data-story-custom="${key}" maxlength="350" placeholder="Write the character’s fictional ${esc(label.toLowerCase())}…">${esc(current)}</textarea></label>` : ''}
    ${!effectiveMode ? '<p class="muted micro">Choose a table prompt or write your own character detail.</p>' : ''}
  </section>`;
}

function storyStep() {
  return `
    <p class="eyebrow">STEP 5 · PAST TRAUMA, LOOSE ENDS & REGRETS</p>
    <h1>Tell the GM what stories you want.</h1>
    <p class="intro">Choose one printed prompt or write your own for each category. These are fictional character details; the builder does not ask you to disclose your own trauma.</p>
    ${storyField('trauma', 'Past Trauma', 22, 114)}
    ${storyField('looseEnd', 'Loose End', 23, 114)}
    ${storyField('regret', 'Regret', 24, 114)}
    ${actions('stats', 'gear')}
  `;
}

function locationOptions(value, includeAccessories = true, currentKey = '') {
  const locations = [
    ['inventory', 'Inventory'],
    ['holding', 'Hands / Holding'],
    ...(includeAccessories ? [['accessories', 'Accessories']] : []),
    ...Array.from({ length: 10 }, (_, i) => {
      const slot = i + 1;
      const owner = hotlistOwner(slot, currentKey);
      return [`hotlist:${slot}`, `Hotlist ${slot}${owner ? ` — in use: ${owner.label}` : ''}`];
    }),
  ];
  return `<option value="">Choose location</option>${locations.map(([v, label]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${label}</option>`).join('')}`;
}

function itemEditor(item, index) {
  const weirdCount = state.items.filter((x) => x.kind === 'weird').length;
  const removable = item.kind === 'weird' && weirdCount > 1;
  return `<div class="item-card">
    <div class="item-head"><strong>${item.kind === 'useful' ? 'Interesting / useful item' : 'Weird stuff'}</strong>${removable ? `<button type="button" class="icon-button" data-remove-item="${esc(item.id)}" aria-label="Remove item">×</button>` : ''}</div>
    <div class="fields item-fields">
      <label class="field item-field item-field-name"><span class="field-label">Item</span><input data-item-index="${index}" data-item-field="name" value="${esc(item.name)}" maxlength="80"></label>
      <label class="field item-field item-field-qty"><span class="field-label">Quantity</span><input type="number" min="1" step="1" data-item-index="${index}" data-item-field="qty" value="${esc(item.qty)}"></label>
      <label class="field item-field item-field-location"><span class="field-label">Where is it carried?</span><select data-item-index="${index}" data-item-field="location">${locationOptions(item.location, true, `item:${item.id}`)}</select></label>
      <label class="field item-field item-field-note"><span class="field-label">Short note <span class="optional">optional</span></span><input data-item-index="${index}" data-item-field="notes" value="${esc(item.notes || '')}" maxlength="100"></label>
    </div>
  </div>`;
}

function gearStep() {
  const weapon = state.combatType === 'weapon' && state.combat;
  return `
    <p class="eyebrow">STEP 6 · STARTING GEAR</p>
    <h1>What were you carrying when the world ended?</h1>
    <p class="intro">The creation rules give you worn clothes, a weapon from your chosen weapon combat Skill when applicable, one interesting/useful item, and weird stuff. Your GM decides what is plausible.</p>
    ${weapon ? `<section class="panel"><div class="panel-head"><h2>Starting weapon</h2>${sourceRef('p. 113')}</div><p><strong>${esc(state.customWeapon.trim() ? `${state.customWeapon.trim()} (${state.combat})` : state.combat)}</strong></p><label class="field">Where is the weapon?<select data-bind="weaponLocation" data-rerender="true">${locationOptions(state.weaponLocation, false, 'weapon')}</select></label></section>` : ''}
    <section class="panel">
      <div class="panel-head"><h2>Clothing</h2>${sourceRef('p. 113')}</div>
      <p class="muted micro">You are wearing a set of clothes. Recording each piece on the sheet is optional, so leave any fields blank you do not care to track.</p>
      <div class="clothing-grid">${['Head','Torso','Arms','Hands','Legs','Feet'].map((slot) => `<label class="field">${slot}<input data-clothing="${slot}" value="${esc(state.clothing[slot] || '')}" maxlength="100"></label>`).join('')}</div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Other starting possessions</h2>${sourceRef('pp. 113-115')}</div>
      ${state.items.map(itemEditor).join('')}
      <div class="item-add-row"><button type="button" class="secondary small" data-add-item="weird">+ Add weird stuff</button></div>
      <div class="callout">The book does not provide automatic starting money, armor, mounts, or ammunition quantities. This builder will not invent them. Add only possessions your character and GM agree make sense.</div>
    </section>
    ${actions('story', 'hotlist')}
  `;
}

function hotlistStep() {
  const slots = hotlist(state);
  const assignments = hotlistAssignments();
  const assignmentBySlot = new Map(assignments.map((entry) => [entry.slot, entry]));
  return `
    <p class="eyebrow">STEP 7 · HOTLIST</p>
    <h1>Put fast-access things where you want them.</h1>
    <p class="intro">The Hotlist has ten slots. Different entries cannot share a slot. Up to 999 of the same named item may occupy one slot.</p>
    <section class="panel">
      <div class="panel-head"><h2>Spell placement</h2>${sourceRef('creation p. 111; spell rules p. 202')}</div>
      <div class="fields">
        <label class="field">Heal <span class="optional">optional Hotlist placement</span><select data-bind="healSlot" data-rerender="true"><option value="">Not in Hotlist</option>${hotlistSlotOptions(state.healSlot, 'heal')}</select><small>Every crawler knows Heal. Not placing it here does not remove the Spell.</small></label>
        ${state.combatType === 'spell' ? `<label class="field">${esc(state.combat)} <strong>required</strong><select data-bind="spellSlot" data-rerender="true"><option value="">Choose slot</option>${hotlistSlotOptions(state.spellSlot, 'spell')}</select></label>
        <label class="field">5 Standard Mana Potions <strong>required</strong><select data-bind="potionsSlot" data-rerender="true"><option value="">Choose slot</option>${hotlistSlotOptions(state.potionsSlot, 'potions')}</select></label>` : ''}
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Current Hotlist</h2>${sourceRef('10 slots')}</div>
      <div class="hotlist-preview" aria-label="Hotlist slots">${slots.map((text, index) => {
        const slot = index + 1;
        const entry = assignmentBySlot.get(slot);
        return `<div class="hotlist-row ${text ? 'occupied' : ''}" data-hotlist-slot="${slot}" ${text ? 'draggable="true"' : ''}>
          <span class="hotlist-number">${slot}</span>
          <div class="hot-slot ${text ? 'occupied' : ''}">${text ? esc(text).replaceAll('\n','<br>') : '<em>Empty</em>'}</div>
          ${entry ? `<div class="hotlist-controls">
            <button type="button" class="hotlist-drag-handle" aria-label="Drag ${esc(entry.label)} to another Hotlist slot" title="Drag to reorder">⋮⋮</button>
            <button type="button" class="hotlist-move" data-hotlist-move="${slot}:-1" ${slot === 1 ? 'disabled' : ''} aria-label="Move ${esc(entry.label)} up one Hotlist slot">↑</button>
            <button type="button" class="hotlist-move" data-hotlist-move="${slot}:1" ${slot === 10 ? 'disabled' : ''} aria-label="Move ${esc(entry.label)} down one Hotlist slot">↓</button>
          </div>` : '<div class="hotlist-controls" aria-hidden="true"></div>'}
        </div>`;
      }).join('')}</div>
      <p class="muted micro">Drag an occupied row to reorder the Hotlist. On touch devices or with a keyboard, use the ↑ and ↓ buttons. Starting gear can also be moved into or out of the Hotlist on the Starting Gear step.</p>
    </section>
    ${actions('gear', 'attacks')}
  `;
}

function attackLocation(location) {
  if (location === 'inventory') return 'in the Inventory';
  if (String(location).startsWith('hotlist:')) return `Hotlist ${location.split(':')[1]}`;
  return GEAR_SLOTS.find((x) => x.key === location)?.label || location;
}

function attacksStep() {
  const available = allAttacks(state);
  const chosen = state.combat;
  const selectedSet = tickedAttacks(state, available);
  const shown = available.filter((x) => selectedSet.has(x.name)).length;
  return `
    <p class="eyebrow">STEP 8 · FRONT-PAGE ATTACKS</p>
    <h1>Choose what appears in the five Attack rows.</h1>
    <p class="intro">Your chosen second combat option is always written to the front-page Attacks table. Every other attack you have can be included or left off: your starting Unarmed/Slice attack, attack Skills and Spells from backgrounds, Race, Class or the Skill & Spell log, and weapons from the Equipment step. Ranks are your current Ranks. All learned Skills still appear on page 3.</p>
    <section class="panel">
      <div class="panel-head"><h2>Attack rows</h2>${sourceRef('sheet page 1; creation pp. 108-110')}</div>
      <div class="attack-select-list">${available.map((attack) => {
        const mandatory = attack.name === chosen;
        const checked = mandatory || selectedSet.has(attack.name);
        const rank = attack.rank;
        const hit = attack.stat === 'None' ? '—' : `${attack.stat} ${derived(state).modText[attack.stat] || '?'}`;
        const flat = attack.damageBonus ? ` ${attack.damageBonus > 0 ? '+' : '−'} ${Math.abs(attack.damageBonus)}` : '';
        const dmg = attack.dice ? `${attack.dice}${attack.damageStat ? ` + ${attack.damageStat}` : ''}${flat} ${attack.effect}` : 'no base damage';
        const where = attack.source === 'Gear' ? ` · ${attackLocation(attack.location)}${rank ? '' : ` · you don't know ${attack.skill} yet`}` : '';
        return `<label class="attack-select ${mandatory ? 'mandatory' : ''}"><input type="checkbox" data-attack-row="${esc(attack.name)}" ${checked ? 'checked' : ''} ${mandatory ? 'disabled' : ''}><span><strong>${esc(attack.label || attack.name)}</strong><small>Rank ${rank} · ${esc(hit)} to hit · ${esc(dmg)}${esc(where)}${mandatory ? ' · required' : ''}${(attack.damageNotes || []).map((x) => `<br>${esc(x)}`).join('')}</small></span></label>`;
      }).join('')}</div>
      ${shown > 5 ? `<div class="validation-box">${shown} attacks are ticked, but the sheet has five rows. Only the first five go on the sheet: ${esc(attackRowsForSheet(state).map((x) => x.label || x.name).join(', '))}.</div>` : ''}
      <div class="callout">The supplied sheet has five rows. If you have more than five attacks, choose which non-required ones are most useful to show here. Weapons you're holding or have in the Hotlist are ticked unless you untick them.</div>
    </section>
    ${actions('hotlist', 'raceclass')}
  `;
}

function reviewStep() {
  const issues = errors(state);
  const notes = missingDetails(state);
  const d = derived(state);
  const skills = allSkills(state);
  const attacksForSheet = attackRowsForSheet(state);
  return `
    <p class="eyebrow">STEP 13 · REVIEW & EXPORT</p>
    <h1>${issues.length ? 'Finish the crawler.' : 'Crawler ready for the sheet.'}</h1>
    <p class="intro">Nothing is randomly assigned except the crawler number. Mandatory calculations are derived automatically from your choices.</p>
    <section class="panel ${issues.length ? 'warning-panel' : 'success-panel'}">
      <div class="panel-head"><h2>${issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'} to resolve` : 'Validation passed'}</h2>${sourceRef('Source-bound validation')}</div>
      ${issues.length ? `<ul class="issues">${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted micro">You can still download the sheet. Its notes will say it has issues and list them.</p>` : '<p class="success">All required choices for this first-draft starting crawler are complete.</p>'}
    </section>
    <section class="panel review-grid-panel">
      <div class="review-grid">
        <div><h3>Identity</h3><p>${esc(state.name)} · #${esc(state.number)}<br>${state.kind === 'human' ? 'Human' : esc(state.species)} · ${esc(d.size)}${state.race || state.className ? `<br>${esc([state.race && `Race: ${state.race}`, state.className && `Class: ${state.className}`].filter(Boolean).join(' · '))}` : ''}</p></div>
        <div><h3>Vitals</h3><p>Health ${d.health ?? '—'} · Mana ${d.maxMana ?? '—'}<br>Move ${d.move} · Step ${d.step} · AI Favor ${d.aiFavor ?? '—'}</p></div>
        <div class="wide"><h3>Skills (${skills.length})</h3><p>${skills.map((x) => `${esc(x.label || x.name)} R${x.rank}`).join(' · ')}</p></div>
        <div class="wide"><h3>Front-page Attacks (${attacksForSheet.length}/5)</h3><p>${attacksForSheet.map((x) => esc(x.label || x.name)).join(' · ') || 'None selected'}</p></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Source limitations / GM notes</h2></div>
      <ul class="issues neutral">${notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>
    <div class="actions">
      <button class="secondary" data-nav="party">Back</button>
      <div class="action-right">
        <button class="secondary danger-button" data-action="new-crawler">Start a new crawler</button>
        <button class="primary" data-action="download" ${exporting ? 'disabled' : ''}>${exporting ? 'Building PDF…' : issues.length ? 'Download sheet with issues' : 'Download filled character sheet'}</button>
      </div>
    </div>
  `;
}

// Race & Class cards: which ones have their benefits and full description
// open, by "race:Name" / "class:Name" (this page view only).
const rcOpen = { benefits: new Set(), descriptions: new Set() };
const rcKey = (kind, entry) => `${kind}:${entry.name}`;

function rcDescription(entry, kind) {
  const text = String(entry.description || '').trim();
  if (!text) return '';
  const open = rcOpen.descriptions.has(rcKey(kind, entry));
  return `<p class="rc-desc ${open ? 'open' : ''}"><span>${esc(text)}</span><button type="button" class="link-button" data-rc-desc="${esc(rcKey(kind, entry))}" aria-expanded="${open}">${open ? 'Show less' : 'Show more'}</button></p>`;
}

function raceClassCard(entry, kind, selected) {
  const types = entry.classTypes?.length ? ` · ${entry.classTypes.join(', ')}` : '';
  const key = rcKey(kind, entry);
  return `<article class="rc-card ${selected ? 'selected' : ''}">
    <div class="rc-head"><strong>${esc(entry.name)}</strong><span class="tag">${entry.earth ? 'Earth' : kind === 'race' ? 'Alien' : 'Any Race'}</span></div>
    <p class="muted micro">${entry.custom ? `Custom ${kind === 'race' ? 'Race' : 'Class'}${entry.author ? ` by ${esc(entry.author)}` : ''}` : sourceRef(`p. ${entry.page}`)}${esc(types)}${entry.prerequisite ? ` · Limited: ${esc(entry.prerequisite)}` : ''}</p>
    ${rcDescription(entry, kind)}
    <details data-rc-benefits="${esc(key)}" ${rcOpen.benefits.has(key) ? 'open' : ''}><summary>${entry.benefits.length} benefits</summary><ul>${entry.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></details>
    <button type="button" class="${selected ? 'secondary' : 'primary'}" data-${kind}="${esc(entry.name)}" aria-pressed="${selected}">${selected ? 'Selected' : `Choose ${kind === 'race' ? 'Race' : 'Class'}`}</button>
  </article>`;
}

function ineligibleSelection(entry, kind, issues) {
  return `<div class="callout warn">Your selected ${kind === 'race' ? 'Race' : 'Class'}, <strong>${esc(entry?.name || '')}</strong>, now requires ${esc(issues.join('; '))}.
    <button type="button" class="secondary" data-clear="${kind}">Remove ${kind === 'race' ? 'Race' : 'Class'}</button></div>`;
}

function choiceControls(kind, entry, choices) {
  const effects = entryEffects(entry, choices).filter((x) => ['skillPick', 'rankLimitPick', 'statSplit'].includes(x.type));
  if (!effects.length) return '';
  return `<div class="rc-choices"><h3>${esc(entry.name)} choices</h3>${effects.map((effect) => {
    if (effect.type === 'statSplit') {
      const values = splitValues(effect);
      const spent = Object.values(values).reduce((a, b) => a + b, 0);
      return `<div class="rc-choice"><p>${esc(effect.benefit)} <span class="${spent === effect.total ? 'success' : 'error'}">${spent}/${effect.total}</span></p>
        <div class="rc-split">${effect.stats.map((stat) => `<label class="field">${esc(statNames[stat])}<input type="number" min="0" max="${effect.total}" data-split="${kind}|${effect.key}|${stat}" value="${values[stat] || ''}" placeholder="0"></label>`).join('')}</div></div>`;
    }
    const slots = Array.isArray(effect.chosen) ? effect.chosen : [];
    return `<div class="rc-choice"><p>${esc(effect.benefit)}</p><div class="rc-split">${Array.from({ length: effect.count }, (_, i) => `
      <label class="field">${effect.count > 1 ? `Choice ${i + 1}` : 'Choice'}<select data-pick="${kind}|${effect.key}|${i}">
        <option value="">Choose…</option>
        ${effect.options.map((name) => `<option value="${esc(name)}" ${slots[i] === name ? 'selected' : ''} ${slots.includes(name) && slots[i] !== name ? 'disabled' : ''}>${esc(name)}</option>`).join('')}
      </select></label>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

function raceClassResults() {
  if (!state.race && !state.className) return '';
  const before = Object.fromEntries(stats.map((key) => [key, state.stats[key]]));
  const after = unenhancedStats(state);
  const d = derived(state);
  const changed = allSkills(state).filter((x) => /Race|Class/.test(x.source || ''));
  return `<section class="panel">
    <div class="panel-head"><h2>Applied to this crawler</h2>${sourceRef('p. 128')}</div>
    <div class="table-wrap"><table><thead><tr><th>Stat</th><th>Assigned</th><th>Unenhanced</th><th>Enhanced</th></tr></thead><tbody>
      ${stats.map((key) => `<tr><td>${esc(statNames[key])}</td><td>${esc(before[key] || '—')}</td><td>${after[key] === '' ? '—' : after[key]}</td><td>${after[key] === '' ? '—' : after[key]}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="muted micro">Race and Class change Unenhanced Stats. Enhanced equals Unenhanced until equipment adds bonuses.${d.dayNight ? ` Day/night values: ${stats.filter((k) => d.statText[k].includes('/')).map((k) => `${statNames[k]} ${d.statText[k]}`).join(', ')} (first is daytime, second is night time).` : ''}</p>
    <h3>Skills & Spells</h3>
    ${changed.length ? `<ul class="rc-skill-list">${changed.map((x) => `<li><strong>${esc(x.label || x.name)}</strong> Rank ${x.rank} <span class="muted micro">(${esc(x.source)})${x.wasted ? ` · ${x.wasted} over the Rank ${SELECTION_RANK_CAP} cap wasted` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">No Skill changes yet.</p>'}
    <p class="muted micro">Size ${esc(d.size || '—')} · Move ${d.move} ft${d.dr.total ? ` · DR ${d.dr.parts.map((x) => `+${x.value} (${x.from})`).join(' ')} = ${d.dr.total}` : ''}</p>
  </section>`;
}

function customLink(kind) {
  const label = kind === 'race' ? 'Race' : 'Class';
  return `<p class="custom-link">${workshopLink(`Custom ${label}s`)} <span class="muted micro">Build your own ${label} with the Build System, or use one another crawler shared.</span></p>`;
}

// Most new crawlers haven't reached the Third Floor, so skipping is one click
// from the top of the step.
function skipRaceClass() {
  const floor = Number(state.floor) || 1;
  const chosen = Boolean(state.race || state.className);
  const early = floor < 3 && !chosen;
  return `<div class="callout skip-callout${early ? ' skip-early' : ''}">
    <span>${early ? `This crawler is on Floor ${floor}. Race and Class come at the Third Floor, so you can skip this step for now.` : chosen ? 'Race and Class are optional. Skipping keeps what you’ve chosen here.' : 'Race and Class are optional. Skip this step if your crawler hasn’t chosen them yet.'}</span>
    <button type="button" class="${early ? 'primary' : 'secondary'}" data-nav="advancement">Skip Race &amp; Class</button>
  </div>`;
}

// Expand All / Collapse All, pinned to the side of the screen on this step.
let rcCards = [];
function rcExpandButton(cards) {
  rcCards = cards.map(([kind, entry]) => [rcKey(kind, entry), Boolean(String(entry.description || '').trim())]);
  const open = rcAllOpen();
  return `<div class="rc-expand"><button type="button" class="secondary" data-rc-expand="${open ? 'collapse' : 'expand'}">${open ? 'Collapse All' : 'Expand All'}</button></div>`;
}

function rcAllOpen() {
  return rcCards.length > 0 && rcCards.every(([key, hasText]) => rcOpen.benefits.has(key) && (!hasText || rcOpen.descriptions.has(key)));
}

// Relabel after a card is opened or closed by hand.
function labelRcExpand() {
  const button = main.querySelector('[data-rc-expand]');
  if (!button) return;
  const open = rcAllOpen();
  button.dataset.rcExpand = open ? 'collapse' : 'expand';
  button.textContent = open ? 'Collapse All' : 'Expand All';
}

function raceClassStep() {
  const raceOptions = eligibleRaces(state);
  const classOptions = eligibleClasses(state);
  const chosenRace = findRace(state.race, state);
  const chosenClass = findClass(state.className, state);
  const raceIssues = chosenRace ? raceClassRequirementIssues(state, chosenRace) : [];
  const classIssues = chosenClass ? raceClassRequirementIssues(state, chosenClass) : [];
  const hiddenRaces = races.length - raceOptions.length;
  const hiddenClasses = classes.length - classOptions.length;
  return `
    <p class="eyebrow">STEP 9 · RACE & CLASS</p>
    <h1>Choose a Race and Class</h1>
    <p class="intro">Crawlers choose a Race and Class on reaching the Third Floor, but you can add them here at any time. Only the Races and Classes whose prerequisites this crawler meets are listed. Leaving Race empty keeps the Race you entered the dungeon with.</p>
    ${skipRaceClass()}
    <section class="panel">
      <div class="panel-head"><h2>Crawler record</h2>${sourceRef('Prerequisites, pp. 128-158')}</div>
      <p class="muted micro">Skill Ranks come from your Backgrounds and Combat choices. Record anything else your crawler has earned so limited options can unlock.</p>
      <div class="fields">
        <label class="field">Popularity<input data-bind="popularity" data-rerender="true" value="${esc(state.popularity)}" inputmode="numeric" maxlength="4" placeholder="0"></label>
        <label class="field">Achievements <span class="optional">one per line</span><textarea data-bind="achievements" data-rerender="true" rows="3" maxlength="600" placeholder="Boom!">${esc(state.achievements)}</textarea></label>
      </div>
      <label class="check"><input type="checkbox" data-bind="clubs.desperado" ${state.clubs.desperado ? 'checked' : ''}> <span>Has access to the Desperado Club</span></label>
      <label class="check"><input type="checkbox" data-bind="clubs.vanquisher" ${state.clubs.vanquisher ? 'checked' : ''}> <span>Has access to Club Vanquisher</span></label>
      <label class="check"><input type="checkbox" data-bind="female" ${state.female ? 'checked' : ''}> <span>Female crawler <small class="muted">(for female-only options; these limits are optional, p. 128)</small></span></label>
    </section>
    ${rcExpandButton([...(chosenRace?.custom ? [['race', chosenRace]] : []), ...raceOptions.map((x) => ['race', x]), ...(chosenClass?.custom ? [['class', chosenClass]] : []), ...classOptions.map((x) => ['class', x])])}
    <section class="panel">
      <div class="panel-head"><h2>Race</h2>${sourceRef('pp. 128-141')}</div>
      <label class="field rc-floor">Floor the Race & Class were chosen on<input data-bind="raceClassFloor" data-rerender="true" inputmode="numeric" maxlength="3" value="${esc(state.raceClassFloor)}"><small>Skill-ups logged on earlier floors count before Race/Class bonuses (Level & Skills step).</small></label>
      ${chosenRace && raceIssues.length ? ineligibleSelection(chosenRace, 'race', raceIssues) : ''}
      ${chosenRace && !raceIssues.length ? `<p>Selected: <strong>${esc(chosenRace.name)}</strong> <button type="button" class="secondary" data-clear="race">Keep original Race instead</button></p>` : ''}
      ${chosenRace ? choiceControls('race', chosenRace, state.raceChoices) : ''}
      <div class="rc-grid">${[...(chosenRace?.custom ? [chosenRace] : []), ...raceOptions].map((x) => raceClassCard(x, 'race', x.name === state.race)).join('')}</div>
      ${customLink('race')}
      ${hiddenRaces ? `<p class="muted micro">${hiddenRaces} limited Race${hiddenRaces === 1 ? ' is' : 's are'} hidden because this crawler doesn’t meet the prerequisites yet.</p>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Class</h2>${sourceRef('pp. 142-158')}</div>
      <p class="muted micro">Earth Classes need an Earth-based Race. Classes are filtered against ${esc(state.race ? `the ${state.race} Race` : 'your original Race')}.</p>
      ${chosenClass && classIssues.length ? ineligibleSelection(chosenClass, 'class', classIssues) : ''}
      ${chosenClass && !classIssues.length ? `<p>Selected: <strong>${esc(chosenClass.name)}</strong> <button type="button" class="secondary" data-clear="class">Remove Class</button></p>` : ''}
      ${chosenClass ? choiceControls('class', chosenClass, state.classChoices) : ''}
      <div class="rc-grid">${[...(chosenClass?.custom ? [chosenClass] : []), ...classOptions].map((x) => raceClassCard(x, 'class', x.name === state.className)).join('')}</div>
      ${customLink('class')}
      ${hiddenClasses ? `<p class="muted micro">${hiddenClasses} Class${hiddenClasses === 1 ? ' is' : 'es are'} hidden because this crawler doesn’t meet the prerequisites yet.</p>` : ''}
    </section>
    ${raceClassResults()}
    <div class="callout">Stat, Skill, Spell, DR, Size and Move bonuses are applied automatically. Skill and Spell bonuses add Ranks immediately, up to Rank ${SELECTION_RANK_CAP} during selection. Situational benefits are listed on the sheet for reference.</div>
    ${actions('attacks', 'advancement')}
  `;
}

// A Skill's Rank without gear, and whether it's at its Rank limit (Heal's is 1).
function maxedSkill(name) {
  const known = allSkills(state).find((x) => x.name.toLowerCase() === name.toLowerCase());
  const rank = known ? known.rank - (known.gearRanks || 0) : 0;
  const limit = rankLimit(state, name);
  return rank >= limit ? { rank, limit } : null;
}

function skillOptions(selected, allowCustom = false) {
  const owned = allSkills(state).map((x) => x.name).sort((a, b) => a.localeCompare(b));
  const ownedKeys = new Set(owned.map((x) => x.toLowerCase()));
  const learn = (kind) => skillCatalog.filter((x) => x.kind === kind && !x.custom && !ownedKeys.has(x.name.toLowerCase()));
  const option = (name) => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`;
  // Skills at their limit can't gain Ranks.
  const ownedOption = (name) => {
    const maxed = maxedSkill(name);
    return maxed ? `<option value="${esc(name)}" disabled>${esc(name)} (Rank ${maxed.limit} maximum)</option>` : option(name);
  };
  return `<option value="">Choose…</option>
    <optgroup label="Your Skills & Spells">${owned.map(ownedOption).join('')}</optgroup>
    <optgroup label="Learn a new Skill">${learn('skill').map((x) => option(x.name)).join('')}</optgroup>
    <optgroup label="Learn a new Spell">${learn('spell').map((x) => option(x.name)).join('')}</optgroup>
    ${allowCustom ? `<optgroup label="Not in the book"><option value="${CUSTOM_SKILL}" ${selected === CUSTOM_SKILL ? 'selected' : ''}>Custom Skill…</option></optgroup>` : ''}`;
}

// Name, Stat and description for a Skill that isn't in the book.
function customSkillFields() {
  return `<div class="adv-grid adv-skill-form">
    <label class="field adv-wide">Custom Skill name<input data-skill-draft="customName" maxlength="60" value="${esc(skillUpDraft.customName)}" placeholder="e.g. Competitive Yo-Yo"></label>
    <label class="field">Stat<select data-skill-draft="customStat">${['None', ...stats].map((k) => `<option value="${k}" ${k === skillUpDraft.customStat ? 'selected' : ''}>${k === 'None' ? 'None' : esc(statNames[k])}</option>`).join('')}</select></label>
    <label class="field">Skill type<select data-skill-draft="customCheck">${CUSTOM_SKILL_CHECKS.map((c) => `<option ${c === skillUpDraft.customCheck ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field adv-wide">What it does <span class="optional">optional</span><textarea data-skill-draft="customDescription" maxlength="300" placeholder="As described by the potion or your GM">${esc(skillUpDraft.customDescription)}</textarea></label>
  </div>
  <p class="muted micro">For Skills the book doesn't list, like the random one an Earth hobby potion gives. It joins your Skills with the Stat you choose and appears on the sheet; log more Ranks later by picking it under Your Skills & Spells.</p>`;
}

// The Skill the draft logs: the selected one, or the custom name typed.
function draftSkillName() {
  return skillUpDraft.skill === CUSTOM_SKILL ? skillUpDraft.customName.trim() : skillUpDraft.skill;
}

function advancementStep() {
  const d = derived(state);
  const report = skillUpReport(state);
  const draftPoints = levelPoints(levelDraft);
  const draftTotal = Object.values(draftPoints).reduce((a, b) => a + b, 0);
  const levels = state.levelUps || [];
  const ups = state.skillUps || [];
  return `
    <p class="eyebrow">STEP 10 · LEVEL & SKILLS</p>
    <h1>Level up and track Skill Ranks</h1>
    <p class="intro">Each level adds ${LEVEL_STAT_POINTS} Stat points to spend on any Stats. Log Skill and Spell Ranks as your crawler gains them during play, with the floor it happened on.</p>
    <section class="panel">
      <div class="panel-head"><h2>Level ${d.level} · Floor ${d.floor}</h2>${sourceRef('Stat points: user rule')}</div>
      <label class="field adv-floor">Current Floor<input data-bind="floor" data-rerender="true" inputmode="numeric" maxlength="3" value="${esc(state.floor)}"></label>
      ${levels.length ? `<div class="table-wrap"><table><thead><tr><th>Level</th><th>Floor</th><th>Stat points</th><th></th></tr></thead><tbody>
        ${levels.map((entry, i) => `<tr><td>${i + 2}</td><td>${esc(entry.floor)}</td><td>${stats.filter((k) => levelPoints(entry)[k]).map((k) => `+${levelPoints(entry)[k]} ${k}`).join(', ')}</td>
          <td>${i === levels.length - 1 ? '<button type="button" class="secondary" data-action="undo-level">Undo</button>' : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">No levels gained yet. Starting crawlers are Level 1.</p>'}
      <h3>Gain Level ${d.level + 1}</h3>
      <div class="adv-grid">
        ${stats.map((key) => `<label class="field">${esc(statNames[key])}<input type="number" min="0" max="${LEVEL_STAT_POINTS}" data-level-draft="${key}" value="${draftPoints[key] || ''}" placeholder="0"></label>`).join('')}
        <label class="field">Floor<input inputmode="numeric" maxlength="3" data-level-draft="floor" value="${esc(levelDraft.floor)}" placeholder="${d.floor}"></label>
      </div>
      <div class="action-right"><span class="${draftTotal === LEVEL_STAT_POINTS ? 'success' : 'muted'}">${draftTotal}/${LEVEL_STAT_POINTS} points</span>
        <button type="button" class="primary" data-action="add-level">Add level</button></div>
      ${state.race === 'Human' ? `<p class="muted micro">Human: each level gained on or after Floor ${esc(state.raceClassFloor)} adds 1 AI Favor (now ${d.aiFavor}).</p>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Skill & Spell log</h2>${sourceRef('Rank limits p. 128')}</div>
      <p class="muted micro">Rank ${RANK_CAP} is the limit, or ${EXTENDED_RANK_CAP} where your Race or Class allows it; extra Ranks are wasted. Ranks above ${RANK_CAP} come online on Floor ${HIGH_RANK_FLOOR}. ${state.race || state.className ? `Entries before Floor ${esc(state.raceClassFloor)} happened before your Race/Class bonuses.` : ''}</p>
      <div class="adv-grid adv-skill-form">
        <label class="field adv-wide">Skill or Spell<select data-skill-draft="skill">${skillOptions(skillUpDraft.skill, true)}</select></label>
        <label class="field">Ranks<input type="number" min="1" data-skill-draft="ranks" value="${esc(skillUpDraft.ranks)}"></label>
        <label class="field">Floor<input inputmode="numeric" maxlength="3" data-skill-draft="floor" value="${esc(skillUpDraft.floor)}" placeholder="${d.floor}"></label>
        <label class="field">How<select data-skill-draft="how">${SKILL_UP_METHODS.map((m) => `<option ${m === skillUpDraft.how ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <label class="field adv-wide">Note <span class="optional">optional</span><input data-skill-draft="note" maxlength="120" value="${esc(skillUpDraft.note)}"></label>
      </div>
      ${skillUpDraft.skill === CUSTOM_SKILL ? customSkillFields() : ''}
      <div class="action-right">${draftSkillName() ? `<span class="muted micro">Limit for ${esc(draftSkillName())}: Rank ${rankLimit(state, draftSkillName())}</span>` : ''}
        <button type="button" class="primary" data-action="add-skill-up">Log skill-up</button></div>
      ${ups.length ? `<div class="table-wrap"><table class="adv-log"><thead><tr><th>Skill or Spell</th><th>Ranks</th><th>Floor</th><th>How</th><th>Note</th><th>Result</th><th></th></tr></thead><tbody>
        ${ups.map((entry, i) => {
          const r = report[i];
          const result = r ? `R${r.before} → R${r.after}${r.wasted ? ` <span class="error">(${r.wasted} wasted, limit ${r.cap})</span>` : ''}` : '—';
          return `<tr>
            <td><select data-bind="skillUps.${i}.skill" data-rerender="true">${skillOptions(entry.skill)}</select></td>
            <td><input type="number" min="1" data-bind="skillUps.${i}.ranks" data-rerender="true" value="${esc(entry.ranks)}"></td>
            <td><input inputmode="numeric" maxlength="3" data-bind="skillUps.${i}.floor" data-rerender="true" value="${esc(entry.floor)}"></td>
            <td><select data-bind="skillUps.${i}.how">${SKILL_UP_METHODS.map((m) => `<option ${m === entry.how ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></td>
            <td><input data-bind="skillUps.${i}.note" maxlength="120" value="${esc(entry.note)}"></td>
            <td class="nowrap">${result}</td>
            <td><button type="button" class="secondary" data-delete-skill-up="${i}" aria-label="Delete skill-up">Delete</button></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>` : '<p class="muted">No skill-ups logged yet.</p>'}
    </section>
    ${actions('raceclass', 'equipment')}
  `;
}

const KIND_LABELS = Object.fromEntries(ITEM_KINDS);
// Skills a weapon item can attack with.
const weaponSkillNames = skillCatalog.filter((x) => x.kind === 'skill' && x.attack && !x.custom).map((x) => x.name);
const weaponSkillOptions = (selected) => `<option value="">Choose a weapon Skill</option>${weaponSkillNames.map((name) => `<option ${selected === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}`;
const spellNames = skillCatalog.filter((x) => x.kind === 'spell').map((x) => x.name);

// Where a gear item can go: a Gear Slot (bonuses apply), the Inventory or a Hotlist slot.
function gearLocationOptions(item) {
  const usage = slotUsage(state);
  const slotOption = (slot) => {
    const others = usage[slot.key].filter((x) => x.id !== item.id);
    const used = slotCount(slot, others);
    const note = slot.unit === 'hand' ? `${used}/2 hands used` : slot.max === 1 ? (others[0] ? `in use: ${others[0].label}` : '') : `${used}/${slot.max}`;
    return `<option value="${slot.key}" ${item.location === slot.key ? 'selected' : ''}>${esc(slot.label)}${note ? ` — ${esc(note)}` : ''}</option>`;
  };
  const hot = Array.from({ length: 10 }, (_, i) => {
    const owner = hotlistOwner(i + 1, `gear:${item.id}`);
    const value = `hotlist:${i + 1}`;
    return `<option value="${value}" ${item.location === value ? 'selected' : ''}>Hotlist ${i + 1}${owner ? ` — in use: ${esc(owner.label)}` : ''}</option>`;
  });
  return `<optgroup label="Gear Slots (bonuses apply)">${GEAR_SLOTS.map(slotOption).join('')}</optgroup>
    <optgroup label="Not equipped (no bonuses)"><option value="inventory" ${item.location === 'inventory' ? 'selected' : ''}>Inventory</option>${hot.join('')}</optgroup>`;
}

// Gear items open for editing (this page view only).
const openGear = new Set();
// Gear ids whose "Bonuses when equipped" panel was opened or closed by hand;
// otherwise it's open when the item has a bonus.
const gearBonusesOpen = new Map();
// The quick-add bar: what's typed so far, kept when the type changes. Its
// kind is an ITEM_KINDS kind, or 'custom' / 'custom-weapon' (the full editor,
// for magic gear).
const quickGear = { kind: 'item', location: 'inventory', name: '', qty: '1', spell: '', rank: '', weaponSkill: '' };
// A gear bonus amount. Text, not type="number": a number field reports "+1"
// as blank, so the bonus would silently not save. "+1" is stored as "1";
// equipmentErrors() flags anything that isn't a whole number.
const bonusInput = (bind, value, placeholder, live = true) => `<input maxlength="4" autocomplete="off" data-bind="${bind}" data-bonus ${live ? 'data-rerender="true"' : ''} value="${esc(value)}" placeholder="${placeholder}">`;
const boundValue = (target) => (target.matches('[data-bonus]') ? stripPlus(target.value) : target.value);
const QUICK_KINDS = [...ITEM_KINDS, ['custom', 'Custom item…'], ['custom-weapon', 'Custom weapon…']];

function quickAddPanel() {
  const where = gearLocationOptions({ id: 'quick-add', location: quickGear.location });
  const spellItem = quickGear.kind === 'scroll' || quickGear.kind === 'spellbook';
  const custom = quickGear.kind in CUSTOM_KINDS;
  const weapon = quickGear.kind === 'weapon' || quickGear.kind === 'custom-weapon';
  const field = (label, html, cls = '') => `<label class="field ${cls}"><span class="field-label">${label}</span>${html}</label>`;
  const what = spellItem
    ? field('Spell', `<select name="spell" required><option value="">Choose a Spell</option>${spellNames.map((name) => `<option ${quickGear.spell === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>`, 'quick-name')
      + field('Rank', `<input name="rank" type="number" min="1" max="20" step="1" value="${esc(quickGear.rank)}" required>`, 'quick-qty')
    : field(custom ? 'Name <span class="optional">or name it in the editor</span>' : 'Name',
      `<input name="name" maxlength="80" value="${esc(quickGear.name)}" placeholder="${{ potion: 'e.g. Healing Potion', custom: 'e.g. Enchanted Toe Ring', weapon: 'e.g. Enchanted Axe', 'custom-weapon': 'e.g. The Poky Little Dagger' }[quickGear.kind] || 'e.g. 50 feet of rope'}" ${custom ? '' : 'required'}>`, 'quick-name')
      + (weapon ? field('Weapon Skill', `<select name="weaponSkill" required>${weaponSkillOptions(quickGear.weaponSkill)}</select>`) : '');
  return `<form class="quick-add" data-quick-gear autocomplete="off">
      ${field('Add', `<select name="kind" data-quick-kind>${QUICK_KINDS.map(([kind, label]) => `<option value="${kind}" ${quickGear.kind === kind ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
      ${what}
      ${field('Qty', `<input name="qty" type="number" min="1" step="1" value="${esc(quickGear.qty)}">`, 'quick-qty')}
      ${field('Where', `<select name="location">${where}</select>`)}
      <button class="primary">${custom ? 'Add and edit' : 'Add'}</button>
    </form>
    ${{
      custom: '<p class="muted micro">Custom item opens the full editor: description, and Stat, Skill, DR and damage bonuses that apply while it’s equipped. It isn’t a weapon, so its damage bonuses add to all your attacks; for a magic weapon, use Custom weapon.</p>',
      'custom-weapon': '<p class="muted micro">Custom weapon opens the full editor: description, and Stat, Skill, DR and damage bonuses. Its damage bonuses add to its own attacks only.</p>',
    }[quickGear.kind] || ''}`;
}

// Keep what's typed in the quick-add bar.
function readQuickGear(form) {
  const data = new FormData(form);
  for (const key of ['kind', 'location', 'name', 'qty', 'spell', 'rank', 'weaponSkill']) if (data.has(key)) quickGear[key] = String(data.get(key));
  if (!QUICK_KINDS.some(([kind]) => kind === quickGear.kind)) quickGear.kind = 'item';
}

function quickGoldPanel() {
  return `<form class="quick-add quick-gold" data-quick-gold autocomplete="off">
      <label class="field quick-qty"><span class="field-label">Gold</span><input name="amount" type="number" min="1" step="1" placeholder="0" required></label>
      <button class="secondary" name="op" value="add">Add gold</button>
      <button class="secondary" name="op" value="spend">Spend gold</button>
      <span class="muted">You have <strong>${esc(Number(state.gold) || 0)}</strong> gold.</span>
    </form>`;
}

// The Stat, DR, Skill and damage bonus editor shared by gear items and Party
// buffs. `bind` is the data-bind path of the item or buff (e.g. "gear.3"),
// `damageNote` says what its damage bonuses add to. With `live` off, changes
// don't re-render the page (a draft editor, where Tab must reach the next field).
function bonusPanel(bind, item, title, damageNote, live = true) {
  const bonus = bonusText(item);
  const stats = item.bonuses.stats;
  const id = esc(item.id);
  const rerender = live ? 'data-rerender="true"' : '';
  const field = (label, html, cls = '') => `<label class="field ${cls}"><span class="field-label">${label}</span>${html}</label>`;
  return `<details class="gear-bonuses" data-gear-bonuses="${id}" ${(gearBonusesOpen.get(item.id) ?? !!bonus) ? 'open' : ''}>
      <summary>${title}${bonus ? `: ${esc(bonus)}` : ''}</summary>
      <div class="gear-dr">${field('Damage Resistance (DR)', bonusInput(`${bind}.bonuses.dr`, item.bonuses.dr, '+2', live))}</div>
      <p class="field-label gear-bonus-heading">Stat bonuses</p>
      <div class="gear-stat-grid">${STAT_KEYS.map((key) => field(key, bonusInput(`${bind}.bonuses.stats.${key}`, stats[key] ?? '', '0', live))).join('')}</div>
      ${item.bonuses.skills.map((x, j) => `<div class="gear-skill-row">
        ${field('Skill or Spell', `<input list="gear-skill-names" data-bind="${bind}.bonuses.skills.${j}.name" ${rerender} value="${esc(x.name)}" maxlength="60">`, 'gear-wide')}
        ${field('Bonus to', `<select data-bind="${bind}.bonuses.skills.${j}.type" ${rerender}>${SKILL_BONUS_TYPES.map(([v, label]) => `<option value="${v}" ${x.type === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
        ${field('Amount', bonusInput(`${bind}.bonuses.skills.${j}.ranks`, x.ranks, '+1', live))}
        <button type="button" class="secondary small" data-remove-gear-skill="${id}:${j}">Remove</button>
      </div>`).join('')}
      <button type="button" class="secondary small" data-add-gear-skill="${id}">+ Skill bonus</button>
      <p class="muted micro">Skill Ranks can't take a Skill past its Rank limit (15, or 20 if your Race or Class allows); extra Ranks do nothing. A bonus to checks isn't Ranks, so it always applies.</p>
      ${item.bonuses.damage.map((x, j) => `<div class="gear-skill-row">
        ${field('Damage', bonusInput(`${bind}.bonuses.damage.${j}.amount`, x.amount, '+1', live))}
        ${field('Only when <span class="optional">optional</span>', `<input data-bind="${bind}.bonuses.damage.${j}.condition" ${rerender} value="${esc(x.condition)}" maxlength="80" placeholder="e.g. hitting injured creatures">`, 'gear-wide')}
        <button type="button" class="secondary small" data-remove-gear-damage="${id}:${j}">Remove</button>
      </div>
      ${{ missing: '<p class="error micro">Enter a Damage amount, e.g. 1. With no amount this bonus does nothing.</p>', amount: '<p class="error micro">The Damage amount must be a whole number, e.g. 1 or -1.</p>' }[damageBonusProblem(x)] || ''}`).join('')}
      <button type="button" class="secondary small" data-add-gear-damage="${id}">+ Damage bonus</button>
      <p class="muted micro">${damageNote} With no condition it’s added to the Damage Mod; with one, it’s noted on the attack.</p>
    </details>`;
}

function gearCard(item, i) {
  const spellItem = item.kind === 'scroll' || item.kind === 'spellbook';
  const equipped = isEquipped(item.location);
  const slot = GEAR_SLOTS.find((x) => x.key === item.location);
  const bonus = bonusText(item);
  const field = (label, html, cls = '') => `<label class="field ${cls}"><span class="field-label">${label}</span>${html}</label>`;
  const nameFields = spellItem
    ? field('Spell', `<select data-bind="gear.${i}.spell" data-rerender="true"><option value="">Choose a Spell</option>${spellNames.map((name) => `<option ${item.spell === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>`, 'gear-wide')
      + field('Rank', `<input type="number" min="1" max="20" step="1" data-bind="gear.${i}.rank" data-rerender="true" value="${esc(item.rank)}">`)
    : field('Name', `<input data-bind="gear.${i}.name" value="${esc(item.name)}" maxlength="80" placeholder="${item.kind === 'potion' ? 'e.g. Healing Potion' : 'e.g. Enchanted Toe Ring'}">`, 'gear-wide');
  const id = esc(item.id);
  const label = gearName(item) || `New ${KIND_LABELS[item.kind].toLowerCase()}`;
  const open = openGear.has(item.id) || !gearName(item);
  const qty = Number(item.qty) || 1;
  const head = `<div class="gear-row">
      <div class="gear-row-name"><strong>${esc(label)}</strong> <span class="tag">${esc(KIND_LABELS[item.kind])}</span>
        ${bonus ? `<span class="muted micro">${esc(bonus)}${equipped ? '' : ' (not equipped)'}</span>` : ''}</div>
      <div class="qty-stepper" role="group" aria-label="Quantity of ${esc(label)}">
        <button type="button" class="secondary small" data-gear-qty="${id}:-1" ${qty <= 1 ? 'disabled' : ''} aria-label="One fewer">−</button>
        <input type="number" min="1" step="1" data-bind="gear.${i}.qty" data-rerender="true" value="${esc(item.qty)}" aria-label="Quantity">
        <button type="button" class="secondary small" data-gear-qty="${id}:1" aria-label="One more">+</button>
      </div>
      <select class="gear-where" data-bind="gear.${i}.location" data-rerender="true" aria-label="Where is ${esc(label)}?">${gearLocationOptions(item)}</select>
      <div class="gear-row-actions">
        ${item.kind === 'potion' || item.kind === 'scroll' ? `<button type="button" class="secondary small" data-gear-use="${id}">Use one</button>` : ''}
        <button type="button" class="secondary small" data-gear-toggle="${id}" aria-expanded="${open}">${open ? 'Done' : 'Edit'}</button>
        <button type="button" class="icon-button" data-remove-gear="${id}" aria-label="Remove ${esc(label)}">×</button>
      </div>
    </div>`;
  if (!open) return `<div class="item-card gear-card compact ${equipped ? 'equipped' : ''}">${head}</div>`;
  return `<div class="item-card gear-card ${equipped ? 'equipped' : ''}">
    ${head}
    <p class="muted micro gear-status">${equipped ? `Equipped · ${esc(slot.label)} · bonuses apply` : 'Not equipped · no bonuses'}</p>
    <div class="fields gear-fields">
      ${field('Type', `<select data-bind="gear.${i}.kind" data-rerender="true">${ITEM_KINDS.map(([kind, label]) => `<option value="${kind}" ${item.kind === kind ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
      ${nameFields}
      ${item.kind === 'weapon' ? field('Weapon Skill', `<select data-bind="gear.${i}.weaponSkill" data-rerender="true">${weaponSkillOptions(item.weaponSkill)}</select>`, 'gear-wide') : ''}
      ${item.location === 'holding' ? `<label class="check gear-check"><input type="checkbox" data-bind="gear.${i}.twoHanded" ${item.twoHanded ? 'checked' : ''}> Limitation: Two-Handed (uses both hands)</label>` : ''}
      ${item.location === 'accessories' ? field('Accessory type', `<select data-bind="gear.${i}.accessoryType" data-rerender="true">${ACCESSORY_TYPES.map(([v, label]) => `<option value="${v}" ${item.accessoryType === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`) : ''}
    </div>
    ${field('Description <span class="optional">optional</span>', `<textarea data-bind="gear.${i}.description" maxlength="300" rows="2">${esc(item.description)}</textarea>`)}
    ${bonusPanel(`gear.${i}`, item, 'Bonuses when equipped', item.kind === 'weapon' ? 'Adds to this weapon’s attacks.' : 'Adds to all your attacks while this item is equipped.')}
    ${item.kind === 'potion' ? '<p class="muted micro">Single use. In combat, no more than one potion every other round (Potion Sickness).</p>' : ''}
    ${item.kind === 'spellbook' ? `<div class="gear-use"><button type="button" class="secondary small" data-gear-read="${esc(item.id)}" ${item.spell && Number(item.rank) >= 1 ? '' : 'disabled'}>Read it</button><span class="muted micro">Grants the Spell at its Rank, then the book disappears.</span></div>` : ''}
    ${item.kind === 'scroll' ? '<p class="muted micro">Casts the Spell once at its set Rank for no Mana, then turns to dust.</p>' : ''}
  </div>`;
}

function startingPossessions() {
  const weapon = state.combatType === 'weapon' && state.combat;
  const weaponName = weapon ? (state.customWeapon.trim() ? `${state.customWeapon.trim()} (${state.combat})` : state.combat) : '';
  const clothing = Object.entries(state.clothing).filter(([, text]) => String(text || '').trim());
  const items = state.items.map((item, index) => ({ item, index })).filter(({ item }) => String(item.name || '').trim());
  if (!weapon && !clothing.length && !items.length) return '<p class="muted">Nothing from character creation yet.</p>';
  return `<div class="table-wrap"><table class="gear-start"><tbody>
    ${weapon ? `<tr><td><strong>${esc(weaponName)}</strong><br><span class="muted micro">Starting weapon</span></td>
      <td><select data-bind="weaponLocation" data-rerender="true" aria-label="Where is ${esc(weaponName)}?">${locationOptions(state.weaponLocation, false, 'weapon')}</select>
      ${state.weaponLocation === 'holding' ? `<label class="check"><input type="checkbox" data-bind="weaponTwoHanded" ${state.weaponTwoHanded ? 'checked' : ''}> Two-Handed</label>` : ''}</td><td></td></tr>` : ''}
    ${clothing.map(([field, text]) => `<tr><td><strong>${esc(text)}</strong><br><span class="muted micro">Starting clothing</span></td>
      <td>Worn · ${esc(GEAR_SLOTS.find((x) => x.key === CLOTHING_SLOTS[field]).label)}</td>
      <td><button type="button" class="secondary small" data-take-off="${field}">Take off</button></td></tr>`).join('')}
    ${items.map(({ item, index }) => `<tr><td><strong>${esc(item.name)}</strong>${item.qty > 1 ? ` ×${esc(item.qty)}` : ''}<br><span class="muted micro">${item.kind === 'useful' ? 'Interesting / useful item' : 'Weird stuff'}</span></td>
      <td><select data-item-index="${index}" data-item-field="location" aria-label="Where is ${esc(item.name)}?">${locationOptions(item.location, true, `item:${item.id}`)}</select></td>
      <td><button type="button" class="secondary small" data-remove-starting="${index}">Remove</button></td></tr>`).join('')}
  </tbody></table></div>`;
}

function equipmentStep() {
  const d = derived(state);
  const issues = equipmentErrors(state);
  const usage = slotUsage(state);
  const bonus = gearStatBonuses(state);
  const enhanced = enhancedStats(state);
  const boosted = STAT_KEYS.filter((key) => bonus[key]);
  return `
    <p class="eyebrow">STEP 11 · EQUIPMENT</p>
    <h1>Gear up.</h1>
    <p class="intro">Only items in your Gear Slots give bonuses; items in the Inventory or Hotlist don't. Inventory items are weightless, but you can only put away what you can lift. Keep this page open while you play: add loot as you find it and use potions and scrolls from here.</p>
    <section class="panel">
      <div class="panel-head"><h2>Items</h2><span class="ref">${gearItems(state).length} carried</span></div>
      ${quickAddPanel()}
      ${state.gear.map(gearCard).join('') || '<p class="muted">No items yet. Add what your crawler has found, bought or crafted.</p>'}
      ${skillNamesList()}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Wealth & lifting</h2>${sourceRef('Gear pp. 98-99')}</div>
      <div class="fields">
        <label class="field"><span class="field-label">Gold coins</span><input type="number" min="0" step="1" data-bind="gold" data-rerender="true" value="${esc(state.gold)}"><small>All your gold fits in one Inventory slot.</small></label>
        <label class="field"><span class="field-label">Misc. Junk</span><input type="number" min="0" step="1" data-bind="miscJunk" data-rerender="true" value="${esc(state.miscJunk)}"><small>Spend 1 point to find an innocuous item. Sells for 1 gold each.</small></label>
      </div>
      ${quickGoldPanel()}
      <p class="muted">Lifting limit: <strong>${d.lift ? `${d.lift} lb` : '—'}</strong>${d.lift ? ` (Strength ${enhanced.Str} × 15)` : ''}.</p>
      ${boosted.length ? `<p class="muted micro">Equipped gear raises Enhanced ${boosted.map((key) => `${key} to ${enhanced[key]} (${bonus[key] > 0 ? '+' : ''}${bonus[key]})`).join(', ')}. Unenhanced Stats don't change.</p>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Gear Slots</h2>${sourceRef('p. 98')}</div>
      <div class="table-wrap"><table class="gear-slots"><tbody>${GEAR_SLOTS.map((slot) => {
        const entries = usage[slot.key];
        const used = slotCount(slot, entries);
        const over = used > slot.max;
        return `<tr class="${over ? 'over' : ''}"><th scope="row">${esc(slot.label)}</th>
          <td>${entries.length ? entries.map((x) => `${esc(x.label)}${x.hands === 2 ? ' (two hands)' : ''}`).join(', ') : '<span class="muted">Empty</span>'}</td>
          <td class="nowrap ${over ? 'error' : 'muted'}">${used}/${slot.max}${slot.unit === 'hand' ? ' hands' : ''}</td></tr>`;
      }).join('')}</tbody></table></div>
      ${issues.length ? `<div class="validation-box"><strong>Fix these:</strong><ul>${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>From character creation</h2>${sourceRef('Starting Gear step')}</div>
      ${startingPossessions()}
    </section>
    ${actions('advancement', 'party')}
  `;
}

// Suggestions for a bonus's Skill or Spell name.
function skillNamesList() {
  return `<datalist id="gear-skill-names">${[...new Set([...allSkills(state).map((x) => x.name), ...skillCatalog.map((x) => x.name)])].map((name) => `<option value="${esc(name)}">`).join('')}</datalist>`;
}

// Party buffs being edited: id -> { buff, saved, isNew }. Edits go to the
// draft copy and reach the crawler only on Save; `saved` is the draft as it
// was opened, to tell whether anything changed.
const buffDrafts = new Map();

function openBuffDraft(buff, isNew = false) {
  const copy = normalizePartyBuff(JSON.parse(JSON.stringify(buff)));
  buffDrafts.set(copy.id, { buff: copy, saved: JSON.stringify(copy), isNew });
}

const unsavedBuffs = () => [...buffDrafts.values()].filter((x) => JSON.stringify(x.buff) !== x.saved || (x.isNew && buffLabel(x.buff)));

function buffCard(buff, i) {
  const field = (label, html, cls = '') => `<label class="field ${cls}"><span class="field-label">${label}</span>${html}</label>`;
  const id = esc(buff.id);
  const draft = buffDrafts.get(buff.id);
  const label = buffLabel(buff) || 'New Party buff';
  const bonus = bonusText(buff);
  const head = `<div class="gear-row buff-row">
      <div class="gear-row-name"><strong>${esc(label)}</strong>
        ${bonus ? `<span class="muted micro">${esc(bonus)}${buff.active ? '' : ' (not active)'}</span>` : ''}</div>
      ${draft?.isNew ? '<span></span>' : `<label class="check"><input type="checkbox" data-bind="party.buffs.${i}.active" ${buff.active ? 'checked' : ''}> Active</label>`}
      <div class="gear-row-actions">
        ${draft ? '' : `<button type="button" class="secondary small" data-buff-edit="${id}">Edit</button>`}
        <button type="button" class="icon-button" data-remove-buff="${id}" aria-label="Remove ${esc(label)}">×</button>
      </div>
    </div>`;
  if (!draft) return `<div class="item-card gear-card compact ${buff.active ? 'equipped' : ''}">${head}</div>`;
  const edit = draft.buff;
  const bind = `buffDraft.${id}`;
  const problems = draft.problems || [];
  return `<div class="item-card gear-card buff-editor ${buff.active ? 'equipped' : ''}">
    ${head}
    <p class="muted micro gear-status">${draft.isNew ? 'New buff · not on your sheet until you save it' : 'Editing · changes reach your sheet when you save'}</p>
    <div class="fields gear-fields">
      ${field('Buff name', `<input data-bind="${bind}.name" value="${esc(edit.name)}" maxlength="80" placeholder="e.g. Protective Aura">`, 'gear-wide')}
      ${field('From <span class="optional">optional</span>', `<input data-bind="${bind}.from" value="${esc(edit.from)}" maxlength="60" placeholder="Who gives it, e.g. Donut">`, 'gear-wide')}
    </div>
    ${field('Description <span class="optional">optional</span>', `<textarea data-bind="${bind}.description" maxlength="300" rows="2" placeholder="e.g. Only while she’s in the party">${esc(edit.description)}</textarea>`)}
    ${bonusPanel(bind, edit, 'Bonuses while active', 'Adds to all your attacks while this buff is active.', false)}
    ${problems.length ? `<div class="validation-box"><strong>Fix these to save:</strong><ul>${problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    <div class="buff-save">
      <button type="button" class="primary" data-buff-save="${id}">Save buff</button>
      <button type="button" class="secondary" data-buff-cancel="${id}">Cancel</button>
    </div>
  </div>`;
}

function partyStep() {
  const party = state.party;
  const issues = partyErrors(state);
  return `
    <p class="eyebrow">STEP 12 · PARTY <span class="optional">optional</span></p>
    <h1>Crawling with friends?</h1>
    <p class="intro">Skip this step if you crawl alone. The Party's name and notes go in the sheet's notes. Party buffs work like magic items: up to ${MAX_ACTIVE_BUFFS} can be active, listed in the sheet's External Buffs box. While a buff is active, its Stat bonuses raise your Enhanced Stats, its DR is added in the sheet's DR Buffs box, and its Skill and damage bonuses apply.</p>
    <section class="panel">
      <div class="panel-head"><h2>Party</h2></div>
      <div class="fields">
        <label class="field"><span class="field-label">Party name <span class="optional">optional</span></span><input data-bind="party.name" value="${esc(party.name)}" maxlength="60" placeholder="e.g. Royal Court of Princess Donut"></label>
      </div>
      <label class="field"><span class="field-label">Notes <span class="optional">optional</span></span><textarea data-bind="party.notes" maxlength="500" rows="3" placeholder="Who's in it, what you've agreed, anything worth remembering">${esc(party.notes)}</textarea></label>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Buffs</h2><span class="ref">${activePartyBuffs(state).length}/${MAX_ACTIVE_BUFFS} active</span></div>
      ${[...party.buffs, ...[...buffDrafts.values()].filter((x) => x.isNew).map((x) => x.buff)].map(buffCard).join('') || '<p class="muted">No Party buffs. Add one when a party member gives the whole party a bonus, e.g. +2 DR while she’s in the party.</p>'}
      <button type="button" class="secondary" data-add-buff>+ Add Party buff</button>
      ${skillNamesList()}
      <p class="muted micro">Active buffs go in the sheet's External Buffs box, which holds ${MAX_ACTIVE_BUFFS}. Untick Active when a buff doesn't apply (say, she leaves the party) to keep it without its bonuses.</p>
      ${issues.length ? `<div class="validation-box"><strong>Fix these:</strong><ul>${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </section>
    ${actions('equipment', 'review')}
  `;
}

function renderMain() {
  const renderers = {
    identity: identityStep,
    backgrounds: backgroundsStep,
    combat: combatStep,
    stats: statsStep,
    story: storyStep,
    gear: gearStep,
    hotlist: hotlistStep,
    attacks: attacksStep,
    raceclass: raceClassStep,
    advancement: advancementStep,
    equipment: equipmentStep,
    party: partyStep,
    review: reviewStep,
    account: () => accountView(state),
    profile: profileView,
    workshop: () => workshopView(state),
    'build-edit': buildEditorView,
    about: aboutView,
    changelog: changelogView,
  };
  main.innerHTML = renderers[activeStep]();
}

function render() {
  renderAccountBar();
  renderNav();
  renderMain();
  renderSummary();
}

function resetDownstreamAfterOrigin() {
  state.backgrounds = Array.from({ length: 4 }, () => ({ option: null, picks: [] }));
  state.combatType = '';
  state.combat = '';
  state.customWeapon = '';
  state.attackSheet = [];
  state.weaponLocation = '';
  state.spellSlot = '';
  state.potionsSlot = '';
}

nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-nav]');
  if (button) navigate(button.dataset.nav);
});

main.addEventListener('click', async (event) => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) return navigate(navButton.dataset.nav);
  if (await accountClick(event)) return;
  if (await workshopClick(event, workshopContext)) return;

  const continueBackgrounds = event.target.closest('[data-action="continue-backgrounds"]');
  if (continueBackgrounds) {
    if (!state.kind) {
      setNotice('Choose Human or the earth-animal path before selecting backgrounds.');
      return navigate('identity');
    }
    const missingStage = firstIncompleteBackgroundStage(state);
    if (missingStage !== -1) {
      activeBackgroundStage = missingStage;
      renderMain();
      renderNav();
      renderSummary();
      const stage = backgrounds[state.kind][missingStage];
      setNotice(`Complete ${stage.name}: choose one background and exactly two Skills.`);
      requestAnimationFrame(() => {
        document.querySelector('.stage-tabs .active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
        document.querySelector('.skill-choice-box, .bg-grid')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }
    return navigate('combat');
  }

  const continueStats = event.target.closest('[data-action="continue-stats"]');
  if (continueStats) {
    const statIssues = statValidationErrors(state);
    if (statIssues.length) {
      setNotice(statIssues[0]);
      renderMain();
      return;
    }
    return navigate('story');
  }

  const raceChoice = event.target.closest('[data-race]');
  if (raceChoice) {
    // Re-choosing the selected custom Race keeps its snapshot.
    chooseRace(raceChoice.dataset.race, races.some((x) => x.name === raceChoice.dataset.race) ? null : state.customRace);
    saveState();
    return render();
  }

  const classChoice = event.target.closest('[data-class]');
  if (classChoice) {
    chooseClass(classChoice.dataset.class, classes.some((x) => x.name === classChoice.dataset.class) ? null : state.customClass);
    saveState();
    return render();
  }

  const action = event.target.closest('[data-action="add-level"], [data-action="undo-level"], [data-action="add-skill-up"]');
  if (action?.dataset.action === 'add-level') {
    const points = levelPoints(levelDraft);
    const total = Object.values(points).reduce((a, b) => a + b, 0);
    if (total !== LEVEL_STAT_POINTS) return setNotice(`Assign exactly ${LEVEL_STAT_POINTS} Stat points (${total} assigned).`);
    state.levelUps = [...(state.levelUps || []), { floor: levelDraft.floor || state.floor, stats: points }];
    levelDraft = { floor: '', stats: {} };
    saveState();
    return render();
  }
  if (action?.dataset.action === 'undo-level') {
    state.levelUps = (state.levelUps || []).slice(0, -1);
    saveState();
    return render();
  }
  if (action?.dataset.action === 'add-skill-up') {
    const isCustom = skillUpDraft.skill === CUSTOM_SKILL;
    const typed = draftSkillName();
    if (!typed) return setNotice(isCustom ? 'Name the custom Skill.' : 'Choose a Skill or Spell to log.');
    // A custom name the crawler or the book already has logs that Skill.
    const existing = [...allSkills(state).map((x) => x.name), ...skillCatalog.map((x) => x.name)].find((x) => x.toLowerCase() === typed.toLowerCase());
    const name = existing || typed;
    const maxed = maxedSkill(name);
    if (maxed) return setNotice(`${name} is already at its Rank ${maxed.limit} maximum.`);
    if (!(Number(skillUpDraft.ranks) >= 1)) return setNotice('Ranks gained must be 1 or more.');
    const { customName, customStat, customCheck, customDescription, ...entry } = skillUpDraft;
    state.skillUps = [...(state.skillUps || []), {
      ...entry, skill: name, floor: skillUpDraft.floor || state.floor,
      ...(isCustom && !existing ? { custom: { stat: customStat, check: customCheck, description: customDescription.trim() } } : {}),
    }];
    skillUpDraft = { ...skillUpDraft, skill: '', ranks: '1', note: '', customName: '', customStat: 'None', customCheck: 'Unopposed', customDescription: '' };
    if (isCustom && existing) setNotice(`${name} is already a Skill, so the Ranks were logged to it.`);
    saveState();
    return render();
  }

  const deleteSkillUp = event.target.closest('[data-delete-skill-up]');
  if (deleteSkillUp) {
    state.skillUps = state.skillUps.filter((_, i) => i !== Number(deleteSkillUp.dataset.deleteSkillUp));
    saveState();
    return render();
  }

  const clearChoice = event.target.closest('[data-clear]');
  if (clearChoice) {
    if (clearChoice.dataset.clear === 'race') {
      state.race = '';
      state.raceChoices = {};
      state.customRace = null;
    } else {
      state.className = '';
      state.classChoices = {};
      state.customClass = null;
    }
    saveState();
    return render();
  }

  const origin = event.target.closest('[data-origin]');
  if (origin) {
    if (state.kind !== origin.dataset.origin) {
      state.kind = origin.dataset.origin;
      state.species = '';
      state.size = state.kind === 'human' ? '4' : '';
      resetDownstreamAfterOrigin();
      activeBackgroundStage = 0;
      saveState();
    }
    return render();
  }

  const stage = event.target.closest('[data-stage]');
  if (stage) {
    activeBackgroundStage = Number(stage.dataset.stage);
    return renderMain();
  }

  const background = event.target.closest('[data-background]');
  if (background) {
    const index = Number(background.dataset.background);
    state.backgrounds[activeBackgroundStage] = { option: index, picks: [] };
    state.attackSheet = [];
    saveState();
    return render();
  }

  const skill = event.target.closest('[data-skill]');
  if (skill && !skill.disabled) {
    const name = skill.dataset.skill;
    const selection = state.backgrounds[activeBackgroundStage];
    if (selection.picks.includes(name)) selection.picks = selection.picks.filter((x) => x !== name);
    else if (selection.picks.length < 2) selection.picks.push(name);
    else setNotice('Choose exactly two Skills. Remove one before selecting another.');
    state.attackSheet = [];
    saveState();
    return render();
  }

  const combatType = event.target.closest('[data-combat-type]');
  if (combatType) {
    if (state.combatType !== combatType.dataset.combatType) {
      state.combatType = combatType.dataset.combatType;
      state.combat = '';
      state.customWeapon = '';
      state.weaponLocation = '';
      state.spellSlot = '';
      state.potionsSlot = '';
      state.attackSheet = [];
      saveState();
    }
    return render();
  }

  const combat = event.target.closest('[data-combat]');
  if (combat && !combat.disabled) {
    state.combat = combat.dataset.combat;
    state.customWeapon = '';
    state.weaponLocation = '';
    state.spellSlot = '';
    state.potionsSlot = '';
    state.attackSheet = [];
    saveState();
    return render();
  }

  const storyMode = event.target.closest('[data-story-mode]');
  if (storyMode) {
    const [key, mode] = storyMode.dataset.storyMode.split(':');
    state.storyMode[key] = mode;
    state.story[key] = '';
    saveState();
    return renderMain();
  }

  if (raceClassClick(event)) return;
  if (gearClick(event)) return;
  if (partyClick(event)) return;

  const addItem = event.target.closest('[data-add-item]');
  if (addItem) {
    const id = `item-${Date.now()}-${state.items.length}`;
    state.items.push({ id, name: '', qty: 1, kind: addItem.dataset.addItem, location: 'inventory', notes: '' });
    saveState();
    return renderMain();
  }

  const removeItem = event.target.closest('[data-remove-item]');
  if (removeItem) {
    state.items = state.items.filter((item) => item.id !== removeItem.dataset.removeItem);
    saveState();
    return render();
  }

  const hotlistMove = event.target.closest('[data-hotlist-move]');
  if (hotlistMove && !hotlistMove.disabled) {
    const [fromText, deltaText] = hotlistMove.dataset.hotlistMove.split(':');
    const from = Number(fromText);
    const to = Math.max(1, Math.min(10, from + Number(deltaText)));
    if (reorderHotlist(from, to)) {
      render();
      setNotice(`Moved Hotlist slot ${from} to slot ${to}.`);
    }
    return;
  }

  const newCrawler = event.target.closest('[data-action="new-crawler"]');
  if (newCrawler) {
    if (!canStartNewCrawler()) return openEraseDialog();
    if (confirm('Start over? This clears the current crawler and assigns a new crawler number.')) startNewCrawler();
    return;
  }

  const download = event.target.closest('[data-action="download"]');
  if (download && !download.disabled) {
    exporting = true;
    renderMain();
    try {
      await downloadCharacterSheet(state);
      setNotice('Character sheet generated.');
    } catch (error) {
      console.error(error);
      setNotice(`PDF export failed: ${error.message || error}`, 6000);
    } finally {
      exporting = false;
      renderMain();
    }
  }
});

function startNewCrawler() {
  // Rebuilding the form synchronously while the click/confirm interaction is
  // still unwinding can leave newly-created text inputs unable to receive
  // keyboard focus in some browsers (notably Firefox). Finish the current
  // event first, then create and focus the fresh crawler form.
  document.activeElement?.blur?.();
  draggedHotlistSlot = null;
  touchHotlistDrag = null;
  exporting = false;
  window.setTimeout(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLink(null);
    state = initialState();
    activeStep = 'identity';
    activeBackgroundStage = 0;
    saveState();
    render();
    requestAnimationFrame(() => {
      main.querySelector('[data-bind="name"]')?.focus();
    });
    setNotice('New crawler file opened.');
  }, 0);
}

// Without a verified account the draft can't be saved, so starting over
// would destroy it: offer to sign in and verify first, or erase it knowingly.
function openEraseDialog() {
  const name = state.name || 'This crawler';
  const signedIn = Boolean(account.user);
  eraseDialog.innerHTML = `
    <form method="dialog">
      <p class="eyebrow">START A NEW CRAWLER</p>
      <h2 id="erase-title">Keep ${esc(name)} first?</h2>
      <p>You can only keep one crawler until you ${signedIn ? 'verify your email' : 'sign in and verify your email'}. After that, you can save up to ${account.limit} crawlers to your account.</p>
      <div class="erase-warning" role="alert"><strong>Starting over erases ${esc(name)}.</strong> It isn't saved anywhere else, so it can't be recovered.</div>
      <div class="erase-actions">
        <button class="primary" value="keep">${signedIn ? 'Verify email to keep it' : 'Sign in to keep it'}</button>
        <button class="secondary danger-button" value="erase">Erase it and start over</button>
        <button class="secondary" value="cancel">Cancel</button>
      </div>
    </form>`;
  eraseDialog.returnValue = '';
  eraseDialog.showModal();
  eraseDialog.querySelector('[value="keep"]').focus();
}

const eraseDialog = document.createElement('dialog');
eraseDialog.className = 'erase-dialog';
eraseDialog.setAttribute('aria-labelledby', 'erase-title');
document.body.append(eraseDialog);
eraseDialog.addEventListener('close', () => {
  if (eraseDialog.returnValue === 'keep') {
    if (!account.user) account.mode = 'login';
    navigate('account');
  } else if (eraseDialog.returnValue === 'erase') {
    startNewCrawler();
  }
});

// Race/Class selection. `custom` is the snapshot of a custom build (workshop.js), or null for a book entry.
function chooseRace(name, custom = null) {
  if (state.race !== name || state.customRace?.id !== custom?.id) state.raceChoices = {};
  state.race = name;
  state.customRace = custom;
  const classIssues = state.className ? raceClassRequirementIssues(state, findClass(state.className, state)) : [];
  if (classIssues.length) {
    setNotice(`${state.className} isn’t available to ${state.race}, so the Class was removed.`);
    state.className = '';
    state.classChoices = {};
    state.customClass = null;
  }
}

function chooseClass(name, custom = null) {
  if (state.className !== name || state.customClass?.id !== custom?.id) state.classChoices = {};
  state.className = name;
  state.customClass = custom;
}

// "Use for this crawler" on a workshop build (also run quietly after its author saves an edit).
function useBuild(build, { quiet = false } = {}) {
  const custom = snapshot(build);
  const entry = buildEntry(build.data);
  const label = build.kind === 'class' ? 'Class' : 'Race';
  const trial = build.kind === 'class'
    ? { ...state, className: entry.name, customClass: custom, classChoices: {} }
    : { ...state, race: entry.name, customRace: custom, raceChoices: {} };
  const issues = raceClassRequirementIssues(trial, build.kind === 'class' ? findClass(entry.name, trial) : findRace(entry.name, trial));
  if (issues.length) {
    if (!quiet) setNotice(`${entry.name} ${label} requires ${issues.join('; ')}.`, 6000);
    return;
  }
  if (build.kind === 'class') chooseClass(entry.name, custom);
  else chooseRace(entry.name, custom);
  saveState();
  if (quiet) return;
  setNotice(`${state.name || 'This crawler'} is now using the ${entry.name} ${label}.`, 4000);
  navigate('raceclass');
}

const workshopContext = {
  get state() { return state; },
  renderMain, setNotice, navigate, useBuild,
};

const gearById = (id) => state.gear.find((x) => x.id === id);
// A gear item or Party buff, for the shared bonus editor's buttons.
const bonusOwner = (id) => buffDrafts.get(id)?.buff || gearById(id) || state.party.buffs.find((x) => x.id === id);

// Race & Class step: Show more, Expand All / Collapse All; true if handled.
function raceClassClick(event) {
  const desc = event.target.closest('[data-rc-desc]');
  if (desc) {
    const key = desc.dataset.rcDesc;
    if (rcOpen.descriptions.has(key)) rcOpen.descriptions.delete(key);
    else rcOpen.descriptions.add(key);
    renderMain();
    return true;
  }
  const expand = event.target.closest('[data-rc-expand]');
  if (!expand) return false;
  const open = expand.dataset.rcExpand === 'expand';
  rcCards.forEach(([key]) => {
    rcOpen.benefits[open ? 'add' : 'delete'](key);
    rcOpen.descriptions[open ? 'add' : 'delete'](key);
  });
  renderMain();
  main.querySelector('[data-rc-expand]')?.focus();
  return true;
}

// Party step buttons (the bonus editor's go through gearClick); true if handled.
function partyClick(event) {
  const target = event.target.closest('[data-add-buff], [data-remove-buff], [data-buff-edit], [data-buff-save], [data-buff-cancel]');
  if (!target) return false;
  const { removeBuff, buffEdit, buffSave, buffCancel } = target.dataset;
  if (buffEdit) {
    openBuffDraft(state.party.buffs.find((x) => x.id === buffEdit));
    renderMain();
    main.querySelector(`[data-bind="buffDraft.${buffEdit}.name"]`)?.focus();
    return true;
  } else if (buffCancel) {
    buffDrafts.delete(buffCancel);
    renderMain();
    return true;
  } else if (buffSave) {
    const draft = buffDrafts.get(buffSave);
    const index = state.party.buffs.findIndex((x) => x.id === buffSave);
    draft.problems = buffErrors(draft.buff, index === -1 ? state.party.buffs.length : index);
    if (draft.problems.length) {
      renderMain();
      setNotice(draft.problems[0]);
      return true;
    }
    // Active is set on the list, not in the editor. A new buff starts active
    // unless the sheet's 3 External Buffs are already taken.
    const full = activePartyBuffs(state).length >= MAX_ACTIVE_BUFFS;
    const buff = normalizePartyBuff({ ...draft.buff, active: index === -1 ? !full : state.party.buffs[index].active });
    if (index === -1) state.party.buffs.push(buff);
    else state.party.buffs[index] = buff;
    buffDrafts.delete(buffSave);
    setNotice(index === -1 && full
      ? `Saved ${buffLabel(buff)}, but not active: ${MAX_ACTIVE_BUFFS} External Buffs already are. Untick one to make room.`
      : `Saved ${buffLabel(buff)} to your sheet.`, index === -1 && full ? 6000 : 2600);
  } else if (removeBuff) {
    const draft = buffDrafts.get(removeBuff);
    const buff = state.party.buffs.find((x) => x.id === removeBuff) || draft?.buff;
    if (buff && buffLabel(buff) && !confirm(`Remove ${buffLabel(buff)}?`)) return true;
    buffDrafts.delete(removeBuff);
    state.party.buffs = state.party.buffs.filter((x) => x.id !== removeBuff);
  } else {
    if (state.party.buffs.length + buffDrafts.size >= MAX_PARTY_BUFFS) {
      setNotice(`Keep the Party buff list to ${MAX_PARTY_BUFFS} entries.`);
      return true;
    }
    const buff = newPartyBuff();
    openBuffDraft(buff, true);
    renderMain();
    main.querySelector(`[data-bind="buffDraft.${buff.id}.name"]`)?.focus();
    return true;
  }
  saveState();
  render();
  return true;
}

// Equipment step buttons; true if handled.
function gearClick(event) {
  if (event.target.closest('[data-portrait-remove]')) {
    if (!confirm('Remove the portrait?')) return true;
    state.portrait = '';
    saveState();
    render();
    return true;
  }
  const target = event.target.closest('[data-remove-gear], [data-gear-use], [data-gear-read], [data-add-gear-skill], [data-remove-gear-skill], [data-add-gear-damage], [data-remove-gear-damage], [data-take-off], [data-remove-starting], [data-gear-qty], [data-gear-toggle]');
  if (!target) return false;
  const { removeGear, gearUse, gearRead, addGearSkill, removeGearSkill, addGearDamage, removeGearDamage, takeOff, removeStarting, gearQty, gearToggle } = target.dataset;
  if (gearToggle) {
    if (openGear.has(gearToggle)) openGear.delete(gearToggle);
    else openGear.add(gearToggle);
    renderMain();
    return true;
  } else if (gearQty) {
    const [id, by] = gearQty.split(':');
    const item = gearById(id);
    item.qty = Math.max(1, (Number(item.qty) || 1) + Number(by));
  } else if (removeGear) {
    const item = gearById(removeGear);
    if (item && gearName(item) && !confirm(`Remove ${gearName(item)}?`)) return true;
    state.gear = state.gear.filter((x) => x.id !== removeGear);
  } else if (gearUse) {
    const item = gearById(gearUse);
    if (item.kind === 'scroll' && !confirm(`Cast ${gearName(item)}? The scroll turns to dust.`)) return true;
    const left = Math.max(0, (Number(item.qty) || 1) - 1);
    if (left) item.qty = left;
    else state.gear = state.gear.filter((x) => x !== item);
    setNotice(`Used 1 ${gearName(item)}${left ? ` (${left} left)` : '; none left'}.`);
  } else if (gearRead) {
    if (!readSpellbook(gearById(gearRead))) return true;
  } else if (addGearSkill) {
    gearBonusesOpen.set(addGearSkill, true);
    bonusOwner(addGearSkill).bonuses.skills.push({ name: '', ranks: '', type: 'rank' });
  } else if (removeGearSkill) {
    const [id, j] = removeGearSkill.split(':');
    bonusOwner(id).bonuses.skills.splice(Number(j), 1);
  } else if (addGearDamage) {
    gearBonusesOpen.set(addGearDamage, true);
    bonusOwner(addGearDamage).bonuses.damage.push({ amount: '', condition: '' });
  } else if (removeGearDamage) {
    const [id, j] = removeGearDamage.split(':');
    bonusOwner(id).bonuses.damage.splice(Number(j), 1);
  } else if (takeOff) {
    // Starting clothing becomes an Inventory item so its slot is free.
    const item = normalizeGearItem({ ...newGearItem('item'), name: state.clothing[takeOff].trim(), description: 'Starting clothing' });
    state.gear.push(item);
    state.clothing[takeOff] = '';
    setNotice(`${item.name} is in the Inventory now.`);
  } else if (removeStarting) {
    const item = state.items[Number(removeStarting)];
    if (!confirm(`Remove ${item.name}? It's deleted from this crawler.`)) return true;
    // Creation still needed it (one useful item, some weird stuff), so remember it existed.
    state.removedStarting[item.kind] = (state.removedStarting[item.kind] || 0) + 1;
    state.items.splice(Number(removeStarting), 1);
  }
  saveState();
  render();
  return true;
}

// A spellbook grants its Spell at its Rank (p. 99): logged in the Skill & Spell
// log on the current floor, raising the Spell to that Rank if it's lower.
function readSpellbook(item) {
  const rank = Number(item.rank);
  const name = gearName(item);
  const known = allSkills(state).find((x) => x.name.toLowerCase() === item.spell.toLowerCase());
  const current = known ? known.rank - (known.gearRanks || 0) : 0;
  const ranks = Math.max(0, rank - current);
  const floor = currentFloor(state);
  const message = ranks
    ? `Read ${name}? ${item.spell} becomes Rank ${rank} (logged as +${ranks} on Floor ${floor} in Level & Skills), and the book disappears.`
    : `You already have ${item.spell} at Rank ${current}, so ${name} won't raise it. Read it anyway? The book disappears.`;
  if (!confirm(message)) return false;
  if (ranks) state.skillUps.push({ skill: item.spell, ranks: String(ranks), floor: String(floor), how: 'Potion or item', note: `Read ${name}` });
  const left = Math.max(0, (Number(item.qty) || 1) - 1);
  if (left) item.qty = left;
  else state.gear = state.gear.filter((x) => x !== item);
  setNotice(ranks ? `${item.spell} is now Rank ${rank}.` : `${name} was read.`);
  return true;
}

async function saveToAccount() {
  if (!verified()) return navigate('account');
  try {
    const saved = await saveCharacter(state);
    // Drafts save as they are, but say what's wrong with the gear.
    const gearIssues = equipmentErrors(state);
    if (gearIssues.length) setNotice(`Saved ${saved.name} to your account, but: ${gearIssues.join(' ')}`, 8000);
    else setNotice(`Saved ${saved.name} to your account.`);
  } catch (error) {
    setNotice(error.message, 6000);
    if (error.status === 401 || error.status === 403) {
      await refreshAccount();
      return navigate('account');
    }
  }
  render();
}

// Clicks on account controls in the header or the My Crawlers page; true if handled.
async function accountClick(event) {
  event.target.closest('.account-menu')?.removeAttribute('open');
  const target = event.target.closest('[data-action="account"], [data-action="profile"], [data-action="workshop"], [data-action="workshop-locked"], [data-action="save-crawler"], [data-action="sign-out"], [data-account-mode], [data-account-action], [data-open-character], [data-delete-character]');
  if (!target) return false;
  if (target.dataset.action === 'workshop-locked') {
    setNotice(workshopLockedMessage(), 5000);
  } else if (target.dataset.action === 'workshop' && !verified()) {
    setNotice(workshopLockedMessage(), 5000);
  } else if (target.dataset.action === 'account' || target.dataset.action === 'profile' || target.dataset.action === 'workshop') {
    navigate(target.dataset.action);
  } else if (isAccountAction(target.dataset.accountAction)) {
    const message = await accountAction(target.dataset.accountAction);
    if (message) setNotice(message, 5000);
    render();
  } else if (target.dataset.action === 'save-crawler') {
    target.disabled = true;
    await saveToAccount();
  } else if (target.dataset.action === 'sign-out') {
    await signOut();
    setNotice('Signed out. Your draft stays in this browser.');
    if (activeStep === 'profile') activeStep = 'account';
    render();
  } else if (target.dataset.accountMode) {
    account.mode = target.dataset.accountMode;
    account.error = '';
    renderMain();
    main.querySelector('input[name="email"]')?.focus();
  } else if (target.dataset.openCharacter) {
    const id = Number(target.dataset.openCharacter);
    // Already open: go back to it, keeping any unsaved edits.
    if (id === linkedId()) {
      openedCrawler = true;
      navigate('identity');
      return true;
    }
    const hasDraft = state.name || state.kind;
    if (hasDraft && saveStatus(state) !== 'saved' && !confirm('Open this crawler? The unsaved changes to the crawler you have open now will be lost.')) return true;
    try {
      state = normalizeState(await openCharacter(id));
      setLink(id, state);
      activeBackgroundStage = 0;
      saveState();
      openedCrawler = true;
      navigate('identity');
    } catch (error) {
      setNotice(error.message, 6000);
    }
  } else if (target.dataset.deleteCharacter) {
    const id = Number(target.dataset.deleteCharacter);
    const name = account.characters.find((x) => x.id === id)?.name || 'this crawler';
    if (!confirm(`Delete ${name} from your account? This can't be undone.`)) return true;
    try {
      await deleteCharacter(id);
      setNotice(`Deleted ${name}.`);
    } catch (error) {
      setNotice(error.message, 6000);
    }
    render();
  }
  return true;
}

accountBarEl.addEventListener('click', accountClick);

// Closing or reloading the page with an unsaved Party buff asks first.
window.addEventListener('beforeunload', (event) => {
  if (activeStep === 'party' && unsavedBuffs().length) event.preventDefault();
});

// The account menu closes on a click elsewhere or Escape.
document.addEventListener('click', (event) => {
  const menu = accountBarEl.querySelector('.account-menu[open]');
  if (menu && !menu.contains(event.target)) menu.removeAttribute('open');
});
document.addEventListener('keydown', (event) => {
  const menu = accountBarEl.querySelector('.account-menu[open]');
  if (event.key !== 'Escape' || !menu) return;
  menu.removeAttribute('open');
  menu.querySelector('summary').focus();
});

// Shrink an uploaded image to a JPEG data URL that fits the sheet's Portrait
// box (137 x 115 pt) at print quality and stays under PORTRAIT_MAX_CHARS.
async function portraitDataUrl(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That file isn’t an image this browser can read.'));
      img.src = url;
    });
    for (const [max, quality] of [[480, 0.85], [480, 0.7], [360, 0.7], [280, 0.6]]) {
      const scale = Math.min(1, max / image.naturalWidth, (max * 115 / 137) / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; // Transparent areas print white.
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= PORTRAIT_MAX_CHARS) return data;
    }
    throw new Error('That image couldn’t be made small enough. Try a simpler one.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function setPortrait(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return setNotice('Choose an image file.');
  if (file.size > PORTRAIT_MAX_UPLOAD) {
    input.value = '';
    return setNotice(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Portraits must be under ${PORTRAIT_MAX_UPLOAD / 1024 / 1024} MB.`, 5000);
  }
  try {
    state.portrait = await portraitDataUrl(file);
    saveState();
    render();
    setNotice('Portrait added. It goes in the Portrait box on the sheet.');
  } catch (error) {
    input.value = '';
    setNotice(error.message, 5000);
  }
}

// Quick add on the Equipment step; true if handled.
function quickSubmit(event) {
  const form = event.target.closest('[data-quick-gear], [data-quick-gold]');
  if (!form) return false;
  event.preventDefault();
  const data = new FormData(form);
  if (form.matches('[data-quick-gold]')) {
    const amount = Math.max(0, Math.trunc(Number(data.get('amount')) || 0));
    const spend = event.submitter?.value === 'spend';
    const have = Number(state.gold) || 0;
    if (spend && amount > have) {
      setNotice(`You only have ${have} gold.`);
      return true;
    }
    state.gold = String(spend ? have - amount : have + amount);
    setNotice(`${spend ? 'Spent' : 'Added'} ${amount} gold; ${state.gold} left.`);
  } else {
    readQuickGear(form);
    const { kind } = quickGear;
    const { item, error } = quickGearItem(quickGear);
    if (!item) return error && setNotice(error), true;
    const qty = item.qty;
    state.gear.push(item);
    if (kind in CUSTOM_KINDS) openGear.add(item.id);
    Object.assign(quickGear, { name: '', qty: '1', spell: '', rank: '' });
    const ready = item.location === 'holding' || item.location.startsWith('hotlist:');
    const inAttacks = ready ? ' It’s in your Attacks.' : ' It’s listed in your Attacks; tick it there to put it on the sheet, or move it to Holding or the Hotlist.';
    const after = { custom: ' Fill in its details below.', 'custom-weapon': `${inAttacks} Fill in its details below.`, weapon: inAttacks }[kind] || '';
    setNotice(`Added ${qty > 1 ? `${qty} × ` : ''}${gearName(item) || `a custom ${item.kind === 'weapon' ? 'weapon' : 'item'}`}.${after}`, after ? 5000 : undefined);
  }
  saveState();
  render();
  main.querySelector(form.matches('[data-quick-gold]') ? '[data-quick-gold] input' : '[data-quick-gear] input[name="name"], [data-quick-gear] select[name="spell"]')?.focus();
  return true;
}

main.addEventListener('submit', async (event) => {
  if (quickSubmit(event)) return;
  const form = event.target.closest('[data-account-form]');
  if (!form || !isAccountForm(form.dataset.accountForm)) return;
  event.preventDefault();
  const kind = form.dataset.accountForm;
  const data = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, String(value)]));
  account.busy = true;
  renderMain();
  const message = await submitAccountForm(kind, data);
  if (message) {
    setNotice(message, 5000);
    render();
    main.querySelector('input[name="code"]')?.focus();
    return;
  }
  render();
  // Keep what was typed (except passwords) and focus the first field to fix.
  const again = main.querySelector(`[data-account-form="${kind}"]`);
  for (const [key, value] of Object.entries(data)) {
    const input = again?.querySelector(`[name="${key}"]`);
    if (input && input.type !== 'password') input.value = value;
  }
  again?.querySelector('input[name="code"], input[type="password"]')?.focus();
});

main.addEventListener('change', (event) => {
  if (workshopChange(event, workshopContext)) return;
  if (event.target.matches('[data-portrait]')) return setPortrait(event.target);
  if (event.target.matches('[data-quick-kind]')) {
    readQuickGear(event.target.form);
    renderMain();
    return main.querySelector('[data-quick-gear] input[name="name"], [data-quick-gear] select[name="spell"]')?.focus();
  }
  const draft = event.target.closest('[data-level-draft], [data-skill-draft]');
  if (draft) {
    if (draft.dataset.levelDraft === 'floor') levelDraft.floor = draft.value;
    else if (draft.dataset.levelDraft) levelDraft.stats[draft.dataset.levelDraft] = draft.value;
    else skillUpDraft[draft.dataset.skillDraft] = draft.value;
    return renderMain();
  }
  const choiceTarget = event.target.closest('[data-pick], [data-split]');
  if (choiceTarget) {
    const [kind, key, slot] = (choiceTarget.dataset.pick || choiceTarget.dataset.split).split('|');
    const choices = kind === 'race' ? state.raceChoices : state.classChoices;
    if (choiceTarget.dataset.pick) {
      const picks = Array.isArray(choices[key]) ? [...choices[key]] : [];
      picks[Number(slot)] = choiceTarget.value;
      choices[key] = picks;
    } else {
      choices[key] = { ...(choices[key] || {}), [slot]: choiceTarget.value };
    }
    saveState();
    return render();
  }

  const target = event.target;
  if (target.matches('[data-bind]')) {
    const value = target.type === 'checkbox' ? target.checked : boundValue(target);
    const hotlistKeys = new Set(['healSlot', 'spellSlot', 'potionsSlot', 'weaponLocation']);
    if (hotlistKeys.has(target.dataset.bind)) {
      const key = target.dataset.bind === 'healSlot'
        ? 'heal'
        : target.dataset.bind === 'spellSlot'
          ? 'spell'
          : target.dataset.bind === 'potionsSlot'
            ? 'potions'
            : 'weapon';
      if (warnIfHotlistCollision(value, key)) {
        target.value = state[target.dataset.bind] ?? '';
        return;
      }
    }
    // The sheet's External Buffs box holds 3.
    if (/^party\.buffs\.\d+\.active$/.test(target.dataset.bind) && value && activePartyBuffs(state).length >= MAX_ACTIVE_BUFFS) {
      target.checked = false;
      setNotice(`Only ${MAX_ACTIVE_BUFFS} External Buffs can be active at a time. Untick one first.`, 5000);
      return;
    }
    const gearLocation = target.dataset.bind.match(/^gear\.(\d+)\.location$/);
    if (gearLocation) {
      const item = state.gear[Number(gearLocation[1])];
      if (warnIfHotlistCollision(value, `gear:${item.id}`)) {
        target.value = item.location;
        return;
      }
    }
    setPath(target.dataset.bind, value);
    if (target.type === 'checkbox' || target.dataset.rerender) render();
    else { renderNav(); renderSummary(); }
    return;
  }
  if (target.matches('[data-stat]')) {
    state.stats[target.dataset.stat] = target.value;
    saveState();
    render();
    return;
  }
  if (target.matches('[data-story-select]')) {
    state.story[target.dataset.storySelect] = target.value;
    saveState();
    renderNav(); renderSummary();
    return;
  }
  if (target.matches('[data-item-field]')) {
    const index = Number(target.dataset.itemIndex);
    const field = target.dataset.itemField;
    if (field === 'location') {
      const item = state.items[index];
      if (item && warnIfHotlistCollision(target.value, `item:${item.id}`)) {
        target.value = item.location ?? '';
        return;
      }
    }
    state.items[index][field] = field === 'qty' ? Number(target.value) : target.value;
    saveState();
    if (field === 'location') render();
    else { renderNav(); renderSummary(); }
    return;
  }
  if (target.matches('[data-clothing]')) {
    state.clothing[target.dataset.clothing] = target.value;
    saveState();
    return;
  }
  if (target.matches('[data-attack-row]')) {
    const name = target.dataset.attackRow;
    const set = new Set(state.attackSheet || []);
    const off = new Set(state.attackOff || []);
    if (target.checked) {
      if (tickedAttacks(state).size >= 5) {
        target.checked = false;
        setNotice('The front-page Attacks table has five rows. Untick one first.');
        return;
      }
      set.add(name);
      off.delete(name);
    } else {
      set.delete(name);
      off.add(name); // only matters for weapons held or in the Hotlist
    }
    state.attackSheet = [...set];
    state.attackOff = [...off];
    saveState();
    renderNav(); renderSummary();
    return;
  }
});

main.addEventListener('input', (event) => {
  if (workshopInput(event)) return;
  const quick = event.target.closest('[data-quick-gear]');
  if (quick) return readQuickGear(quick);
  const target = event.target;
  if (target.matches('[data-bind]') && target.type !== 'checkbox' && target.tagName !== 'SELECT') {
    setPath(target.dataset.bind, boundValue(target));
    renderNav(); renderSummary();
    return;
  }
  if (target.matches('[data-story-custom]')) {
    state.story[target.dataset.storyCustom] = target.value;
    saveState();
    renderNav(); renderSummary();
    return;
  }
  if (target.matches('[data-item-field]') && target.tagName !== 'SELECT') {
    const index = Number(target.dataset.itemIndex);
    const field = target.dataset.itemField;
    state.items[index][field] = field === 'qty' ? Number(target.value) : target.value;
    saveState();
    renderNav(); renderSummary();
    return;
  }
  if (target.matches('[data-clothing]')) {
    state.clothing[target.dataset.clothing] = target.value;
    saveState();
  }
});

function clearHotlistDragStyles() {
  main.querySelectorAll('.hotlist-row.drag-over, .hotlist-row.dragging').forEach((row) => {
    row.classList.remove('drag-over', 'dragging');
  });
}

// <details> toggle doesn't bubble, so listen while capturing.
main.addEventListener('toggle', (event) => {
  const gearId = event.target.dataset?.gearBonuses;
  if (gearId) {
    gearBonusesOpen.set(gearId, event.target.open);
    return;
  }
  const key = event.target.dataset?.rcBenefits;
  if (!key) return;
  const had = rcOpen.benefits.has(key);
  if (event.target.open === had) return;
  rcOpen.benefits[event.target.open ? 'add' : 'delete'](key);
  labelRcExpand();
}, true);

main.addEventListener('dragstart', (event) => {
  const row = event.target.closest('.hotlist-row[draggable="true"]');
  if (!row) return;
  draggedHotlistSlot = Number(row.dataset.hotlistSlot);
  row.classList.add('dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(draggedHotlistSlot));
  }
});

main.addEventListener('dragover', (event) => {
  if (!draggedHotlistSlot) return;
  const row = event.target.closest('.hotlist-row[data-hotlist-slot]');
  if (!row) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  main.querySelectorAll('.hotlist-row.drag-over').forEach((item) => item.classList.remove('drag-over'));
  row.classList.add('drag-over');
});

main.addEventListener('drop', (event) => {
  if (!draggedHotlistSlot) return;
  const row = event.target.closest('.hotlist-row[data-hotlist-slot]');
  if (!row) return;
  event.preventDefault();
  const from = draggedHotlistSlot;
  const to = Number(row.dataset.hotlistSlot);
  draggedHotlistSlot = null;
  clearHotlistDragStyles();
  if (reorderHotlist(from, to)) {
    render();
    setNotice(`Moved Hotlist slot ${from} to slot ${to}.`);
  }
});

main.addEventListener('dragend', () => {
  draggedHotlistSlot = null;
  clearHotlistDragStyles();
});

// Native HTML drag-and-drop is inconsistent on touch browsers, so the drag
// handle also supports Pointer Events. The arrow buttons remain a keyboard and
// touch-friendly fallback.
main.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('.hotlist-drag-handle');
  if (!handle || event.pointerType === 'mouse') return;
  const row = handle.closest('.hotlist-row[data-hotlist-slot]');
  if (!row) return;
  event.preventDefault();
  touchHotlistDrag = { pointerId: event.pointerId, from: Number(row.dataset.hotlistSlot), over: Number(row.dataset.hotlistSlot) };
  row.classList.add('dragging');
  handle.setPointerCapture?.(event.pointerId);
});

main.addEventListener('pointermove', (event) => {
  if (!touchHotlistDrag || touchHotlistDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const row = hit?.closest?.('.hotlist-row[data-hotlist-slot]');
  if (!row) return;
  touchHotlistDrag.over = Number(row.dataset.hotlistSlot);
  main.querySelectorAll('.hotlist-row.drag-over').forEach((item) => item.classList.remove('drag-over'));
  row.classList.add('drag-over');
});

function finishTouchHotlistDrag(event) {
  if (!touchHotlistDrag || touchHotlistDrag.pointerId !== event.pointerId) return;
  const { from, over } = touchHotlistDrag;
  touchHotlistDrag = null;
  clearHotlistDragStyles();
  if (reorderHotlist(from, over)) {
    render();
    setNotice(`Moved Hotlist slot ${from} to slot ${over}.`);
  }
}

main.addEventListener('pointerup', finishTouchHotlistDrag);
main.addEventListener('pointercancel', (event) => {
  if (!touchHotlistDrag || touchHotlistDrag.pointerId !== event.pointerId) return;
  touchHotlistDrag = null;
  clearHotlistDragStyles();
});

// The header and footer link to pages such as About; /#about and /#changelog open them.
document.querySelectorAll('header, footer').forEach((el) => el.addEventListener('click', (event) => {
  const link = event.target.closest('[data-nav]');
  if (!link) return;
  event.preventDefault();
  navigate(link.dataset.nav);
}));
if (location.hash === '#about') activeStep = 'about';
if (location.hash === '#changelog') activeStep = 'changelog';
document.querySelectorAll('[data-version]').forEach((el) => { el.textContent = `v${VERSION}`; });

render();
// Coming back from Google sign-in: /?signed_in=google or /?auth_error=<code>.
const GOOGLE_ERRORS = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'That Google sign-in took too long or was already used. Try again.',
  google_unverified_email: "Google hasn't verified that account's email address, so it can't be used here.",
  google_bad_token: "Google's response couldn't be verified. Try again.",
  google_unavailable: "Couldn't reach Google. Try again in a minute.",
};
const returnParams = new URLSearchParams(location.search);
const authReturn = returnParams.get('signed_in') || returnParams.get('auth_error');
if (authReturn) history.replaceState(null, '', location.pathname + location.hash);

// Only redraw what depends on the account, so a field being typed in keeps focus.
refreshAccount().then(() => {
  if (authReturn) {
    if (returnParams.get('signed_in') && account.user) setNotice('Signed in with Google.', 4000);
    else setNotice(GOOGLE_ERRORS[returnParams.get('auth_error')] || 'Google sign-in failed. Try again.', 7000);
    return navigate('account');
  }
  renderAccountBar();
  if (activeStep === 'account') renderMain();
});
