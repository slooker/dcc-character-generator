import {
  stats, allSkills, attackRowsForSheet, derived, carriedItems, hotlist,
  unenhancedStats, enhancedStats, findRace, findClass, errors, validPortrait,
} from './rules.js';
import { skillText } from './skill-text.js';

const attackFields = [
  ['Text Field 55', 'Text Field 551', 'Text Field 52', 'Text Field 53', 'Text Field 54', 'Text Field 56'],
  ['Text Field 61', 'Text Field 57', 'Text Field 59', 'Text Field 58', 'Text Field 60', 'Text Field 62'],
  ['Text Field 67', 'Text Field 63', 'Text Field 65', 'Text Field 64', 'Text Field 66', 'Text Field 68'],
  ['Text Field 73', 'Text Field 69', 'Text Field 71', 'Text Field 70', 'Text Field 72', 'Text Field 74'],
  ['Text Field 79', 'Text Field 75', 'Text Field 77', 'Text Field 76', 'Text Field 78', 'Text Field 80'],
];

const statFields = {
  Str: ['Text Field 21', 'Text Field 22', 'Text Field 23'],
  Int: ['Text Field 34', 'Text Field 35', 'Text Field 36'],
  Con: ['Text Field 43', 'Text Field 44', 'Text Field 45'],
  Dex: ['Text Field 46', 'Text Field 47', 'Text Field 48'],
  Cha: ['Text Field 49', 'Text Field 50', 'Text Field 51'],
};

function asText(value) {
  return value === null || value === undefined ? '' : String(value);
}

function compact(text, max = 145) {
  const value = asText(text).replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function filenameSafe(value) {
  return asText(value).trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'crawler';
}

function safeField(form, name) {
  try { return form.getTextField(name); } catch { return null; }
}

function setField(form, name, value, options = {}) {
  const field = safeField(form, name);
  if (!field) return;
  if (options.multiline) {
    try { field.enableMultiline(); } catch { /* existing field may already be multiline */ }
  }
  if (options.fontSize) {
    try { field.setFontSize(options.fontSize); } catch { /* appearance update still applies */ }
  }
  field.setText(asText(value));
}

function clearField(form, name) {
  setField(form, name, '');
}

function skillStatText(skill, modText) {
  if (!skill.stat || skill.stat === 'None') return 'None';
  return `${skill.stat} ${modText[skill.stat] || ''}`.trim();
}

// A Skill/Spell's stat lines and Upgrades from the book (skill-text.js).
const bookText = (name) => skillText[asText(name).toLowerCase()] || null;
const bookProp = (entry, key) => entry?.props.find(([k]) => k === key)?.[1] || '';
const shortRange = (value) => value.replace(/(\d+)\s*(?:feet|foot|ft)\b/i, '$1 ft');

// Range, Mana, Duration and Cooldown, short, for the sheet's boxes.
function bookBasics(name, fallback = {}) {
  const entry = bookText(name);
  const range = shortRange(bookProp(entry, 'Range')) || (fallback.range ? `${fallback.range} ft` : '');
  const mana = bookProp(entry, 'Mana Cost') || fallback.mana || '';
  return [range && `Range ${range}`, mana && `Mana ${mana}`, ...['Duration', 'Cooldown'].map((k) => bookProp(entry, k) && `${k} ${bookProp(entry, k)}`)].filter(Boolean);
}

// Upgrades already reached at this Rank, then the next one.
function upgradeNotes(skill) {
  const upgrades = bookText(skill.name)?.upgrades || [];
  const rank = Number(skill.rank) || 0;
  const next = upgrades.find(([r]) => r > rank);
  return [
    ...upgrades.filter(([r]) => r <= rank).map(([r, text]) => `Rank ${r}: ${text}`),
    next ? `Next, Rank ${next[0]}: ${next[1]}` : '',
  ].filter(Boolean);
}

function attackEffects(attack) {
  const parts = [...bookBasics(attack.skill || attack.name, attack), attack.effect];
  if (attack.notes) parts.push(compact(attack.notes, 75));
  if (attack.favor) parts.push(`AI Favor ${attack.favor} (conditional)`);
  return compact(parts.filter(Boolean).join('; '), 160);
}

function gearText(item) {
  const qty = Number(item.qty) > 1 ? ` x${Number(item.qty)}` : '';
  return `${item.name}${qty}${item.notes ? ` - ${item.notes}` : ''}`;
}

const SKILL_ROWS = 20;
const SKILLS_PAGE_INDEX = 2;

// Fill the 20 Skill rows on the template's Skills page.
function fillSkillRows(form, skills, state, d) {
  for (let row = 0; row < SKILL_ROWS; row++) {
    const base = 103 + row * 6;
    for (let offset = 0; offset < 5; offset++) clearField(form, `Text Field ${base + offset}`);
    const skill = skills[row];
    if (!skill) continue;
    // The rules that matter at the table first; where the Skill came from
    // only if there's room. Everything is on the Reference page.
    const notes = [
      skill.name === 'Performance' && state.performance ? `Specialty: ${state.performance}.` : '',
      skill.notes || '',
      bookBasics(skill.name).join('; '),
      ...upgradeNotes(skill),
    ].filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : `${x}.`)).join(' ');
    const withSource = skill.source && notes.length + skill.source.length < 175 ? `${notes} (${skill.source})`.trim() : notes || skill.source || '';
    setField(form, `Text Field ${base}`, skill.label || skill.name, { fontSize: 7.5 });
    setField(form, `Text Field ${base + 1}`, skill.rank, { fontSize: 7.5 });
    setField(form, `Text Field ${base + 2}`, skillStatText(skill, d.modText), { fontSize: 7 });
    setField(form, `Text Field ${base + 3}`, skill.check || (skill.damageStat !== undefined ? 'Evade' : ''), { fontSize: 6.5 });
    setField(form, `Text Field ${base + 4}`, compact(withSource, 190), { fontSize: 6.2, multiline: true });
  }
}

