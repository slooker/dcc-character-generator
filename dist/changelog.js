// The Changelog page. One entry per commit on main, newest first: version
// 0.N for the Nth commit (merges count; commits that only came in through a
// merge don't). Add an entry with every commit.
export const CHANGELOG = [
  {
    version: '0.18',
    date: '2026-11-25',
    title: 'AI Favor log',
    items: [
      'The Level & Skills step is now Level, Skills & AI Favor, with a new AI Favor panel',
      'Every crawler gets +1 AI Favor for each level automatically, whatever their Race (the Human Race no longer adds extra)',
      'Log AI Favor you gain (wimpy weapon or Spell, heroic deed, survived a foolish deed, stuck it to the showrunners, indulged the AI, Race/Class/item ability, other) or spend (d20 reroll, extra non-Attack Action, an ability, other), with the amount, floor and a note',
      'The panel shows your AI Favor total and where it came from; logged entries can be edited or deleted, and you can’t spend more than you have',
      'The sheet’s AI Favor box uses the new total',
      'The level table on Level, Skills & AI Favor shows the +1 AI Favor each level gave, next to its Stat points',
    ],
  },
  {
    version: '0.17',
    date: '2026-11-25',
    title: 'Party',
    items: [
      'New optional Party step after Equipment: name your Party and keep notes about it; both go in the sheet’s notes',
      'Party buffs: add a bonus a party member gives the whole party, with who it’s from, e.g. Protective Aura from Donut, DR +2',
      'A Party buff takes the same bonuses as a magic item (Stats, DR, Skills and damage) and applies while it’s ticked Active; untick it when it doesn’t apply',
      'Edit a buff, then Save buff to put it on your sheet (or Cancel); Tab moves through its fields without closing the editor, and leaving the Party step or the page with unsaved changes asks first',
      'Party buff Stats raise Enhanced Stats, its DR is listed in the sheet’s DR Buffs box, its Skill bonuses work like gear’s, and its damage bonuses add to all your attacks',
      'Active Party buffs fill the sheet’s External Buffs (Max 3) box, one per row; only 3 can be active at a time',
      'Active Party buffs are listed in the sheet’s notes',
    ],
  },
  {
    version: '0.16',
    date: '2026-11-24',
    title: 'Damage bonuses on items',
    items: [
      'Items can give damage bonuses, with an optional condition, e.g. +1 damage (hitting injured creatures)',
      'A weapon’s damage bonus applies to its own attacks; any other item’s applies to all your attacks while it’s equipped',
      'Bonuses with no condition are added to the attack’s Damage Mod on the sheet; conditional ones are listed in the attack’s Effects, e.g. “+1 damage (hitting injured creatures)”',
      'New “Custom weapon…” in the gear Add menu: pick its weapon Skill, then fill in its bonuses in the full editor (“Custom…” is now “Custom item…”)',
      'The Bonuses panel on an item stays open when you add a Skill or damage bonus row',
      'A damage bonus with a condition but no amount is flagged on its row, on the Equipment step and when you save',
      'An attack’s Name and Effects on the sheet wrap in the field instead of at fixed line breaks, so printing doesn’t push them to an extra line',
      'Item bonus amounts accept a leading + (+1 is saved as 1); before, typing +1 left the bonus blank and nothing saved',
    ],
  },
  {
    version: '0.15',
    date: '2026-11-23',
    title: 'Custom Skills',
    items: [
      'The Skill & Spell log has a Custom Skill… option for Skills the book doesn’t list, like the random one an Earth hobby potion gives: name it, pick its Stat and Skill type (Opposed, Unopposed or Passive) and describe what it does',
      'Custom Skills appear on the sheet with their Stat, Skill type and description; log more Ranks later by picking them under Your Skills & Spells',
    ],
  },
  {
    version: '0.14',
    date: '2026-11-22',
    title: 'Readable attacks on the sheet',
    items: [
      'Attack names, Effects, Rank, Mod and Dice on the sheet print at the same size as your Stats; names and Effects wrap onto more lines instead of shrinking',
      'When an attack’s text doesn’t fit, it ends with “… Page N”, the Reference page with its full details',
    ],
  },
  {
    version: '0.13',
    date: '2026-11-20',
    title: 'Limited Races unlock from earlier skill-ups',
    items: [
      'Skill Ranks logged on floors before your Race & Class floor now count toward prerequisites before you’ve picked anything, so Races like Obsidian Butterfly (Rank 5+ in an Edged Weapon) appear when you qualify',
    ],
  },
  {
    version: '0.12',
    date: '2026-11-20',
    title: 'Attacks from your Skills and weapons, Heal at Rank 1, Race & Class descriptions',
    items: [
      'The Attacks list shows every attack Skill and Spell you have now, at its current Rank, including ones from Race, Class, the Skill & Spell log and spellbooks',
      'New Weapon item type: link it to a weapon Skill and it can fill an Attack row. Weapons you’re holding or have in the Hotlist are always in your Attacks unless you untick them',
      'Change an item’s type (Item, Weapon, Potion, Scroll, Spellbook) in its editor',
      'Added damage, range and Mana for Bite and 19 attack Spells that were missing',
      'Heal can’t be levelled up: it’s Rank 1 maximum (p. 206). Skills already at their Rank limit are greyed out in the Skill & Spell log',
      'Custom Races and Classes can’t add Ranks to Heal or raise its limit',
      'Race and Class cards show a one-line description with Show more',
      'Expand All / Collapse All button that stays in view on the Race & Class step',
      'Fixed the spelling of the Physicker Class (the book’s heading reads “PHysicker”)',
    ],
  },
  {
    version: '0.11',
    date: '2026-11-01',
    title: 'Opening saved crawlers',
    items: [
      'Every crawler in My Crawlers has an Open button, including the one already open',
      'Opening a crawler takes you to Identity with a note that it’s open and every step can be edited from the sidebar',
    ],
  },
  {
    version: '0.10',
    date: '2026-11-01',
    title: 'Custom Race abilities on the sheet, quick inventory and portraits',
    items: [
      'Custom Race and Class abilities (immunities, Climb, Advantage and +1d4 to Evade, detriments) now lead the sheet’s Notes in short wording, and appear in full on the reference page',
      'Advantage and +1d4 on Evade go in the sheet’s Evade Buffs box',
      'Custom Races can take Size 5 (Large), with its tier agreed with your GM',
      '“Add 1d4 to Evade or Stat Checks” now asks which one',
      'Equipment quick-add bar: add an Item, Potion, Scroll or Spellbook in one line, or Custom… for magic gear with bonuses',
      'Items are compact rows with quantity buttons, a location dropdown and Use for potions and scrolls',
      'Add or spend gold in one step',
      'Optional portrait on the Identity step (under 2 MB), printed in the sheet’s Portrait box',
      'This Changelog',
    ],
  },
  {
    version: '0.9',
    date: '2026-10-31',
    title: 'Account menu, About page and more detail on the sheet',
    items: [
      'Account pages moved into a menu under your name',
      'Submit a Bug link in the header and footer',
      'About page, with a Donate link for Feature Creep Labs',
      'Custom Races & Classes need a verified sign-in',
      'Skip Race & Class button for crawlers before the Third Floor',
      'Removed the GM-approved checkbox for animal crawlers',
      'Sheets with issues can be downloaded; the issues are listed in the Notes',
      'Fixed Skill Stats: Escape Artist uses Dex, Performance uses Cha, Aiming uses Dex',
      'Removed the hand-to-hand Rank 3 and Stat ruling checkboxes',
      'Attack Effects start with Range and Mana cost',
      'Skill notes show the Upgrades reached and the next one',
      'New Skills & Spells Reference page at the end of the PDF',
    ],
  },
  {
    version: '0.8',
    date: '2026-10-30',
    title: 'Open source',
    items: ['Published on GitHub under the MIT License'],
  },
  {
    version: '0.7',
    date: '2026-10-30',
    title: 'Custom Races and Classes',
    items: [
      'Build your own Race or Class with the book’s Build System: Build Points, benefits, detriments and limits checked as you go',
      'Save up to 20 builds and share them with other crawlers',
      'Skill and Stat pickers: add from a list, add a whole group at once, click to remove',
      'Names and descriptions are screened for slurs and strong profanity',
    ],
  },
  {
    version: '0.6',
    date: '2026-10-30',
    title: 'Sign in with Google',
    items: ['Sign in or sign up with a Google account'],
  },
  {
    version: '0.5',
    date: '2026-10-30',
    title: 'Equipment',
    items: [
      'Equipment step with Gear Slots, Holding (two hands) and up to 10 Accessories',
      'Only equipped items give bonuses: Stats, Skills and DR',
      'Potions can be used, scrolls are named by Spell and Rank, and reading a spellbook logs its Spell',
      'Gold and Misc. Junk; extra Inventory pages past 20 items',
    ],
  },
  {
    version: '0.4',
    date: '2026-10-30',
    title: 'Accounts',
    items: [
      'Free accounts with email verification',
      'Save, open and delete up to 5 crawlers',
      'Profile page to change your name and email',
    ],
  },
  {
    version: '0.3',
    date: '2026-10-29',
    title: 'Race & Class and levelling up',
    items: [
      'Race & Class step, listing only the ones your crawler qualifies for, with their bonuses applied',
      'Level & Skills step: Stat points per level and a log of each Skill and Spell gained by floor',
      'Race, Class, level and floor on the PDF, with an extra Skills page when needed',
    ],
  },
  {
    version: '0.2',
    date: '2026-10-29',
    title: 'Hosted with Docker',
    items: ['Runs as a Docker container'],
  },
  {
    version: '0.1',
    date: '2026-09-18',
    title: 'First release',
    items: [
      'Step-by-step First Floor crawler creation: origin, backgrounds, combat, Stats, story and starting gear',
      'Hotlist placement and attack selection',
      'Fills in the official character sheet PDF',
    ],
  },
];

export const VERSION = CHANGELOG[0].version;

const logEsc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const longDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function changelogView() {
  return `<p class="eyebrow">CHANGELOG</p>
    <h1>What’s new</h1>
    <p class="intro">Everything added and fixed in Crawler Intake, newest first. You’re on version ${logEsc(VERSION)}.</p>
    ${CHANGELOG.map((entry) => `<section class="panel changelog-entry">
      <div class="panel-head"><h2>${logEsc(entry.version)} · ${logEsc(entry.title)}</h2><span class="ref"><time datetime="${logEsc(entry.date)}">${logEsc(longDate(entry.date))}</time></span></div>
      <ul class="about-list">${entry.items.map((item) => `<li>${logEsc(item)}</li>`).join('')}</ul>
    </section>`).join('')}
    <div class="actions"><div><button class="secondary" data-nav="identity">Back to the builder</button></div></div>`;
}
