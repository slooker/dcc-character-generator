import {
  stats, allSkills, attackRowsForSheet, derived, carriedItems, hotlist, conflicts,
  unenhancedStats, enhancedStats, findRace, findClass,
} from './rules.js';

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

function attackEffects(attack) {
  const parts = [attack.effect];
  if (attack.notes) parts.push(compact(attack.notes, 75));
  if (attack.favor) parts.push(`AI Favor ${attack.favor} (conditional)`);
  return compact(parts.filter(Boolean).join('; '), 120);
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
    let notes = skill.notes || '';
    if (skill.name === 'Performance' && state.performance) notes = `Specialty: ${state.performance}. ${notes}`;
    if (skill.conflict && state.rulings[skill.name]) notes = `GM ruling uses ${state.rulings[skill.name]}. ${notes}`;
    if (skill.source) notes = `${skill.source}. ${notes}`;
    setField(form, `Text Field ${base}`, skill.label || skill.name, { fontSize: 7.5 });
    setField(form, `Text Field ${base + 1}`, skill.rank, { fontSize: 7.5 });
    setField(form, `Text Field ${base + 2}`, skillStatText(skill, d.modText), { fontSize: 7 });
    setField(form, `Text Field ${base + 3}`, skill.check || (skill.damageStat !== undefined ? 'Evade' : ''), { fontSize: 6.5 });
    setField(form, `Text Field ${base + 4}`, compact(notes, 180), { fontSize: 6.2, multiline: true });
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
  setField(form, 'Text Field 25', d.evadeBuff || '', { fontSize: 9 });
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
  if (state.performance && allSkills(state).some((x) => x.name === 'Performance')) reviewNotes.push(`Performance specialty: ${state.performance}`);
  const sourceConflicts = conflicts(state);
  for (const conflict of sourceConflicts) {
    if (state.rulings[conflict.name]) reviewNotes.push(`${conflict.name} ruling: use ${state.rulings[conflict.name]}.`);
  }
  if (state.combatType === 'hand') reviewNotes.push('Paired hand-to-hand Damage Effect treated as Rank 3 per GM-approved interpretation.');
  if (d.dayNight) reviewNotes.push('Stats, Mods and Mana shown as two numbers: the first is daytime, the second is night time.');
  // Race/Class benefits that aren't fully captured by numbers on the sheet.
  for (const [label, entry] of [['Race', findRace(state.race, state)], ['Class', findClass(state.className, state)]]) {
    const text = entry?.benefits.filter((_, i) => !entry.effects[i].length || entry.effects[i].some((x) => x.type === 'dayNight')) || [];
    if (text.length) reviewNotes.push(`${label} (${entry.name}): ${text.join('; ')}`);
  }
  setField(form, 'Text Field 102', reviewNotes.join('\n'), { fontSize: reviewNotes.join('').length > 600 ? 5 : 7, multiline: true });

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
