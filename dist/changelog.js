// The Changelog page. One entry per commit on main, newest first: version
// 0.N for the Nth commit (merges count; commits that only came in through a
// merge don't). Add an entry with every commit.
export const CHANGELOG = [
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