// Skills beyond the sheet's 20 rows go on extra copies of the Skills page,
// filled the same way and flattened so their field names can't collide with
// the main sheet's form.
const INVENTORY_ROWS = 20;
const INVENTORY_PAGE_INDEX = 3;

function fillInventoryRows(form, items) {
  for (let row = 0; row < INVENTORY_ROWS; row++) {
    const base = 223 + row * 3;
    clearField(form, `Text Field ${base}`);
    clearField(form, `Text Field ${base + 1}`);
    clearField(form, `Text Field ${base + 2}`);
    const item = items[row];
    if (!item) continue;
    setField(form, `Text Field ${base}`, item.name, { fontSize: 8 });
    setField(form, `Text Field ${base + 1}`, item.qty, { fontSize: 8 });
    setField(form, `Text Field ${base + 2}`, compact(item.notes || '', 120), { fontSize: 7.5, multiline: true });
  }
}

// Extra copies of a template page for rows past the first `perPage`, filled by `fill(form, rows)`.
async function overflowPages(PDFDocument, font, templateBytes, rows, perPage, fill) {
  const pages = [];
  for (let start = perPage; start < rows.length; start += perPage) {
    const extra = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const extraForm = extra.getForm();
    fill(extraForm, rows.slice(start, start + perPage));
    extraForm.updateFieldAppearances(await extra.embedFont(font));
    extraForm.flatten();
    pages.push(extra);
  }
  return pages;
}

// Text the standard fonts can't draw (WinAnsi only) becomes something close.
function drawable(font, text) {
  return [...asText(text)].map((ch) => {
    try {
      font.encodeText(ch);
      return ch;
    } catch {
      return { '\u2011': '-', '\u2010': '-', '\u2212': '-', '\u2192': '->', '\u2264': '<=', '\u2265': '>=' }[ch] || '?';
    }
  }).join('');
}

