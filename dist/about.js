// The About page: what's in the builder, how it works, and who made it.
export const FEATURE_CREEP_URL = 'https://featurecreeplabs.com';
export const DONATE_URL = 'https://buymeacoffee.com/featurecreeplabs';
export const BUG_URL = 'https://github.com/slooker/dcc-character-generator/issues/new';

const external = (href, text, className = '') => `<a ${className ? `class="${className}" ` : ''}href="${href}" target="_blank" rel="noopener">${text}</a>`;

export function aboutView() {
  return `<p class="eyebrow">ABOUT</p>
    <h1>Crawler Intake</h1>
    <p class="intro">A character builder for the Dungeon Crawler Carl Roleplaying Game. Step through creating your crawler, keep them going as they level up, and download the official four-page character sheet as a filled-in PDF that you can keep editing.</p>
    <section class="panel">
      <div class="panel-head"><h2>What’s in it</h2></div>
      <ul class="about-list">
        <li><strong>Crawler creation.</strong> Origin, four backgrounds and their Skills, your starting weapon, attack Spell or hand-to-hand style, the Standard Array, and your Past Trauma, Loose End and Regret. Health, Mana, Evade and the rest are worked out for you.</li>
        <li><strong>Starting gear and Hotlist.</strong> Place each item where it’s carried. Hotlist slot collisions are caught as you go.</li>
        <li><strong>Race &amp; Class.</strong> Only the Races and Classes your crawler qualifies for are listed, and their bonuses go onto the sheet.</li>
        <li><strong>Level &amp; Skills.</strong> Spend Stat points as you level, and keep a log of the floor where each Skill and Spell was gained.</li>
        <li><strong>Equipment.</strong> Gear Slots, gold and Misc. Junk. Equipped gear raises Enhanced Stats, Skills and Armor.</li>
        <li><strong>Custom Races &amp; Classes.</strong> Build your own with the book’s Build System, with Build Points and limits checked as you go. Keep it private or share it for other crawlers to use.</li>
        <li><strong>PDF export.</strong> Fills in the official fillable character sheet without flattening it.</li>
      </ul>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>How it works</h2></div>
      <ul class="about-list">
        <li><strong>By the book.</strong> Every mechanic comes from the Dungeon Crawler Carl rulebook. Where the book leaves something open or contradicts itself, the builder asks you and your GM to decide instead of guessing.</li>
        <li><strong>Your choices, not dice.</strong> You pick each option; the only random value is your crawler number.</li>
        <li><strong>No account needed.</strong> Your crawler is kept in this browser as you work.</li>
        <li><strong>Free account (optional).</strong> Sign up with email or Google to save up to five crawlers and keep your custom Races and Classes. Shared names and descriptions are screened for slurs and strong profanity.</li>
      </ul>
      <p class="muted micro">An unofficial fan-made tool, not affiliated with the Dungeon Crawler Carl books or the official game.</p>
    </section>
    <section class="panel about-credit">
      <div class="panel-head"><h2>A Feature Creep Labs production</h2></div>
      <p>Crawler Intake is made by ${external(FEATURE_CREEP_URL, 'Feature Creep Labs')}. If it’s been useful at your table, you can help keep it running.</p>
      <div class="build-actions">
        ${external(DONATE_URL, 'Donate to Feature Creep Labs', 'button-link primary')}
        ${external(BUG_URL, 'Submit a Bug', 'button-link secondary')}
      </div>
    </section>
    <div class="actions"><div><button class="secondary" data-nav="identity">Back to the builder</button></div></div>`;
}