function wrapText(font, size, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Skills & Spells Reference: each Skill/Spell the crawler knows, with the
// book's stat lines and every Upgrade (those reached at its Rank marked), in
// two columns on as many pages as it takes.
async function addReferencePages(pdfDoc, StandardFonts, state, skills, d) {
  const abilities = raceClassEntries(state).filter(([, entry]) => entry.benefits.length);
  if (!skills.length && !abilities.length) return;
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [width, height] = [792, 612];
  const margin = 36;
  const gap = 24;
  const columnWidth = (width - margin * 2 - gap) / 2;
  const top = height - margin - 30;
  let page = null;
  let column = 0;
  let y = 0;
  const newPage = () => {
    page = pdfDoc.addPage([width, height]);
    page.drawText(drawable(bold, `RACE, CLASS, SKILLS & SPELLS REFERENCE${state.name ? ` - ${state.name.toUpperCase()}` : ''}`), { x: margin, y: height - margin - 10, size: 12, font: bold });
    page.drawText('Race and Class benefits in full, then each Skill and Spell\'s stat lines and Upgrades from the rulebook. Upgrades this crawler has reached are marked.', { x: margin, y: height - margin - 24, size: 7.5, font: regular });
    column = 0;
    y = top;
  };
  // Keep a Skill's block together where it fits in one column.
  const place = (blockHeight) => {
    if (!page) newPage();
    if (y - blockHeight >= margin) return;
    if (column === 0 && top - blockHeight >= margin) {
      column = 1;
      y = top;
    } else {
      newPage();
    }
  };
  const draw = (rows) => {
    const lines = rows.flatMap(([font, size, text, indent]) => wrapText(font, size, drawable(font, text), columnWidth - indent).map((line) => [font, size, line, indent]));
    const blockHeight = lines.reduce((sum, [, size]) => sum + size + 2.5, 0) + 8;
    place(blockHeight);
    const x = margin + column * (columnWidth + gap);
    for (const [font, size, line, indent] of lines) {
      y -= size + 2.5;
      page.drawText(line, { x: x + indent, y, size, font });
    }
    y -= 8;
  };
  for (const [label, entry] of abilities) {
    draw([
      [bold, 9, `${label}: ${entry.name}${entry.custom ? ' (custom)' : ''}`, 0],
      ...entry.benefits.map((text) => [regular, 7.5, `• ${text}`, 0]),
    ]);
  }
  for (const skill of skills) {
    const entry = bookText(skill.name);
    const stat = skill.stat && skill.stat !== 'None' ? ` · ${skill.stat} ${d.modText[skill.stat] || ''}`.trimEnd() : '';
    const rank = Number(skill.rank) || 0;
    const rows = [[bold, 9, `${skill.label || skill.name} - Rank ${skill.rank}${stat}`, 0]];
    for (const [key, value] of entry?.props || []) rows.push([regular, 7.5, `${key}: ${value}`, 0]);
    if (skill.notes && !(entry?.props || []).some(([, value]) => skill.notes.includes(value))) rows.push([regular, 7.5, `Note: ${skill.notes}`, 0]);
    if (entry?.upgrades.length) {
      rows.push([bold, 7.5, 'Upgrades', 0]);
      for (const [r, text] of entry.upgrades) rows.push([r <= rank ? bold : regular, 7.5, `${r <= rank ? '[Reached] ' : ''}Rank ${r}: ${text}`, 8]);
    }
    if (skill.source) rows.push([regular, 7, `From: ${skill.source}`, 0]);
    draw(rows);
  }
}

function raceClassEntries(state) {
  return [['Race', findRace(state.race, state)], ['Class', findClass(state.className, state)]].filter(([, entry]) => entry);
}

// Benefits the sheet's numbers don't show (immunities, movement, Rank 20
// allowances, Stat caps...) and those it shows only in part (day/night Stats,
// Evade dice), in the sheet's short wording.
const NOTED_EFFECTS = new Set(['dayNight', 'rankLimit', 'statCap', 'evade']);
function abilityNotes(entry) {
  return entry.benefits
    .map((text, i) => (!entry.effects[i].length || entry.effects[i].some((x) => NOTED_EFFECTS.has(x.type)) ? entry.short?.[i] || text : null))
    .filter(Boolean);
}

export async function buildCharacterPdf(state, PDFLibNamespace, templateBytes) {
  if (!PDFLibNamespace?.PDFDocument) throw new Error('PDF library did not load.');
  const { PDFDocument, StandardFonts } = PDFLibNamespace;
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const d = derived(state);

  // Page 1: identity.
  setField(form, 'Name', state.name, { fontSize: 9 });
  setField(form, 'Race', state.race || (state.kind === 'human' ? 'Human' : state.species), { fontSize: 9 });
  setField(form, 'Gender', state.pronouns, { fontSize: 8 });
  setField(form, 'level', d.level, { fontSize: 9 });
  setField(form, 'crawler number', state.number, { fontSize: 9 });
  if (state.className) setField(form, 'class', state.className, { fontSize: 9 });
  else clearField(form, 'class');
  setField(form, 'Floor', d.floor, { fontSize: 9 });

  // Health Bar: each slot contains the CON modifier at creation.
  for (const pct of [10,20,30,40,50,60,70,80,90,100]) {
    setField(form, String(pct), d.healthSlot || '', { fontSize: 8 });
  }

  // Stats: Race/Class change Unenhanced; only equipment changes Enhanced.
  // Time-of-day Stats are written "day/night" (see notes).
  const unenhancedValues = unenhancedStats(state);
  const enhancedValues = enhancedStats(state);
  for (const key of stats) {
    const [enhanced, unenhanced, modField] = statFields[key];
    const dayNight = d.statText[key].includes('/');
    setField(form, enhanced, dayNight ? d.statText[key] : enhancedValues[key], { fontSize: dayNight ? 8 : 10 });
    setField(form, unenhanced, dayNight ? d.statText[key] : unenhancedValues[key], { fontSize: dayNight ? 8 : 10 });
    setField(form, modField, d.modText[key], { fontSize: dayNight ? 8 : 10 });
  }

  // Evade: active d20 check; do not invent a static total.
  setField(form, 'Text Field 24', d.evadeDex || '', { fontSize: 9 });
  // Dodge's +1, then Race/Class extras ("+1d4", "Adv").
  const evadeBuffs = [d.evadeBuff || '', ...d.evadeExtras].filter(Boolean).join(' ');
  setField(form, 'Text Field 25', evadeBuffs, { fontSize: evadeBuffs.length > 6 ? 7 : 9 });
  clearField(form, 'Text Field 26');

  setField(form, 'Text Field 27', d.move, { fontSize: 9 });
  setField(form, 'Text Field 28', d.step, { fontSize: 9 });
  // Damage Resistance: Armor + Buffs = DR Total. Race/Class DR is listed per source.
  // Armor: DR from equipped gear; Buffs: Race/Class DR.
  if (d.dr.armor) setField(form, 'Text Field 29', d.dr.armor, { fontSize: 9 });
  else clearField(form, 'Text Field 29');
  setField(form, 'Text Field 30', d.dr.parts.map((x) => `+${x.value} (${x.from})`).join(' '), { fontSize: 8 });
  setField(form, 'Text Field 31', d.dr.total || '', { fontSize: 9 });
  setField(form, 'Text Field 32', d.aiFavor, { fontSize: 9 });
  setField(form, 'Text Field 33', d.size, { fontSize: 8 });

  // Current Mana is 37; Max Mana is 38 in the actual form tree.
  setField(form, 'Text Field 37', d.manaText ?? d.currentMana, { fontSize: 9 });
  setField(form, 'Text Field 38', d.manaText ?? d.maxMana, { fontSize: 9 });
  clearField(form, 'Text Field 39');
  clearField(form, 'Text Field 40');
  clearField(form, 'Text Field 41');
  clearField(form, 'Text Field 42');

  // Front-page attacks.
  const attacks = attackRowsForSheet(state);
  for (let row = 0; row < attackFields.length; row++) {
    const names = attackFields[row];
    const attack = attacks[row];
    names.forEach((name) => clearField(form, name));
    if (!attack) continue;
    const hitMod = attack.stat && attack.stat !== 'None' ? d.modText[attack.stat].replace(/\+/g, '') : null;
    const damageMod = attack.damageStat ? d.modText[attack.damageStat].replace(/\+/g, '') : null;
    setField(form, names[0], attack.label || attack.name, { fontSize: 7 });
    setField(form, names[1], attack.rank, { fontSize: 8 });
    setField(form, names[2], hitMod || '', { fontSize: 8 });
    setField(form, names[3], attack.dice || '', { fontSize: 8 });
    setField(form, names[4], damageMod || '', { fontSize: 8 });
    setField(form, names[5], attackEffects(attack), { fontSize: 6.5, multiline: true });
  }

  // Page 2: Hotlist.
  const hot = hotlist(state);
  hot.forEach((text, index) => setField(form, `Text Field ${81 + index}`, text, { fontSize: 6.5, multiline: true }));

  // Page 2: gear slots and story.
  // Each slot: worn starting clothing, then equipped items with their bonuses.
  const carried = carriedItems(state);
  const worn = (location, clothing = '') => [
    String(clothing || '').trim(),
    ...carried.filter((x) => x.location === location).map((x) => `${x.name}${x.bonus ? ` (${x.bonus})` : ''}`),
  ].filter(Boolean);
  const slotField = (name, lines) => setField(form, name, lines.join('\n'), { fontSize: lines.length > 1 ? 7 : 8, multiline: lines.length > 1 });
  const accessories = carried.filter((x) => x.location === 'accessories');
  setField(form, 'Text Field 91', accessories.map(gearText).join('\n'), { fontSize: 7, multiline: true }); // notes start with any bonus
  slotField('Text Field 92', worn('head', state.clothing.Head));
  slotField('Text Field 93', worn('torso', state.clothing.Torso));
  slotField('Text Field 94', worn('arms', state.clothing.Arms));
  slotField('Text Field 95', [...worn('gloves', state.clothing.Hands), ...worn('holding').map((x) => `Holding: ${x}`)]);
  slotField('Text Field 96', worn('legs', state.clothing.Legs));
  slotField('Text Field 97', worn('feet', state.clothing.Feet));
  setField(form, 'Text Field 98', String(state.popularity ?? '').trim(), { fontSize: 8 }); // Blank at creation unless recorded.
  setField(form, 'Text Field 99', state.story.trauma, { fontSize: 8, multiline: true });
  setField(form, 'Text Field 100', state.story.looseEnd, { fontSize: 8, multiline: true });
  setField(form, 'Text Field 101', state.story.regret, { fontSize: 8, multiline: true });

  const reviewNotes = [];
  // Race/Class abilities first: they matter at the table. The reference page
  // at the end has them in full.
  for (const [label, entry] of raceClassEntries(state)) {
    const text = abilityNotes(entry);
    if (text.length) reviewNotes.push(`${label} (${entry.name}): ${text.join('; ')}.`);
  }
  if (state.performance && allSkills(state).some((x) => x.name === 'Performance')) reviewNotes.push(`Performance specialty: ${state.performance}`);
  if (d.dayNight) reviewNotes.push('Stats, Mods and Mana shown as two numbers: the first is daytime, the second is night time.');
  // A sheet can be downloaded before it's finished; it says so.
  const issues = errors(state);
  if (issues.length) reviewNotes.push(`${reviewNotes.length ? '\n' : ''}THIS SHEET STILL HAS ${issues.length} ISSUE${issues.length === 1 ? '' : 'S'}:`, ...issues.map((x) => `• ${x}`));
  const notesText = reviewNotes.join('\n');
  setField(form, 'Text Field 102', notesText, { fontSize: notesText.length > 700 ? 5 : notesText.length > 450 ? 6 : 7, multiline: true });

  // Page 3: Skills. Twenty rows, six field numbers apart because the checkbox occupies the sixth widget.
  const skills = allSkills(state);
  fillSkillRows(form, skills.slice(0, SKILL_ROWS), state, d);

  // Page 4: Inventory. Hotlist/holding/accessories are not duplicated here;
  // more than 20 rows continue on extra Inventory pages.
  const inventory = carried.filter((x) => x.location === 'inventory');
  fillInventoryRows(form, inventory.slice(0, INVENTORY_ROWS));

  try {
    form.updateFieldAppearances(font);
  } catch (error) {
    throw new Error(`A character-sheet field contains text the PDF font cannot encode. Remove unusual emoji/symbols and try again. (${error.message})`);
  }

  // Portrait: an image button on page 1. Set after the appearance update so
  // it isn't redrawn blank.
  if (validPortrait(state.portrait)) {
    try {
      const image = state.portrait.startsWith('data:image/png') ? await pdfDoc.embedPng(state.portrait) : await pdfDoc.embedJpg(state.portrait);
      form.getButton('Image7_af_image').setImage(image);
    } catch (error) {
      console.warn('Portrait could not be added to the sheet.', error);
    }
  }

  const extras = await overflowPages(PDFDocument, StandardFonts.Helvetica, templateBytes, skills, SKILL_ROWS, (extraForm, rows) => fillSkillRows(extraForm, rows, state, d));
  for (const [i, extra] of extras.entries()) {
    const [page] = await pdfDoc.copyPages(extra, [SKILLS_PAGE_INDEX]);
    pdfDoc.insertPage(SKILLS_PAGE_INDEX + 1 + i, page);
  }
  const inventoryExtras = await overflowPages(PDFDocument, StandardFonts.Helvetica, templateBytes, inventory, INVENTORY_ROWS, fillInventoryRows);
  for (const extra of inventoryExtras) {
    const [page] = await pdfDoc.copyPages(extra, [INVENTORY_PAGE_INDEX]);
    pdfDoc.addPage(page);
  }

  await addReferencePages(pdfDoc, StandardFonts, state, skills, d);

  // Keep the AcroForm editable; do not flatten.
  return pdfDoc.save({ useObjectStreams: false, updateFieldAppearances: false });
}

export async function downloadCharacterSheet(state) {
  const response = await fetch('character-sheet.pdf');
  if (!response.ok) throw new Error(`Could not load character-sheet.pdf (${response.status}).`);
  const templateBytes = new Uint8Array(await response.arrayBuffer());
  const bytes = await buildCharacterPdf(state, globalThis.PDFLib, templateBytes);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameSafe(state.name)}-character-sheet.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
