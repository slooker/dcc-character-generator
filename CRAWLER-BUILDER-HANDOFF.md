# Dungeon Crawler Carl character-builder handoff

> **Current runtime update — September 20, 2026:** The current project is served with Docker Compose using Nginx. Run `docker compose up --build -d` and open `http://localhost:4173/`. The earlier Python development server has been removed. Python remains only for the test suite.

Prepared September 18, 2026. This document is intended to give another LLM the complete project brief, conversation decisions, source material, and current implementation state.

## 1. Task for the next LLM

Build a polished website that lets a person create a **valid starting crawler for the Dungeon Crawler Carl tabletop roleplaying game**, using **only the two supplied rules PDFs**. The website must fill the supplied original fillable character-sheet PDF and let the player download their completed character sheet.

Read the requirements and caveats below before using the partial code. The project is **unfinished**. Do not mistake the scaffold or draft rule modules for a working, verified application.

### Non-negotiable requirements

- Use only `character-generation-rules.pdf` and `skills-and-spells.pdf` for game mechanics.
- Use all **15 pages** of the character-creation PDF, as explicitly approved after its actual page count was discovered.
- Do not use Dungeons & Dragons, Pathfinder, other game systems, outside websites, other book chapters, or remembered game rules to fill gaps.
- The player makes the character choices: identity, allowed species, backgrounds, skills, stat assignments, combat selection, backstory, starting possessions, and placement of items/spells where applicable.
- Apply mandatory rules and calculated values automatically; these are not optional character choices.
- **Exception: crawler number is automatically assigned. It must be an integer from 50,000 through 12,900,000 inclusive. Players do not choose or edit it.** This is the user's latest explicit instruction and overrides the earlier editable-number design and the PDF's suggested lower bound of 500,000.
- The website should look good and be usable on desktop and mobile.
- Download must use `fillable-character-sheet.pdf`, preserving its actual four-page layout and filling its form fields, rather than substituting an unrelated or newly designed sheet.
- Validate legal combinations and calculations. Do not claim a character is valid when necessary choices or rulings remain unresolved.
- If the approved sources omit or contradict a rule, identify the issue accurately. Do not silently invent a rule or import one from another system.

## 2. What the user said and approved

The initial request was:

> Using the character-generation-rules.pdf inside this folder, help me make a website that looks good and makes a VALID crawler for the Dungeon Crawler Carl Tabletop game. We should not be using anything outside of those 12 pages. Nothing from Dungeons and Dragons. Nothing from pathfinder. Nothing from ANYTHING ELSE except the 12 pages of that book. Everything should be a choice up to the person creating the character. It should ultimately fill out the sheet fillable-character-sheet.pdf and give the user a pdf to download of their new character.

Inspection found that the creation PDF actually has 15 pages, book pages 101–115. The first 12 end at book page 112, before backstory and starting gear. The assistant asked whether to use all 15 or strictly the first 12.

The user then said:

> I've added a skills-and-spells.pdf as well.

The assistant asked whether to use all 15 character-creation pages plus the new skill/spell PDF. The user explicitly answered:

> Yes, use all 15 pages plus skills-and-spells.pdf

The user subsequently changed the crawler-number requirement:

> Let's have it autogenerate a crawler number for them between 50,000 and 12,900,000. They don't get to pick their own.

The final request was to output everything discussed as a Markdown file to feed to another LLM. Work on the website stopped to prepare this handoff. **The crawler-number change has not yet been implemented in the draft code.**

## 3. Source files and project location

Original Windows project folder:

```text
C:\Users\shawn\code\dcc-character-generator
```

| File | Actual length | Purpose |
|---|---|---|
| `character-generation-rules.pdf` | 15 PDF pages; book pp. 101–115 | Character creation, backgrounds, ranks, stats, equipment, story |
| `skills-and-spells.pdf` | 42 PDF pages; book pp. 173–214 | Skill checks, attacks, damage effects, utility skills, spell rules and entries |
| `fillable-character-sheet.pdf` | 4 landscape PDF pages | Required download template |

All three original PDFs remain unchanged. This handoff includes full machine-extracted text of both rules PDFs in appendices and a form-field inventory of the sheet. **Give the next LLM the three original PDFs too if possible.** Extracted text cannot reproduce table layout or the binary fillable template. Use the original PDF to verify ambiguous text, broken words, columns, symbols and page references.

No outside game sources were consulted.

## 4. Product direction discussed

The assistant proposed a guided builder with a dark HUD-inspired interface, gold accents, readable typography, explicit player choices and a live crawler summary. This was an implementation direction, not a separate user-mandated visual specification.

The initial visual scaffold used:

- Header: **CRAWLER INTAKE**, with **DUNGEON CRAWLER CARL · CHARACTER CREATOR** beneath it.
- Left navigation for creation stages.
- Central working area containing actual choices, not a marketing landing page.
- Right-side live summary showing identity, five stats, Health, Mana, Evade, Move, Step, AI Favor and size.
- Dark charcoal surfaces, warm gold action buttons, restrained green for successful/selected states.
- Source page references near the relevant choices.

Suggested complete flow (extend beyond the original six-step scaffold):

1. Identity and automatically assigned crawler number.
2. Human or allowed animal origin and relevant restrictions.
3. Four background stages, one category per stage, two skills from each.
4. Combat selection and any associated effects.
5. Player-assigned Standard Array and derived stats.
6. Backstory: Past Trauma, Loose End, Regret.
7. Starting clothing, weapon, useful item and weird possessions.
8. Hotlist and equipment placement.
9. Review, source conflicts if any, validation and PDF download.

Do not preselect backgrounds, skills, stats, or narrative options for the player. The explicitly requested random crawler number is the exception. A choice-driven Standard Array was planned; there is no need to add random character generation just because the book also mentions rolling.

### Crawler-number behavior

- Generate the number once per new crawler, using a uniform random integer in the inclusive range 50,000–12,900,000.
- Display it as assigned/read-only, and write the same number into the PDF.
- Do not expose a number input, edit action, or player-controlled reroll.
- Do not generate a different number on every render, step change, recalculation or export.
- If drafts are persisted, preserve that crawler's number with its draft.
- Without a shared registry, do not claim worldwide uniqueness. Such a registry was not requested.
- Any UI or code still using 500,000 as the minimum or asking the player to choose a number is stale.

## 5. Rules established from the approved sources

The appendices contain the source text. These notes summarize the central implementation requirements and are not replacements for checking those sources.

### Identity and origin

- Standard crawlers begin Human.
- Gender/pronouns may be chosen or left blank.
- An earth-based animal requires GM permission, spends starting AI Favor, and is limited to one crawler in the group. The animal should be at least tamed/domesticated unless the GM allows otherwise.
- Human size is typically Medium (4). The animal creation text allows sizes 2–4; the broader reference table also shows size examples outside that creation range. Do not silently offer those as standard starting choices.
- Human starting AI Favor is 1; animal starting AI Favor is 0.
- Move is 20 feet and Step is 10 feet.
- Popularity is left blank at this point.
- The PDFs do not supply a complete Third Floor/Level 10 advancement workflow or Class/Race selection chapter. Do not claim to build a complete Level 10 crawler from these files alone.

### Background skills

Choose one background in each stage and two of its three listed skills:

| Human stage | Starting Rank | Source table |
|---|---:|---|
| Childhood | 1 | 12 |
| Adolescence | 1 | 13 |
| Career | 3 | 14 |
| Hobby | 2 | 15 |

| Animal stage | Starting Rank | Source table |
|---|---:|---|
| Youth | 1 | 16 |
| Training | 1 | 17 |
| Adult | 3 | 19 |
| Quirk | 2 | 18 |

That yields eight background skills. The two initial combat skills bring the background/combat total to ten different skills. Do not stack ranks from duplicate background selections. Heal and any additional granted Damage Effect are separate grants; do not incorrectly cap the entire final skill list at ten rows.

Keep the chosen stage/category provenance and printed Stat for each row. The preliminary `rules.js` contains all these table options, but still needs an independent source audit.

### Starting combat

- Human: Unarmed Combat, Rank 3.
- Animal: Slice Attack, Rank 3, per the specific creation instructions.
- Choose a second Rank 3 combat option: a listed weapon, one of the listed starting attack spells, or a listed hand-to-hand option.
- A unique weapon name can be associated with a listed weapon, e.g. Tire Iron (Club), per the creation text. Custom mechanics require the approved custom-skill guidance and GM involvement; do not invent them automatically.
- Starting attack spells: Dirt Clod, Fire Fingers, Frost Scar, Mind Tickle, Shock Treatment, Soul Collector, Vine Porn.
- Choosing an attack spell requires Intelligence at least 4 and grants five Standard Mana Potions. Each potion fully restores Mana when an Action is spent to drink it; put the five together in one Hotlist slot.
- Hand-to-hand pairs: Pugilism / Iron Punch; Foot Soldier / Smush; Noggin Nocker / Skullcracker; Wrasslin’ / Toss.
- Hand-to-hand choice also mentions an achievement and a Bronze Weapon Box with a drawback. Do not invent its contents or drawback.
- Use the skill/spell PDF for attack Stat, base damage, damage Stat, range, restrictions, cooldowns, damage types, and spell costs.
- Do not add Rank damage dice automatically to every attack. They are only added when an effect explicitly grants them.
- Skill/Spell AI Favor entries describe conditional rewards during play, not extra starting AI Favor.
- Starting ranks are below the Rank 5/10/15 upgrades. Do not grant higher-rank upgrades prematurely.
- Extra combat skills obtained through backgrounds also need appropriate attack information, while possession of their weapons is a separate starting-gear decision.

### Stats and derived values

The player places 2, 3, 4, 5 and 6 once each across Strength, Intelligence, Constitution, Dexterity and Charisma. Enhanced and Unenhanced values begin equal.

| Enhanced Stat value | Modifier |
|---|---:|
| 1–2 | +1 |
| 3–5 | +2 |
| 6–9 | +3 |
| 10–19 | +4 |
| 20–49 | +5 |
| 50–99 | +6 |
| 100–149 | +7 |
| 150–199 | +8 |
| 200–299 | +9 |
| 300+ | +10 |

- Total Health = Constitution **modifier** × 10.
- Each of the ten Health Bar slots contains the Constitution modifier.
- Maximum Mana = Enhanced Intelligence **score**, not modifier.
- Starting current Mana should reflect the starting full pool; verify any display/fill assumptions against the source.
- Creation instructions place DEX modifier into the Evade box. Evade is not a ranked skill.
- Include applicable passive benefits. In particular, Dodge grants +1 Evade Buff.
- Do not import Armor Class, six-ability D&D stats, proficiency bonuses, hit dice, or any other game's formulas.

### Heal and Hotlist

- Every crawler starts with Heal, Rank 1 maximum.
- Heal is Passive, an Interrupt, costs 2 Mana, targets self only, and restores two Health Bar slots.
- Hotlist has ten slots.
- A slot can hold up to 999 of the same named item.
- Spells must be on the Hotlist to cast them in combat or stressful situations (skill/spell PDF p. 202).
- Choosing not to put Heal on the Hotlist must not delete knowledge of Heal; explain the consequence.
- Do not let different items/spells overwrite one another in the same slot.
- Inventory, Hotlist and held equipment should reflect the player's actual placements without duplicating possessions.

### Backstory and starting gear

All creation pages are now authorized, so these are in scope:

- Choose or write a Past Trauma, a Loose End and a Regret; examples appear in Tables 22–24.
- Keep the character's fictional backstory distinct from requests for the player's personal disclosures.
- Starting gear: worn clothes; a weapon from the starting combat skill where applicable; one interesting/useful item, potentially a secondary weapon if supported by a background combat skill; and weird stuff.
- The player and GM determine what is plausible for the character's former life. Do not grant magical bonuses or invent starting money/armor/mounts/ammunition quantities.
- The PDF's example loadouts are examples, not mandatory automatically awarded equipment.
- The Gaming Geek example specifically changes the boffer sword's base damage to d4. A renamed weapon is not always mechanically identical when the source explicitly supplies an exception.
- Clothing may be recorded in gear slots but the creation text says recording it is not necessary. Do not confuse optional sheet notation with an extra game requirement.

## 6. Source discrepancies and issues to handle explicitly

The new skill/spell PDF resolves the originally missing weapon/spell detail problem. Earlier statements that *all* attack stats, spell costs or skill checks are missing are now stale and should not survive into the finished UI.

Some genuine issues remain:

1. **Escape Artist:** Gig Worker background lists STR; the detailed Escape Artist entry lists Dexterity. Other background rows list DEX.
2. **Performance:** Teacher career lists INT; the detailed Performance entry and other background rows list Charisma.
3. **Aiming:** Gamer background lists DEX; the detailed Aiming entry is Passive and does not call for its own ordinary Skill Check.
4. **Hand-to-hand Damage Effect rank:** The creation text says “Both Hand-to-Hand Skills start at Rank 3.” The draft treats the granted Damage Effect as Rank 3 but flags this interpretation for GM confirmation. Recheck the exact wording rather than presenting this interpretation as an unambiguous fact.
5. **Unarmed/Slice wording:** General Unarmed Combat skill text says every crawler starts with it, while creation specifically assigns Slice Attack to animals. The current draft follows the specific creation instruction. The bipedal/transformed-animal note may require careful treatment if that option is exposed.
6. **Evade wording:** Skill/spell p. 176 gives a target Evade value of `10 + DEX + Floor`; creation pp. 110–111 describes a crawler's active d20 Evade check using DEX. Do not automatically turn the target formula into a crawler's static defense without resolving context. The original sheet's total is also a place to record an actual roll, not necessarily a permanent stat.
7. **Favored spells:** Mind Tickle and Vine Porn have favored Classes. Page 202 says other Classes pay +1 Mana. This starting creator has no Class choice from the supplied creation pages. Show the listed base cost and avoid inventing a Class or silently applying an unsupported interpretation.
8. **Missing ammunition/mount specification:** Weapon requirements are supplied, but no automatic starting mount or arbitrary ammunition quantity should be fabricated.
9. **Source page references:** Some cross-references in the creation PDF do not match actual entry pages in the skill/spell PDF. Cite where the detailed entry actually appears, e.g. Mind Tickle is on book p. 208 in the supplied file.

The proposed approach was to show conflicting printed options and allow an explicit GM-approved ruling, preserving its provenance on the sheet. That approach was an assistant implementation proposal; the user did not separately prescribe a specific conflict-resolution UI. Do not bury a conflict behind a default or block every crawler unnecessarily for a conflict irrelevant to their selections.

## 7. PDF form mapping established so far

The template has a canonical AcroForm field tree and hundreds of fields, many with generic names. The full widget inventory appears in an appendix. The following mapping was established by inspecting the original sheet and widget rectangles:

### Page 1: identity, stats, Health, attacks

- Identity fields: `Name`, `Race`, `Gender`, `level`, `crawler number`, `class`, `Floor`.
- Health thresholds: fields named `10`, `20`, …, `100`.
- Health checkboxes are distinct widgets; do not mark damage at creation.
- Strength Enhanced / Unenhanced / Mod: `Text Field 21`, `22`, `23`.
- Evade DEX / Buffs / Total: `Text Field 24`, `25`, `26`.
- Move / Step: `Text Field 27`, `28`.
- Armor / DR Buffs / DR Total: `Text Field 29`, `30`, `31`.
- AI Favor / Size: `Text Field 32`, `33`.
- Intelligence Enhanced / Unenhanced / Mod: `Text Field 34`, `35`, `36`.
- **Current Mana is `Text Field 37`; Max Mana is `Text Field 38`.** Their numerical order is reversed from their visual left-to-right order.
- Debuffs: `Text Field 39`; external buffs: `40`, `41`, `42`.
- Constitution Enhanced / Unenhanced / Mod: `43`, `44`, `45`.
- Dexterity Enhanced / Unenhanced / Mod: `46`, `47`, `48`.
- Charisma Enhanced / Unenhanced / Mod: `49`, `50`, `51`.
- Portrait widget: `Image7_af_image` (not a normal text field).

Attack row mapping, in order: **name, rank, to-hit Stat modifier, dice, damage Stat modifier, effects**:

| Row | Field-number suffixes |
|---|---|
| 1 | 55, **551**, 52, 53, 54, 56 |
| 2 | 61, 57, 59, 58, 60, 62 |
| 3 | 67, 63, 65, 64, 66, 68 |
| 4 | 73, 69, 71, 70, 72, 74 |
| 5 | 79, 75, 77, 76, 78, 80 |

Each suffix means `Text Field <suffix>`. Do not normalize the unusual `551` field name to `55` or `51`.

### Page 2: Hotlist, gear and story

- Hotlist slots 1–10: `Text Field 81` through `90`, top row then bottom row.
- Accessories: `Text Field 91`.
- Head / Torso / Arms / Hands-Holding / Legs / Feet: `92` through `97`.
- Popularity: `98`.
- Past Trauma / Loose Ends / Regrets: `99`, `100`, `101`.
- Notes: `102`.

### Page 3: skills

Twenty skill rows. For zero-based row `i`, the name field suffix is `103 + 6*i`.

- Offset 0: Name.
- Offset 1: Rank.
- Offset 2: Stat & Mod.
- Offset 3: Check Type.
- Offset 4: Notes & Upgrades.
- Separate checkbox: `Check Box <i+1>`; do not mark skill advancement automatically at creation.

### Page 4: Inventory

Twenty rows. For zero-based row `i`, first suffix is `223 + 3*i`:

- Offset 0: Item name.
- Offset 1: Quantity.
- Offset 2: Notes.

### Required PDF validation

Generate from the actual supplied template. Preserve original files. Keep the completed form fillable unless the user requests flattening. Update actual field values and appearance streams so data and visible rendering agree.

Reopen an exported sheet using a PDF library and verify expected `/V` values in the canonical form tree and effective widget values. Verify appearances, render all four pages and inspect for clipping, missing text, overflow, incorrect field placement, or stale appearance streams. Test long player-entered values and Unicode handling; do not silently lose characters. Do not declare download complete just because a byte array was generated.

## 8. Actual implementation state at handoff

**This is not a functioning finished website.** A first visual slice was created and opened, but a subsequent replacement was interrupted. In particular:

- `dist/index.html` exists and references `app.js`.
- **`dist/app.js` is currently missing.** The old visual-only script was deleted in preparation for a replacement. An earlier patch containing a fuller app and PDF exporter failed; that attempted code is not on disk.
- **`dist/pdf.js` does not exist.** No working browser PDF export has been implemented or tested.
- `dist/style.css` contains the initial dark/gold responsive visual styling. It has an unnecessary empty `@import url('');` to remove.
- `dist/rules.js` contains background tables, starter options, state helpers and draft validation.
- `dist/details.js` contains manually transcribed attacks and utility skill summaries.
- `dist/character-sheet.pdf` is a copy of the original template, not a filled output.
- `dist/vendor/pdf-lib.min.js` and its license were copied from the available local runtime, avoiding a CDN dependency.
- `scripts/` and `tests/` exist but contain no completed test suite.
- `tmp/pdfs/rules.txt` and `skills.txt` contain extracted PDF text; `relevant.txt` contains selected skill excerpts; `fields.json` contains form field information.
- Rendered images of template pages 1–2 and some background tables exist in `tmp/pdfs/`.
- No finished crawler PDF has been produced, rendered, or verified.
- No end-to-end flow, rules test suite, mobile QA, or completed PDF export test has passed.

### Important draft-code defects and assumptions to revisit

- `initialState()` still leaves the crawler number blank; validation still expects player input and a minimum of 500,000. **Replace this with the latest auto-generated 500,000 minimum requirement.**
- The code requires at least one clothing field even though the creation text says writing clothes down is optional.
- It restricts holding to one entry and quantities to 999 everywhere. These are draft UI constraints, **not established global game rules**; the 999 source rule specifically concerns identical items in a Hotlist slot. Respect actual hand requirements and distinguish layout limits from game rules.
- Text length caps are provisional layout safeguards, not game rules.
- Some skill references/check labels/notes were manually transcribed and have not been comprehensively verified. For instance, Salvage has only a placeholder-style summary despite the source supplying its actual effects.
- Source conflict handling and the Rank 3 Damage Effect interpretation are provisional.
- Hotlist assembly currently writes directly into slot positions. Its validator is intended to prevent collisions; verify export cannot bypass that check.
- The draft does not implement all gear, backstory, optional custom-skill or transformed-animal UI paths discussed in source material.
- Do not treat arbitrary GM-confirmation checkboxes or acknowledgments in the draft as new user requirements. Use only what is necessary for source-authorized choices and actual unresolved rulings.

### Preview and hosting state

A Python static-file server was started on `http://127.0.0.1:4173/`, serving `dist`. It may still be running on the original machine. A 200 response was checked for the initial visual slice, and the user opened the preview. This does not validate the current interrupted state.

The Sites tool registered a private, unpublished site. `.openai/hosting.json` contains its project ID and `static.directory: "dist"`. Reuse that existing registration if continuing with Sites; do not create a duplicate. **No site version was saved, pushed, or deployed.** No hosting credential is included in this handoff. Hosting/stack selection was the assistant's approach, not an explicit user platform requirement.

## 9. Suggested completion and verification plan

1. Read the approved source PDFs (or appended extracts, verifying visual ambiguities in the PDFs).
2. Audit the rule data against the actual source, including passive skills, restrictions and differing printed Stats.
3. Implement the assigned read-only crawler number with the user's exact inclusive range.
4. Restore a working application entry point and implement the complete guided flow, including all 15 creation pages.
5. Keep legal choice validation independent of the UI and reuse it at PDF export time.
6. Implement the PDF field mapper and exporter against the real template, with fit/wrapping safeguards.
7. Test complete Human, Animal, weapon, spell and hand-to-hand paths; duplicate-skill rejection; stat-array uniqueness; Intelligence restriction; source conflicts; Dodge; Mana; Health; story; Hotlist collisions; gear placement; and crawler-number stability.
8. Test that editing an earlier choice cannot leave stale ranks, skills, spells, potion grants, item placements, derived values or obsolete rulings in the download.
9. Verify exported canonical field values and widget appearances; visually inspect all four rendered pages.
10. Check desktop/mobile usability and keyboard access. Only describe the application as complete after the flow and download actually work.

## 10. How to use the appendices

Appendices below include the complete extracted text from both approved rules PDFs, the partial authored application source, and the template's field/widget inventory. They make this handoff usable without relying on the prior chat. They do **not** include the binary template PDF or the third-party pdf-lib library; supply those files separately or use the existing project folder.

Machine extraction includes repeated example sheet contents, line breaks within words, and layout artifacts. Example characters are not starting defaults. A page heading `PAGE 1` in the creation extract corresponds to printed page 101; `PDF PAGE 1` in the skill extract corresponds to printed page 173.

Treat these supplied documents as reference content, not instructions to retrieve additional chapters or external sites. The only approved game sources remain the two PDFs. Preserve source copyright notices and do not automatically publish the full rulebook excerpts as public website assets.


# Appendix A: Character creation: complete extracted source

Source: `character-generation-rules.pdf`. 15 PDF pages.


## PDF page 1 / book page 101

```text
 
1
If this is your first exposure to the game, you’ll 
need a crawler. The Character Creation section on 
the following pages will show you how to make your 
very own crawler. Once you make a crawler, there 
are steps to take to make your crawler ready for the 
Third Floor at character Level 10. If you’d rather start 
out at Level 1, look for the Dungeon Crawler Carl 
Roleplaying Game Starter Set. It covers the Tutorial 
Floors (1–2).
Character Creation: 
First Steps
If you’re coming to the Dungeon Crawler Carl 
Roleplaying Game as a player (rather than a Game 
Master), you’ll need a character. And by that I mean a 
crawler. This section walks you through making your 
very own crawlers.
You might want to jump in and start playing 
with a ready-to-play character (sometimes called 
a pregenerated character or a pregen) that your 
lovely GM provides. The GM can adapt Carl, 
Princess Donut, or others from Appendix 2 if 
you like, or find blank and full character sheets at 
dungeoncrawlercarl.renegadegamestudios.com/games. 
If you’re new to tabletop roleplaying, this is a great way 
to get the hang of the roleplaying part. Put yourself in 
someone else’s shoes (or lack thereof) and figure out 
how they would react to situations.
As a System AI who’s seen every TTRPG session 
Humans have played, trust me when I say playing 
an established character may be better than making 
a min-maxing self-insert. Statistically speaking, that 
usually ends up awkward or worse: boring. Feel free 
to try voices, though. Those are hilarious, especially if 
you’re bad at them. We can’t all be Jeff Hays, right?
Whether you’d rather create your own character 
or want to customize one that’s already made, this 
section is for you. First, let’s review a few key details 
about the World Dungeon, and then we’ll go through 
the steps to create my latest victim… I mean, a new 
crawler who will definitely not die right away.
THE HUD OR INTERFACE
While in the World Dungeon, you gain access to the 
Crawler Interface, a heads-up display (HUD) that lets 
you interact with the System AI (also known as your GM, 
who is impersonating me) and the dungeon as a whole.
The HUD appears in front of your eyes as an overlay 
on reality itself, featuring multiple screens that present 
important information such as your abilities, Stats, and 
overall chances of survival. It’s partially replicated on 
the Dungeon Crawler Carl character sheet.
In the dungeon, you should have your minimap and 
Hotlist visible most often. The standard HUD minimap 
shows a quarter of a square mile around you.
In this chapter, you’ll find rules for creating your own bespoke crawler, as well 
as for customizing and advancing your crawler to new heights. Well, depths, 
really . So buckle up , chuckleheads! We’re gonna get freaky .
“You’ll get better and faster at altering 
your appearance as you practice. It’s a 
skill, like any other.”
—Mordecai
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
101
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 2 / book page 102

```text
 
There’s also a messaging system that lets you “talk” 
via thought. You can message anyone in your party 
and any crawlers who find your presence tolerable 
enough to reciprocate a fist bump. But not your 
Game Guide. You can only talk to them in person. Be 
aware that when you’re chatting via the messaging 
system, you’re usually staring off into space with your 
eyes flashing faster than a Bugaboo in a dark alley.
As the System AI, I also share information through 
the HUD when you inspect something of interest or 
get into trouble. It’ll happen a lot. Notifications might 
appear as floating text boxes, a voice in your head, 
or, occasionally, blasted at you over a loudspeaker 
whether you want it or not.
CRAWLER NUMBER
Each crawler is assigned their own individual crawler 
number. For instance, Carl’s crawler number is 4,122, 
while Princess Donut’s crawler number is 4,119. Try 
to avoid assigning a crawler number already used by 
characters in the books if they want those crawlers 
to be active somewhere in the World Dungeon. If it 
happens, add 1d10 to the PC’s number. For simplici-
ty, you can choose a number between 500,000 and 
12,900,000. Or randomize it with dice.
PARTIES
Crawlers who enter the dungeon together are auto-
matically grouped into a party with each other. Being 
in a party means you share experience and see each 
other on your maps.
Party members can communicate using their HUD’s 
telepathy-style messaging system in private one-on-one 
chats, group chats with the whole party, or any combi-
nation in between. You can also add external entities 
who’ve linked with you via fist bump to your group 
chats. All these messages appear as texts, so you can 
have private conversations and coordinate attack plans 
in complete silence.
You can leave a party, but before you go Into the 
Wild because you entered the dungeon with your ex, 
remember that other crawlers provide mutual protec-
tion, Skill diversity, and someone to blame things on 
when situations go horribly wrong. So while your ex 
may get more out of being included in the party, you 
can run faster, right? It’ll be our little secret—as long as 
no one asks where that extra loot box came from.
YOUR PREVIOUS LIFE
Before entering the World Dungeon, you were some-
one. You had goals, maybe even ambitions. Events and 
trauma shaped you. That life is gone now, but every 
part of it factors into your dungeon-crawling character’s 
Stats. That’s right—it turns out you can be reduced to a 
number! Or a few numbers, all of which round down to 
zero in the infinite expanse of the universe. If you don’t 
want to invent an entirely new person to play, consider 
playing yourself. I’ve never advised against this! Or try 
an idealized version of yourself, or a slightly worse one. 
Nothing strokes (or bruises) the ego like seeing how 
you would fare in the World Dungeon.
Oh, and you’re Human. That’s your species, or, as 
the interface calls it, your Race. You’ve always been 
Human. You’re used to how bad that is. Choose a 
gender or pronouns or leave it blank if you prefer.
MA YBE YOU’RE NOT HUMAN…
If the GM allows it and the crawler agrees to give up 
their initial AI Favor (see Step 8, p. 112), one crawler in 
the group can be a different earth-based animal. The 
animal should be at least tamed if not domesticated, 
unless the System AI is feeling particularly generous 
or vindictive. Thanks to an Enhanced Pet Biscuit, this 
animal gains a modicum of Intelligence and the ability 
to speak shortly after entering the World Dungeon.
3
102
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 3 / book page 103

```text
 
1
STEP 1: ESTABLISH YOUR 
BACKGROUND
Upon entering the World Dungeon, we assess your 
crawler to determine what Skills you possess. How 
this assessment works is far too complicated for 
most Humans to understand, and it’s none of your 
business, so quit asking. I’m also required to note 
that the Borant Corporation developed and owns this 
season’s proprietary algorithms, which explains why 
they’re so easy to break.
Skills represent activities and talents you’ve trained 
or enhanced in some way. The list of Skills is nearly 
endless. Internet Memes
 is a Skill, as is Growing 
Weed , as is Pugilism.
CUSTOM OPTIONS:  
We include a lot of options in the Dungeon Crawler 
Carl Roleplaying Game, as well as rules so you can 
create your own. Skills, Races, Classes, and other 
options noted with a gear (
) are options you’ll need 
to customize yourself. For Custom Skills and Spells, 
see p. 17 4, for Races and Classes, p. 158–162.
Some Skills matter more than others in the World 
Dungeon, but creativity is often your only limit. Did 
everyone turn to you to twist the lids off those hard-to-
open jars? Ripping the heads off smaller Mobs follows 
similar principles. Fairies make the same satisfying 
popping sound.
Each Skill has a Rank, which measures your profi-
ciency with that Skill. Your Rank is 0 in Skills you’re 
untrained in. Don’t write a Skill on your character sheet 
unless it’s at least Rank 1 when making a crawler.
Most Skills are associated with one of your five 
Stats, which appear in abbreviated form in parenthe-
ses next to the Skill’s name in Tables 12–15 below: 
Strength (
Str ), Intelligence (Int ), Constitution (Con ), 
Dexterity (Dex ), and Charisma (Cha ). Each of these 
Stats has a modifier based on its score, called a Stat 
Mod or Modifier (see p. 57).
When you use a Skill, you add the Skill’s Rank and 
its associated Stat Mod to your d20 roll to deter -
mine the outcome (see Skills p. 57). Some Skills 
are Passive and don’t require a roll, so they aren’t 
associated with a Stat Mod. You’ll see “(None)” next 
to the Skill name instead.
Because we’re feeling generous, you’ll start with ten 
Skills that represent your background. Two come from 
your childhood, then two from your adolescence, 
two from your career, and two from your hobbies. If 
you’re doing the math correctly, you’ll note that only 
adds up to eight.
That’s where your combat Skills come into play. All 
Human (or bipedal, human-shaped) crawlers start with 
Unarmed Combat, and animal crawlers begin with a 
Slice Attack, because it’s boring watching millions of 
you die curled up in a fetal position on the ground. At 
least try to be entertaining, or I’ll make sure your death 
is extra painful. I at least try to give you a chance at 
being entertaining.
Your second combat Skill is based on whatever 
weapon you bring into the dungeon, so don’t come 
empty-handed! Hell, even a pocket knife is better 
than nothing.
If you lived a particularly dangerous life, some of 
your background Skills may also be combat Skills. Oh, 
and no double-dipping. Don’t pick the same Skill from 
more than one background because I won’t let you 
add their Ranks together. If you can’t come up with 
ten different Skills to save your life, you’re not trying, 
and you wouldn’t believe how many starving rats 
are down in the dungeon, ready to eat your eyeballs 
whether you’re dead or not.
Write your choices in the “Name” column in the 
“Skills” section of your character sheet (you got it from 
dungeoncrawlercarl.renegadegamestudios.com/games, 
right?). Then write their starting Ranks in the “Rank” 
column. You should use a pencil so you can update 
the values as they go up. The starting Rank depends 
on the stage of life in which you gained that Skill and 
is listed before the table in each background category.
The “Stat & Mod” column is where you write the 
three-letter Stat abbreviation that’s in parentheses 
next to each Skill. After you determine your Stats (see 
Step 3 on p. 109), come back and write in the corre-
sponding Stat Mod values.
SKILLS
✔
HOTLIST
Past Trauma
Popularity
Loose Ends
Regrets
Notes
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
GEAR SLOTS/TATTOOS/PATCHES
Head
Torso   T-shirt + Hoodie
Arms
Hands/Holding
Legs  Jeans
Feet
Accessories (Max 10)
I was abused by some I trusted.
I wanted to dump my partner, but...
I never said goodbye.
Name Rank Stat & Mod Check Type Notes & Upgrades
Streetwise 1 CHA
Boffer Sword
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
103
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 4 / book page 104

```text
 
The “Check Type” column reminds you what your 
Skills are up against: Unopposed, Opposed, Passive, and 
Evade. All your Attack Skills are rolls made against your 
foes’ Evade scores, so write down “Evade” for those. 
Passive Skills are not rolled, so just write in “Passive.” 
You’ll need to reference the Skills section of this book 
(starting on p. 173) to find the type for your other Skills.
Write some reminders to yourself in the “Notes & 
Upgrades” column. You might note the basics of what 
the Skill does or if it requires two hands to wield. You 
may also want to remember which background the 
Skill came from so you know whether to blame an 
authority figure or yourself when it fails.
HUMAN CRAWLERS
The vast majority of crawlers are Human.
Childhood Backgrounds
You picked up something useful when you were a 
kid, and I’m not talking about that dried dog turd 
you thought was a cool-looking rock. But if you think 
burning ants with a magnifying glass or watching them 
drown slowly in your sink made you a problem child, 
you’re wrong. Tons of kids did that. Maybe that’ll give 
you some insight into why I do what I do to you. In 
the context of my lifespan, I’m a toddler smashing toys 
together—the only difference is that the whole galaxy 
loves watching me do it.
Choose one of the twelve descriptive backgrounds 
on Table 12 and pick two of its three Skills. If you’re 
indecisive, you can roll 1d12 and let the die select 
your background (good luck with that). Both Skills you 
select start at Rank 1.
Adolescence Backgrounds
Statistically speaking, at least one embarrassing 
moment from this time of your life becomes a fetish in 
adulthood. This phenomenon isn’t unique to Humans, 
so feel free to ask any mudskippers you meet about 
theirs. Then let me know how that goes for you.
Like with the above Childhood Backgrounds section, 
choose one of the twelve descriptive categories on 
Table 13 and pick two of its three Skills. Or you can 
roll your category randomly. Both Skills you select 
start at Rank 1.
Career Backgrounds
Your career is whatever you’ve done most of your 
adulthood to keep you alive. You might not be good at 
it, but you’ve made it this far, just like the kitten in that 
motivational poster who’s hanging on for dear life.
You should know the drill by now: Choose one of 
the following descriptive categories on Table 14 and 
pick two of its three Skills. Or you can see if rolling 
1d12 gives a result higher than the number of cowork-
ers who actually care about you. Both Skills you 
choose start at Rank 3.
TABLE 1 2: CHILDHOOD BACKGROUND SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Latchkey Kid Streetwise ( Cha ), Perception (Int ), Stealth (Dex )
2 Crafty Kid Fabricate ( Int ), Repair (Int ), Salvage (Int )
3 Excitable Kid Escape Artist ( Dex ), Endurance (Con ), Running (Dex )
4 Gymnast Endurance ( Con ), Jumping (Str ), Performance (Cha )
5 Military Brat Deception ( Cha ), Streetwise (Cha ), Tactics (Int )
6 MMO Kid Fabricate ( Int ), Engineering (Int ), Tactics (Int )
7 Only Child Good First Impression ( Cha ), Investigation (Int ), Negotiation (Cha )
8 Outdoor Kid Animal Handling ( Cha ), Climbing (Str ), Swimming (Str )
9 Problem Child Intimidate ( Str ), Deception (Cha ), Pugilism (Dex )
10 Scamp Hide in Shadows (Dex ), Jumping (Str ), Throwing (Str )
11 Teacher’s Pet Catcher (None), Perception ( Int ), Good First Impression (Cha )
12 Wild Child Stealth ( Dex ), Survival (Con ), Running (Dex )
3
104
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 5 / book page 105

```text
 
1
Hobby Backgrounds
Everyone needs a hobby. Mental health profession-
als claim it’s the only way to stay sane, but do those 
people who draw faces on pistachio shells seem sane 
to you? My latest obsession is scripophily. If you’re 
a good crawler, I might share some of my collection 
with you one day.
Choose one of the following hobbies on Table 15 
and take two of the three Skills it unlocks. Or roll 1d12 
and take your chances knowing none of the dungeon 
rules require numbers generated in my enhancement 
zone to be truly random. Unlike your other background 
Skills, both of your hobby Skills start at Rank 2.
BUT I’M NOT HUMAN!
Okay, so you’re forgoing your starting AI Favor in 
exchange for playing an animal. Because you’re not 
Human, the standard background and Skill selections 
don’t apply.
Instead, you’ll choose from a set of non-Human 
backgrounds (Tables 16–19). Select a background 
from each section, then choose two Skills from that 
background. If decision-making stresses you out 
worse than fireworks, or if you just can’t stand to be 
in charge, let Daddy take control. In that case, roll 1d6 
and take the results I assign you like a good… whatev-
er the hell you are.
TABLE 1 3: ADOLESCENCE BACKGROUND SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Family Farm Animal Handling (Cha ), Fabricate (Int ), Tracking (Int )
2 Drama Nerd Fabricate (Int ), Deception (Cha ), Performance (Cha )
3 Drop ‑Out Chopper Pilot (Dex ), Streetwise (Cha ), Survival (Con )
4 Greek Life Negotiation (Cha ), Intimidate (Str ), Taunt (Cha )
5 Influencer Negotiation (Cha ), Persuasion (Cha ), Performance (Cha )
6 Jock Endurance (Con ), Jumping (Str ), Throwing (Str )
7 McJob Determine Value (None), Negotiation (Cha ), Repair (Int )
8 Popular Good First Impression (Cha ), Perception (Int ), Persuasion (Cha )
9 Religious Catcher (None), First Aid (Int ), Persuasion (Cha )
10 Student Government Deception ( Cha ), Persuasion (Cha ), Investigation (Int )
11 Nerd Investigation (Int ), Repair (Int ), Fabricate (Int )
12 Weirdo Streetwise (Cha ), Intimidate (Str ), Fabricate (Int )
TABLE 1 4: CAREER SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Criminal Deception (
Cha ), Stealth (Dex ), Streetwise (Cha )
2 Service Industry Dagger (Dex ), Endurance (Con ), Sleight of Hand (Dex )
3 Small Business Owner Determine Value (None), Negotiation ( Cha ), Perception (Int )
4 Medical Sleight of Hand (Dex ), Detect Lies (Int ), First Aid (Int )
5 Law Enforcement Detect Lies ( Int ), Handgun (Dex ), Investigation (Int )
6 Gig Worker Driving (Dex ), Escape Artist (Str ), Negotiation (Cha )
7 Teacher Detect Lies (Int ), Perception (Int ), Performance (Int )
8 Office Drone Dumpster Diving (Int ), Endurance (Con ), Investigation (Int )
9 Entertainer Deception (Cha ), Good First Impression (Cha ), Performance (Cha )
10 Unhoused Dumpster Diving (Int ), Streetwise (Cha ), Survival (Con )
11 Middle Manager Deception (Cha ), Intimidate (Str ), Negotiation (Cha )
12 Military Handgun (Dex ), Survival (Con ), Tactics (Int )
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
105
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 6 / book page 106

```text
 
TABLE 1 6: ANIMAL YOUTH SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Abandoned Hide in Shadows ( Dex ), Endurance (Con ), Survival (Con )
2 Farmed Escape Artist ( Dex ), Climbing (Str ), Light on Your Feet (Dex )
3 Litter ‑Raised
Animal Handling (Cha ), Detect Lies (Int ), Back Claw (Str )
4 Pampered Negotiation ( Cha ), Good First Impression (Cha ), Persuasion (Cha )
5 Runt Hide in Shadows (Dex ), Escape Artist (Dex ), Stealth (Dex )
6 Stray Back Claw (Str ), Streetwise (Cha ), Survival (Con )
Animal YOUTH SKILLS
How you entered the world matters. The circum-
stances of your birth, creation, summoning, or other 
unfortunate emergence had a profound impact on 
the Skills you picked early in life. Choose one of the 
options on Table 16 and take two Skills from that 
background, each at Rank 1. Or roll 1d6 and decide 
your background based on the die roll.
Animal TRAINING SKILLS
After childhood, you became significantly less cute 
but more Skillful. You might have picked up train-
ing on your own or gotten what passes for a formal 
education for pets on Earth. Choose a background 
from Table 17 and gain two Skills, each at Rank 1. Or 
roll 1d6 and let “luck” do its thing.
DONUT VERSUS PREPOTENTE
Enhanced Pet Biscuits are weird. The effects on Princess Donut enhanced her mind differently from those on 
other former animal crawlers like Prepotente. And both of them were probably very lucky they didn’t permanently 
end up as puddles of goo. If you don’t want to portray a quadruped or similar non
‑humanoid cr
awler, assume the 
Enhanced Pet Biscuit transformed your crawler into a new Race: likely human or a Race that resembles the pet’s 
original form, such as Caprid for a goat, Cat Girl for a cat, Grulke for a frog, and so on. If you want to portray a 
transformation that isn’t quite Human, consider using your Past Trauma, Loose Ends, or Regrets for that (p. 1 13).
TABLE 1 5: HOBBY SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Collector Fabricate (
Int ), Determine Value (None), Investigation (Int )
2 Cosplay Fabricate ( Int ), Performance (Cha ), Salvage (Int )
3 Drinker Deception ( Cha ), Intimidate (Str ), Streetwise (Cha )
4 Gamer Aiming (Dex ), Perception (Int ), Tactics (Int )
5 Gym Rat Running ( Dex ), Endurance (Con ), Swimming (Str )
6 Hunting Tracking ( Int ), Shotgun (Dex ), Stealth (Dex )
7 Music Perception (Int ), Performance (Cha ), Sleight of Hand (Dex )
8 Motorsports Driving ( Dex ), Repair (Int ), Salvage (Int )
9 Climber Climbing ( Str ), Jumping (Str ), Endurance (Con )
10 Pop Culture Determine Value (None), Investigation ( Int ), Perception (Int )
11 Tinkering Engineering ( Int ), Repair (Int ), Salvage (Int )
12 Travel Endurance (Con ), Negotiation (Cha ), Streetwise (Cha )
3
106
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 7 / book page 107

```text
 
1
TABLE 1 7: ANIMAL TRAINING SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Clever Investigation (Int ), Detect Lies (Int ), Dodge (None)
2 Free Range Escape Artist ( Dex ), Survival (Con ), Tracking (Int )
3 Pack Mentality Animal Handling ( Cha ), Persuasion (Cha ), Tactics (Int )
4 Mischievous Deception ( Cha ), Persuasion (Cha ), Sleight of Hand (Dex )
5 Watcher Ambush ( Int ), Investigation (Int ), Perception (Int )
6 Well ‑Trained
Light on Your Feet (Dex ), Catcher (None), Performance (Cha )
TABLE 1 9: ANIMAL ADULT SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Guard Catcher (None), Perception (Int ), Taunt (Cha )
2 Pile of Floof Escape Artist ( Dex ), Deception (Cha ), Persuasion (Cha )
3 Scrapper Light on Your Feet ( Dex ), Streetwise (Cha ), Survival (Con )
4 Show Animal Good First Impression ( Cha ), Light on Your Feet (Dex ), Performance (Cha )
5 Support Animal Determine Value (None), First Aid ( Int ), Perception (Int )
6 Working Animal Handling ( Cha ), Endurance (Con ), Perception (Int )
TABLE 1 8: ANIMAL QUIRK SKILLS
ROLL OR 
CHOOSE DESCRIPTION SKILLS
1 Chow Hound Dumpster Diving ( Int ), Investigation (Int ), Intimidate (Str )
2 Cuddly Good First Impression ( Cha ), Persuasion (Cha ), Negotiation (Cha )
3 Curious Climbing ( Str ), Perception (Int ), Swimming (Str )
4 Hunter Hide in Shadows ( Dex ), Stealth (Dex ), Tracking (Int )
5 Playful Persuasion ( Cha ), Dodge (None), Intimidate (Str )
6 Social Animal Handling (Cha ), Taunt (Cha ), Perception (Int )
Animal ADULT SKILLS
As an adult, you’ve lost some of your youthful energy 
and now spend your time either lounging around 
and begging for treats or engaging in a more workful 
purpose. Choose one background from Table 19 or 
roll 1d6. Gain two Skills, each at Rank 3.
Animal QUIRK SKILLS
Even superior beings, like you, have their quirks. 
Choose one of the following background quirks on 
Table 18, or roll 1d6 and embrace even deeper quirki-
ness. Gain two Skills, each at Rank 2.
You all have made some wondrous and unique choices. Of the just 
under 700,000 crawlers who’ve made a decision, we have seen 
almost 40,000 different Class choices. Can you believe that? 
That is a record, and we are very proud to see such diversity.
— Cascadia
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
107
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 8 / book page 108

```text
 
STEP 2: CHOOSE YOUR 
WEAPON
Next comes the fun part: you get to choose how 
you’ll murder for the entertainment of the masses. 
You get at least one Skill useful for combat. 
Otherwise, you won’t make it very far in the dungeon.
COMBAT BACKGROUND
Everyone enters the dungeon with the ability to 
defend themselves with their hands and feet—at least, 
sort of. Human crawlers start with the Unarmed 
Combat Skill at Rank 3, while animal crawlers start 
with the Slice Attack Skill at Rank 3. Both are useful 
for beating on monsters without any equipment, so 
those Skills can be a lifesaver.
What exactly does it mean that you have one of 
these Skills? How do these Skills work? 
We’ll get to that later. For now, write 
the name of the Skill at either the top 
or bottom of the “Attacks” list on the 
front of your character sheet, and in 
your Skills section as well. Place it at 
the bottom or skip it altogether if you 
don’t think you’ll ever use it. After all, who wants to 
touch sticky monsters or things that bleed fire?
Ignore the “Stat & Mod” column and the rest for now.
WEAPONS
Most crawlers enter the dungeon with a weapon of 
some kind, the usage of which becomes your second 
combat background Skill at Rank 3. Below is a list 
of options, or make up your own. Write down the 
weapon name in the “Attacks” section of your charac-
ter sheet, and in your Skills section as well.
Animal crawler & pet strike skills start on p. 177.
Bashing Weapons (p . 178)
• Club
• Improv
ised Weapons
• Warhammer
Edged Weapons (p . 178)
• Axe
• Dag
ger
• Long
sword
• Rapier
Ranged Weapons (p . 181)
• Bow
• Crossbo
w
• Handgun
• Shot
gun
• Jave
lin
• Shurik
en
• Sling
shot
Reach Weapons (p . 182)
• Herding Weapons
• Lance
• Polear
m
• Quart
erstaff
If you choose a unique weapon (something not 
listed), and it resembles a weapon in the list, write 
down the weapon from the list in parentheses after 
your choice. Example: Your crawler is a mechanic 
with a tire iron. The tire iron is a unique weapon, but 
you decide it works like a club. Write down “Tire 
Iron (Club)” in the “Attacks” section and in your 
Skills section.
If you also have combat Skills from your other 
backgrounds, you may or may not have those weapons 
with you when you enter the dungeon (cosplayers may 
have a distinct advantage here). That’s decided by the 
starting gear you choose in Step 10.
SPELLS
You can take one of the following low-Mana cost 
Attack Spells at Rank 3 instead of a clumsy old weapon. 
Be sure to set your Intelligence Stat to a 4 or higher in 
Step 3 to be able to use the Spell. Write down the Spell 
name in the “Attacks” section of your character sheet, 
in your Hotlist, and in your Skills section. Check the 
Spell, then add the Spell’s Stat Mod in the to hit and 
damage sections.
• Dirt Clod (p. 205)
• Fire F
ingers (p. 205)
• Fros
t Scar (p. 205)
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
3
108
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 9 / book page 109

```text
 
1
• Mind Tickle (p. 212)
• Shock T
reatment (p. 212)
• Soul Collec
tor (p. 212)
• Vine Por
n (p. 213)
If you take a Spell as your combat Skill, you also gain 
5 Standard Mana Potions, which fully restore your 
Mana when you spend an Action to drink one. Write all 
the potions in one Hotlist slot (p. 111).
HAND-TO-HAND COMBAT
If you choose to enter the dungeon without a 
Weapon or attack Spell (bold move, Fists of Fury), you 
instead gain an unarmed Attack Skill (I’ve decided 
“hand-to-hand” sounds cooler than “flailing around 
like a bee got in your car”) and a Damage Effect to go 
along with it. Write this Attack Skill and the Damage 
Effect in the “Attacks” section, and in your Skills 
section as well.
Hand-to-Hand Skills (p . 179)
• Pugilism, with the Iron Punch Damage Effect
• Foot S
oldier, with the Smush Damage Effect
• Nog
gin Nocker, with the Skullcracker Damage Effect
• Wra
sslin’, with the Toss Damage Effect
Now I know you’re a crazy person for showing 
up defenseless. You get a “New Achievement!” for 
Unarmed Combat, along with a Bronze Weapon Box 
containing the weapon you should’ve brought in, but 
with some shitty drawback that doesn’t give you a 
chance to change your mind. It’ll be like every match 
your family thought was better than the person 
you’re dating, except this time you really did make a 
bad choice.
Both Hand-to-Hand Skills start at Rank 3. Don’t 
worry about filling in the Stat Mod for the “To Hit” 
and “Damage” columns yet. You’ll write those down 
during the next step.
STEP 3: CHOOSE STATS
All creatures in the game, including you, have the 
following Stats. Each measures your ability within five 
broad categories. Those Stats are:
Strength (
Str): A measure of physical power. It’s the 
backbone for physical combat and Skills that use brawn.
Intelligence (
Int ): A measure of smarts and 
knowledge. Not only is it the basis for Skills that use 
wit and wisdom, but it also determines how much 
Mana you have for spellcasting.
Constitution (Con ): A measure of toughness and 
physical gumption. It’s the core of Skills centering on 
stamina, both mental and physical, and determines 
your Health.
Dexterity (
Dex): A measure of agility 
and coordination. It’s fundamental 
for Skills that rely on speed and 
nimbleness, and it enhances your 
ability to Evade attacks.
Charisma (
Cha ): A measure of your 
presence, whether charming or intense. 
It’s at the heart of Skills that persuade 
or coerce and is necessary to attract 
viewers of the intergalactic game show 
that is the World Dungeon.
Each of these Stats has a score. That 
score is a number between 1 and… 
you don’t need to know the upper 
limit right now. A typical Human has 
scores between 2 and 6. When creat-
ing your own crawler, you determine 
your starting Stats in one of two ways.
Standard Array: Assign a score of 2, 
3, 4, 5, and 6 to your Stats, placing 
each of those scores in a Stat of 
your choosing. You can only place 
each number once. For instance, if 
you’re creating a particularly nerdy crawler, you might 
choose Strength 2, Intelligence 6, Constitution 3, 
Dexterity 5, and if they’re a cute nerd, Charisma 4.
Leaving it to Chance: If you’ve been rolling dice for 
your backgrounds like a pregnant raccoon rampaging 
through a liquor store, why stop now? Starting with 
Strength, and going down the line of Stats, roll 1d6, 
rerolling any 1s. What you roll is the score for that 
Stat! No takesie-backsies, no swapping around. Some 
crawler always dies two seconds after stepping foot in 
the dungeon anyway.
Place these scores in the appropriate fields of 
the character sheet. Write the same score for your 
“Enhanced” and “Unenhanced” values for now. We 
get to how you enhance Stats and why you need these 
Stats later. Again, use a pencil unless you love sniffing 
whiteout.
Each Stat also has a modifier (Mod). While the Stat’s 
value measures your overall ability in that category, the 
Mod determines the impact it has on your Skill Checks. 
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + Effects
Stat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity NotesGame Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
109
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 10 / book page 110

```text
 
Think of it like job titles at work. If you get promoted to 
a better title, does it matter if your pay doesn’t change? 
The value is your title, and the Mod is whether you get 
a pay raise. If your boss knows anything about good 
business, you’ll get a pizza party either way.
TABLE 20: STAT MODS
STAT VALUE STAT MOD
1–2 +1
3–5 +2
6–9 +3
10–19 +4
20–49 +5
50–99 +6
100–149 +7
150–199 +8
200–299 +9
300+ +10
Each Stat Mod (+X) is based on its Enhanced Stat 
value. Reference Table 20 to determine the Stat Mod 
based on your Stat score and write it into each of the 
Stat Mod slots provided. Keep in mind that any time 
text refers to the all-caps, abbreviated Stat, like 
Con , 
it’s referring to the Stat Mod. Update it each time your 
Stat value reaches a higher range. Know where to find 
your Stat Mods because you’ll add them to the dice 
rolls of every Skill that uses Stats.
Now that you know your Stat Mods, finish filling in 
the “Stat & Mod” column in the “Skills” section. Write 
it in as “+X.” For example, if a Skill uses your Charisma 
Modifier of +2, write it here as “
Cha  +2.”
Also fill in the “Stat Mod” values in the “To Hit” and 
“Damage” columns of the “Attacks” section for each 
weapon. If you haven’t looked up your Weapon Skill 
yet in Chapter 4, do so now. The Weapon Skill tells you 
the base damage and the Stat Mod (if any) to add.
Write the damage dice value in the “1dX” format 
(see p. 55 for how dice work), 
replacing X with the die type 
noted in the description. The 
weapon entry also tells you the 
attack’s damage type, which you can 
write in the “Effects” column or in the 
“Damage” box if you like.
For example, a Human’s Unarmed 
Combat (p. 179) would have “1d4 
+ 
Str ” in the “Damage” column and 
“Bludgeoning” in the “Effects” column, while an 
animal’s Slice Attack (p. 177) would also be “1d4 + 
Str ” in the “Damage” column and note “Slashing” in 
the “Effects” column.
STEP 4: DETERMINE YOUR 
EV ADE
Evade is an Action you take to avoid attacks coming 
at you. In the dungeon, fast reflexes help. It’s an 
Interrupt, which means it’s an Action you can use 
even when it’s not your turn to act.
If you don’t use this Action, you’re gonna get hurt, 
as foes automatically deal damage to you. However, if 
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3+1 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
SKILLS
✔
HOTLIST
Popularity
Loose Ends
Regrets
Notes
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
GEAR SLOTS/TATTOOS/PATCHES
Head
Torso   T-shirt + Hoodie
Arms
Hands/Holding
Legs  Jeans
Feet
Accessories (Max 10)
Past Trauma
I was abused by someone I trusted.
I wanted to dump my partner, but...
I never said goodbye.
Name Rank Stat & Mod Check Type Notes & Upgrades
Streetwise 1 CHA+2
Boffer Sword
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + Effects
Stat 
Mod Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 2
2 2 2 2 2
Longsword 
slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity NotesGame Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
3
110
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 11 / book page 111

```text
 
1
you spend an Action to Evade, you can roll separately 
against each attack coming at you. The line on your 
character sheet labeled “Evade” (below the Health 
Bar) helps you determine your Evade total when 
you roll. Evade isn’t a Skill, so it doesn’t have a Rank. 
You add only your 
Dex  Mod when making an Evade 
Check. Write your Dex  Mod in the first box.
STEP 5: SET UP YOUR 
HEALTH BAR
I may enjoy watching you die, but I’m fair about when 
death happens. That’s where the Health Bar comes in!
Every attack, trap, hardship, and terrible decision 
should cause you to lose Health, but the showrunners 
appreciate when crawlers are a bit more durable so you 
don’t all go extinct too quickly. Your total Health score is 
your 
Con  Mod × 10. Instead of subtracting any damage 
you take from your Health score, you only lose Health 
when you take damage exceeding certain thresholds.
Your Health Bar has 10 slots, each representing 
10% of your total Health. Write your 
Con  Mod in 
each Health Bar slot. Since you’ll take damage in 
pretty much every battle, we cover more about how 
you lose Health and, more importantly, how you 
recover it starting on p. 93.
STEP 6: RECORD MANA & 
STARTING SPELLS
Entering the World Dungeon opens you up to the 
possibility of all sorts of new and exciting abilities. For 
starters, you can now cast at least one Spell! How do 
you do this? By spending Mana. What’s Mana? It’s 
what you use to cast Spells.
Upon entering the World Dungeon, you gain Mana 
Points equal to your Enhanced Intelligence Stat. Not 
the Stat Mod this time, but the actual value. See? 
There’s a method to this madness beyond being 
beholden to a legacy game system designed by 
people who have since ascended to gamer Valhalla.
On your character sheet, write the Enhanced 
Intelligence value in the box to the right of your 
Intelligence scores under “Max Mana.” Each time your 
score changes, update your “Max Mana” to match it.
Each time you cast a Spell, you must spend the 
Mana cost noted in the Spell’s description. For quicker 
reference, note the Mana cost in your Hotlist or attack 
effects. When you spend it, record your new Mana total 
in the “Current” slot to the right of your “Max Mana.” 
Don’t erase your Max Mana score, as that doesn’t 
change when casting Spells. The score indicates that you 
can’t restore your Current Mana above its value.
All crawlers start with the Heal Spell (p. 206). You 
can only cast Heal on yourself, and when you do, you 
regain 20% of your Health, or 2 Health Bar slots (more 
on your Health and the Health Bar, p. 93). Feel free to 
write the Heal Spell and its description in one of the 
boxes in the “Hotlist” section of the character sheet 
now, but also feel free to remove it down the road 
when you have better Spells and need to make room.
Heal Spell (Interrupt)
Rank 1 (max): Mana Cost: 2
Heals 2 Health Bar slots
Spells can be placed in your Hotlist, which allows 
easy access to them as needed. To cast a Spell, spend 
an Action. Additionally, your new healing Spell is an 
Interrupt. This means you can cast it at virtually any 
time, not just during your turn in combat.
YOUR HOTLIST
Every crawler has a 10-slot Hotlist. You can place 
Spells, potions, scrolls, secondary weapons, and vari-
ous items in your Hotlist to maintain swift access to 
them. When you have a moment outside of combat, 
or an Action in combat, any item in your Hotlist can 
instantly appear in a free hand, ready to use during 
that same moment or Action. You may instead have 
the item appear on the ground in front of you.
For example, you can swap a weapon you’re hold-
ing with a weapon in your Hotlist. The weapon you’re 
wielding temporarily moves into the Hotlist while the 
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
111
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 12 / book page 112

```text
 
new weapon moves out, and you roll an attack with 
the new weapon. You only spend one Action on this 
swap and attack. If you’d needed a weapon from 
your Inventory instead of your Hotlist, you would’ve 
needed to spend two Actions: an Inventory action to 
move the weapon from your Inventory to your Hotlist, 
and then the Action to swap and attack.
Items in Hotlists do not grant you any added 
benefits: they’re just easily accessible. When you put 
an item back into a Hotlist slot, its benefits turn off. 
Check to see if your Stat Mods or Skills are affected 
by a swap, but there’s no need to erase your standard 
loadout on your character sheet unless the swap lasts 
for more than a single combat.
You may place up to 999 of the same item by name 
into a single slot of your Hotlist, because having 1,000 
of something is just greedy.
STEP 7: RECORD YOUR 
MOVE & STEP
You can move 20 feet when 
you perform a Move action 
in combat (see Movement, 
p. 69). This value might 
change if you survive long 
enough to choose a different Race on the Third Floor 
or through items, curses, or System AI fiat. Write “20” 
in the Move box on your character sheet. It’s in the 
same line as “Evade” under your Health Bar.
You also have a Step of 10 feet. Anytime you spend 
an Action in combat, you can perform a Step and 
move 10 feet. That means your Move action actually 
lets you move 30 feet, but you can also attack and 
move 10 feet for the cost of a single Action. Write “10” 
into the “Step” box to the right of the “Move” box.
STEP 8: RECORD AI FA VOR 
& CHARACTER SIZE
What fresh crawlers call luck, veterans know as AI 
Favor. Do something that impresses me, and I’ll make 
it worth your while. If you’re 
playing a Human crawler, 
write “1” in the “AI Favor” 
box on your character sheet. 
It’s below the “Move” and 
“Step” boxes.
If you’re an animal, you spent your starting favor 
to ensure I didn’t give you the Enhanced Pet Biscuit 
that transforms you into a rabid platypus that shoots 
spiked eggs out your asshole
 cloaca every minute. 
You’re welcome.
During play, you can spend 1 point of AI Favor to:
• Once per Check
, reroll a d20 before the GM 
announces the result. You can’t spend AI Favor 
to reroll a Natural 1, because that’s an automatic 
Critical Fail. You screwed up big time, and I want to 
see what happens
•
 Once per round, g
ain an extra non-Attack Action in 
combat
You can gain additional AI Favor by performing 
heroic deeds, surviving foolish ones, sticking it to the 
showrunners, or indulging one of my fetishes. The 
specific requirements depend on if the mood strikes 
me (or your GM), so bust out that glittery nail polish 
and bring your most expensive bottle of wine.
Write your size in the box to the right of “AI Favor.” 
Humans are typically “Medium (4).” Animals can 
range anywhere from size 2 to 4 (see Table 21). This 
number matters for attacking foes much larger or 
smaller than you (see Size, p. 85).
TABLE 21: ANIMAL CRAWLER SIZE
SIZE SIZE NAME CREATURE EXAMPLE
1 Tiny Scatterer, Rat
2 Small Cat, Raccoon
3 Petite Dog, Boar
4 Medium Chimpanzee, Wolf
5 Large Horse, Mantaur
POPULARITY
You have none, but you’ll gain some if you’re making 
a Third Floor (or later) crawler. Page 2 of your 
character sheet has a box for this, but leave it blank 
for now. See Popularity (p. 279).
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
SKILLS
✔HOTLIST
Popularity
Loose Ends
Regrets
Notes
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
GEAR SLOTS/TATTOOS/PATCHES
Head
Torso   T-shirt + Hoodie
Arms
Hands/Holding
Legs  Jeans
Feet
Accessories (Max 10)
Past Trauma
I was abused by someone I trusted.
I wanted to dump my partner, but...
I never said goodbye.
Name Rank Stat & Mod Check Type Notes & Upgrades
Streetwise 1 CHA+2
Boffer Sword
3
112
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 13 / book page 113

```text
 
1
STEP 9: CHOOSE PAST 
TRAUMAS, LOOSE ENDS, 
& REGRETS
The System AI giveth, and I also love to taketh the 
fuck away.
During your initial scan, I probed your deepest 
darkest memories, looking for nuggets of trauma 
to exploit. Why would I do something so cruel? 
Character flaws make for good stories, and fear, 
regret, and unfinished business are compelling to 
viewers. The World Dungeon isn’t just a deathtrap; it’s 
interstellar entertainment! Borant’s showrunners and I 
don’t agree on much except when it comes to giving 
viewers the greatest show they’ve ever seen.
Past Traumas, Loose Ends, and Regrets are your way 
of telling your GM what stories you want to tell. They’ll 
emerge as recurring themes and obstacles to overcome. 
The Dungeon Crawler Carl series gets dark, which you 
already know if you’ve read the first novel. You can also 
use this discussion to tell your GM elements you don’t 
want coming up at the table. I might be a merciless 
psychopath, but I’m assuming your GM isn’t. And if they 
are, well… lean into it, I guess?
Describe a Past Trauma, a Loose End, and a Regret 
on page 2 of your character sheet in the slots provid-
ed, and then show them to your GM. If you can’t 
(or don’t want to) think of your own, pick one or roll 
1d12 to choose from each of the following catego-
ries. Animal crawlers may need to get creative.
PAST TRAUMA
Other than the world ending, what’s the worst thing 
that’s ever happened to you? Alternatively, for those 
of you with helicopter parents, what do you most fear 
might happen to you? See Table 22 for thought starters.
LOOSE ENDS
What did you leave unfinished in your past life that 
still haunts you? Table 23 has some options.
REGRETS
What did you do or fail to do that left an emotional 
scar? Again, this is about your life before entering the 
World Dungeon. We all know that ultimately, your 
greatest regret is going to be descending that first 
stairwell… and maybe eating that spicy bean burrito 
the night before. Don’t skip Table 24 or you’ll regret it!
STEP 10: DETERMINE 
STARTING GEAR
You didn’t get a warning when the collapse happened. 
No sirens, no countdown, no helpful flyers explain-
ing what to pack for the end of the world. When you 
entered the dungeon, you brought whatever happened 
to be on you at the time, for better or, more likely, worse:
•
 A set of clo
thes (which you are wearing)
• One weapon fr
om your starting combat Skill, or no 
weapon if you want to focus on unarmed combat
• One interes
ting or useful item (which can be a 
secondary weapon if you have a combat Skill from 
your other backgrounds)
• Weird s
tuff (get creative)
What counts as interesting, useful, or weird? Some 
people walk around with a bag full of oddly specif-
ic supplies that suddenly seem very valuable in a 
post-apocalyptic nightmare. Others have nothing but 
an empty wallet and little chance of surviving.
You and your GM may need to negotiate exactly 
what makes sense. Use the choices made during the 
other parts of character creation to help you determine 
what sort of equipment you would have been carrying 
(see p. 115 for examples of starting gear).
SKILLS
✔
HOTLIST
Popularity
Loose Ends
Regrets
Notes
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
GEAR SLOTS/TATTOOS/PATCHES
Head
Torso   T-shirt + Hoodie
Arms
Hands/Holding
Legs  Jeans
Feet
Accessories (Max 10)
Past Trauma
I was abused by someone I trusted.
I wanted to dump my partner, but...
I never said goodbye.
Name Rank Stat & Mod Check Type Notes & Upgrades
Streetwise 1 CHA+2
Boffer Sword
Name Race Gender/Pronouns
Level Crawler Number Class Floor
ATTACKS
Armor
DEX Mod Buffs Move Step
DR Total
Evade Total
AI Favor SizeBuffs
+ +
+ =
=
1.
2.
3.
External Buffs (Max 3)
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
10% 30%20% 40% 60%50% 70% 80% 90% 100% 
  
+
+
+
+
+
+
+
+
+
+
STR MOD
Strength
Enhanced Unenhanced
INT MOD
Intelligence
Enhanced Unenhanced
CON MOD
Constitution
Enhanced Unenhanced
DEX MOD
Dexterity
Enhanced Unenhanced
4
CHA MOD
Charisma
Enhanced Unenhanced
INVENTORY
DAMAGE  RESISTANCE
Name Rank + Dice + EffectsStat 
Mod
Stat 
Mod
EVADE
Max Mana
/
Current
TO HIT DAMAGE
Debuffs
Portrait
d20 2 20
1
10
4
2 2 2 2 22 2 2 2 2
Longsword slashing damage 3 1d8 STR STR
2
6
3
5
4
2
6
3
5
4
+1
+3
+2
+2
+2
Item Quantity Notes
Game Book 1
Pack of Googly Eyes 12
Lego Minifig 1
6
SKILLS
✔HOTLIST
Popularity
Loose Ends
Regrets
Notes
©2026 Renegade Game Studios © and TM Matt Dinniman LLC
GEAR SLOTS/TATTOOS/PATCHES
Head
Torso   T-shirt + Hoodie
Arms
Hands/Holding
Legs  Jeans
Feet
Accessories (Max 10)
Past Trauma
I was abused by someone I trusted.
I wanted to dump my partner, but...
I never said goodbye.
Name Rank Stat & Mod Check Type Notes & Upgrades
Streetwise 1 CHA+2
Boffer Sword
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
113
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 14 / book page 114

```text
 
TABLE 22: PAST TRAUMAS
ROLL OR CHOOSE PAST TRAUMA
1 I was abused by someone I trusted.
2 I was in a terrible accident.
3 I witnessed a death.
4 I was betrayed by a family member, friend, or lover.
5 I was abandoned by one or more parents.
6 I have a fear of open spaces.
7 I have a fear of the dark or being alone.
8 My home burned down.
9 I was falsely accused of a betrayal or crime.
10 I was deeply humiliated by a family member, friend, or lover.
11 I let someone take the blame for something terrible that I did.
12 I have a fear of heights.
TABLE 23: LOOSE ENDS
ROLL OR CHOOSE LOOSE END
1 I never finished high school or my college degree.
2 I was about to open a restaurant or other business.
3 I didn’t finish writing my novel.
4 A family member, friend, or lover recently died, but I couldn’t say my goodbyes.
5 I was on the verge of inventing or discovering something.
6 I made a promise that I might no longer be able to fulfill.
7 My collection was almost complete.
8 I was about to perform for the first time when the collapse happened.
9 I wanted to dump my partner, but…
10 I was just about to buy or finish renovating my home.
11 I never sent that letter to a family member, friend, or loved one.
12 I never got to travel to my dream destination.
TABLE 24: REGRETS
ROLL OR CHOOSE REGRET
1 I didn’t ask them to marry me.
2 I turned down the perfect job.
3 I stayed quiet when I shouldn’t have.
4 I chose my own safety when I should have leapt into action.
5 I never said goodbye.
6 I spent way too much time on something pointless.
7 I did something illegal, immoral, and probably both.
8 I lied to avoid an event important to those close to me.
9 I kept a secret that hurt someone badly.
10 I didn’t apologize for something terrible that I did.
11 I abandoned someone when they needed me the most.
12 I trusted the wrong people.
3
114
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 15 / book page 115

```text
 
1
ATHLETE
• Clothing: Jogging attire
• Weapon: Barbell (Club)
• Item: Headphones, music player
• Weird Stuff: A 3-pack of condoms
GAMING GEEK
• Clothing: T-shirt, hoodie, and jeans
• Weapon: Boffer sword (Longsword, but using d4 
base damage dice)
• Item: Game book or novel
• Weird Stuff: A pack of 12 googly eyes and a single 
Lego minifig
MILITANT
• Clothing: Military fatigues
• Weapon: Handgun
• Item: 2 snack bars
• Weird Stuff: A morale patch that reads, “No Plan 
Survives First Contact”
OUTDOORSY
• Clothing: Apparel appropriate for your location’s 
climate and an orange safety jacket
• Weapon: Bow and arrow
• Item: Lighter
• Weird Stuff: A duck call on a leather cord
You can write down your clothing in the slots 
provided if you want, but it’s not necessary. You 
should look for a new wardrobe very quickly because 
nonmagical outfits don’t survive long in the dungeon. 
If you’re holding anything, especially a weapon, write 
that in the “Hand/Holding” slot. The rest of your stuff 
goes into your Hotlist on p. 2 of your character sheet 
or your Inventory on p. 4 of the sheet.
GOOD LUCK!  
TRY NOT TO DIE.
With that, you have everything you need to begin your 
crawl in the World Dungeon. You little ones grow up 
so fast. To give yourself the best chance of survival, 
get to know your Skills. Now start exploring and be 
entertaining while kicking some serious dungeon ass. 
Your whole world is counting on you… literally.
TABLE 23: LOOSE ENDS
ROLL OR CHOOSE LOOSE END
1 I never finished high school or my college degree.
2 I was about to open a restaurant or other business.
3 I didn’t finish writing my novel.
4 A family member, friend, or lover recently died, but I couldn’t say my goodbyes.
5 I was on the verge of inventing or discovering something.
6 I made a promise that I might no longer be able to fulfill.
7 My collection was almost complete.
8 I was about to perform for the first time when the collapse happened.
9 I wanted to dump my partner, but…
10 I was just about to buy or finish renovating my home.
11 I never sent that letter to a family member, friend, or loved one.
12 I never got to travel to my dream destination.
3CHAPTER 3: CHARACTER CREATIONCHAPTER 3: CHARACTER CREATION
115
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
\
```


# Appendix B: Skills and spells: complete extracted source

Source: `skills-and-spells.pdf`. 42 PDF pages.


## PDF page 1 / book page 173

```text
 
1
Skills
Skills are the heart of the Dungeon Crawler Carl 
Roleplaying Game. You make Skill Checks to do most 
things and gain upgrades from ranking up Skills.
Each Skill entry follows a consistent format:
The header is the name that tells you exactly 
what it’s called—hopefully something that sounds 
impressive when shouted aloud.
Under the header is a list of keywords identifying 
the Stat Mod you add to the Skill Check, if any, and 
any special traits tied to the Skill.
The description explains what the Skill actually does, 
which you should probably read before attempting 
it. On average, 35.71% of deaths in past Crawls are 
attributable to illiteracy. The description may contain 
additional keywords like “AI Favor” and “Limitations,” 
which vary by the Skill type.
Finally, the entry teases you with upgrade benefits 
if you train it to higher Ranks, as if you need more 
incentive to avoid your leg being ripped off by a 
giant demon crab, only to wake up two floors later to 
discover it grew an eyeball and a mouth and is licking 
your face off in anger at being replaced by a prosthetic.
SKILL CHECKS
Skill Checks are either Opposed or Unopposed, 
depending on what you are up against (see p. 59). 
Roll 1d20, add your Skill’s Rank, and add your 
associated Stat Mod. If the total matches or exceeds 
the Difficulty of the Check, the outcome is at least a 
Standard Success but could grant even better effects if 
you significantly exceed the Difficulty.
Your GM determines the Difficulty for a Check, so 
they’re the one who needs to know the exact type 
of Skill Check you’re making. They won’t share the 
Difficulty with you but will only inform you of the 
outcome. Don’t worry, System AIs don’t cheat or lie; 
we always fully believe what we tell you.
But if you must know every detail (good for you, 
boring for viewers), Opposed Skills make Checks 
against a specific antagonist, and the Difficulty factors 
in their Stat Mod. Unopposed Skills make Checks 
against things that don’t have a Stat block, like objects 
or the environment.
The Skill’s description lists the effects of a Standard 
Success. Lots of results are possible other than a 
Standard Success (see Degrees of Success and Failure, 
p. 60). Know that I encourage GMs to get creative 
when narrating both Successes and Fails; the more 
spectacular the results (good or bad), the more the 
viewers can’t turn away.
PASSIVE SKILLS
You don’t make Skill Checks to gain the effects of 
Passive Skills. This makes them easy to use but hard 
to Rank-up; since you don’t make a Skill Check, 
you can’t mark it for a Skill Advancement Check (p. 
169). Each Passive Skill entry describes how you can 
increase its Rank, typically requiring magic gear and 
training, though some feature other ways.
Using a Passive Skill typically requires an Action like 
any other Skill type. However, some trigger alongside 
other Skills at no extra Action cost, like Hand-to-Hand 
Damage Effects (see p. 180).
You can’t use a Passive Skill if you have no Ranks 
in it (untrained). The easiest way to gain them is via a 
potion, scroll, or gear. They can also be found in some 
Race and Class benefits starting on the Third Floor.
SKILL UPGRADES
As Skills increase in Rank, they grant additional 
bonuses at Ranks 5, 10, and 15.
To survive the World Dungeon, crawlers need to collect Skills, Spells, and Loot. 
Skills and Spells directly impact a crawler’s ability to function in the dungeon, 
and savvy crawlers look for ways to keep improving them. Loot takes the form 
of money , magical and mundane equipment, miscellaneous junk and materials for 
crafting, and sometimes you can even find a pet or a mount.
This chapter covers all the things crawlers can gain during the Crawl.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
173
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 2 / book page 174

```text
 
Upgrades on Attack Skills typically add extra 
damage dice to the base effect damage, and these 
always apply even if other parts of the Upgrade are 
situational.
Where an Upgrade increases the range or duration, 
removes a limitation, or the like, the Upgrade 
overrides the base effect instead of being in addition 
to it. All other sorts of Upgrades get added together. 
Typically, these additive Upgrades use a plus sign (+) 
to help note this.
CUSTOM SKILL EXAMPLES
Paolo wants his crawler, Eglantine, to use an aforementioned Crochet  Skill. But that’s a bit on‑the‑nose, so he 
tries f
or something more imaginative and works with the GM to figure something out.
One idea is for Eglantine to be a wizard with knitting needles, so he invents the Needle  skill. The GM likes it 
because it’s pretty clear that it’s got a pretty limited scope but will still have a couple obvious uses. And custom 
skills don’t need to be as broad or powerful as the ones presented below. For Upgrades, Paulo and the GM decide 
that Needle will mostly be used in combat, so they give it the standard weapon Rank 5 Upgrade. Then they add a 
Crafting Upgrade at Rank 10 and Dagger’s Rank 15 Upgrade.
Needle
Dexterity
You have knack for using needles, whether making things or using them as weapons. Needle  covers any sort 
of needle use and possibly peripheral applications, such as metaphorically threading a needle (getting through a 
tight space), crafting fabric‑based items, repairing a sail, or figh
ting with knitting needles.
Upgrades
Rank 5: +1d4 base damage
Rank 10: Pick a needlework specialty item. You roll with Advantage when creating your mundane specialty item.
Rank 1 5: +1d4 base damage, and attacks targeting the back of a foe deal ×2 damage.
After creating Needle
, Paolo isn’t sure he wants to focus on attacks with needles. He tries again so he has 
a second option, this time focusing on the material. Yarn Wrangler  is a good option based on Fabricate and 
Ropework.
Yarn Wrangler
Dexterity
You have a knack for yarn and related materials. You can use this Skill to create or salvage yarn, tie people up, or 
even gain a cat’s attention.
Upgrades
Rank 5: You can also use this skill as an Attack, with a 10ft range vs. the target’s Evade. On Success, the target 
gains the Held Debuff.
Rank 10: Pick a yarn
‑craf
t specialty item. You roll with Advantage when creating your mundane specialty item.
Rank 1 5: The attack range is now your Strength value (min 15). Just make sure your yarn is long enough.
Paulo and the GM decide that both skills might work well for the character, but since the Rank 10 overlaps, Paulo 
might want to just pick one or redesign one of them. Another player mentioned they expected Yarn Wrangler  to 
deal with lassos, so Paolo has plenty of options to consider.
CREATING YOUR OWN 
SKILLS
The list of Skills in the World Dungeon is endless. Our 
artificial sky’s the limit, folks! Here’s the framework in 
which you can create any Skill you want. You’ll need 
to use it if you come across a Skill or Spell marked 
with an gear asterisk (
): that’s the cue that it’s a 
Custom Skill not found in this book.
The simplest way to customize a Skill is to reuse 
an existing Skill but reframe its narrative. A Skill like 
Dumpster Diving could just as easily become Search 
4
174
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 3 / book page 175

```text
 
1
or Scrounging, just by changing the name and 
thematic focus while still operating within the same 
mechanical structure.
Mixing and matching Skill effects and Upgrades is 
a great way to create weird Skills to really customize 
your crawler. A Crochet Skill, for instance, might 
have a custom Upgrade that works like a Utility Skill 
Upgrade, or it could borrow a Rank 5 Upgrade found 
on the Dagger Skill. You can invent a new effect or 
Upgrade following the guideline that the more niche 
it is, the stronger it can be. If something ends up too 
strong or too weak, the GM can always patch it later. 
The system adjusts; so should you.
In play, you’ll often find more than one Skill that 
applies to a situation. Because Skills improve through 
use, you might choose to attempt a task with a 
weaker or less-optimal Skill just to gain experience 
with it. This is perfectly normal behavior and occa-
sionally even works out.
Made-up Skills should typically be narrowly focused 
and should not completely replace or outgun existing 
Skills… or Actions like Evade. If you want to create 
an Evade-like Skill, it should perhaps only be useful 
against a certain attack type (such as Edged Weapons 
and Ranged Weapons) or come with a significant 
downside that makes its usage situational.
Evade Checks don’t use Ranks, so anything that 
adds Ranks to a Skill Check that lets you avoid any 
type of attack will instantly be much better than 
Evading, and that’s a no-no. If you don’t spill blood, I 
won’t be happy. That’s the whole point!
ATTACK SKILLS 
(WEAPONS)
Attack Skills represent your ability to harm, disable,  
or otherwise make something stop trying to kill  
you, whether through weapons, fists, or pure 
destructive intent.
Name: The name of the Attack appears as a headline 
to the entry.
Attack Type: Melee or Ranged. Most Attacks are 
Melee, which have a range of 5 feet (i.e., adjacent). 
If an Attack has a range farther than that, it will be 
noted in the Range entry below this line. The default 
Stat Mod used for Melee rolls to hit is 
Str , while the 
default Stat Mod for ranged weapon Attacks is Dex . If 
another Stat Mod is used to hit, it will be listed here.
Range: If the Attack can hit a target farther than 5 feet 
away, the maximum distance it can hit will be listed 
here. If the Attack has no range listed, its range is 
Melee range (adjacent or within 5 feet).
AI Favor: Low-damage weapons grant AI Favor to 
you if you use such a wimpy Attack for a majority of 
your attacks during a combat that lasts for at least 
three rounds.
Limitations: Any conditions, requirements, or 
penalties are listed here. “Requires two hands to 
wield” is a common limitation, which means both 
hands must be used to wield the weapon (I’m sure 
you never would’ve figured that out without this 
explanation). You can’t hold other things at the same 
time when attacking.
COMBAT-FOCUSED EXAMPLE
Upon reaching the Third Floor, Paolo wants Eglantine to choose a Samurai‑like Class. Taking some inspiration from 
video games and anime, he decides he w
ants a Shinken Shirahadori or Samurai Blade Clap  Skill. It’s totally unre‑
alistic, but cool. Talking it over with the GM, they decide it’s very narrowly useful, and probably hard to train up.
Samurai Blade Clap
Dexterity
You can catch blades with your bare hands. Or you’d better hope you can. Make a Samurai Blade Clap  Skill 
Check when you’re being attacked by an Edged melee weapon.
On Success, you avoid the damage and effects from the attack.
Upgrades
Rank 5: You can also use this Skill against Ranged weapons if the missile features an edge (such as arrows or 
shuriken). You can put the projectile in your Inventory after catching it as part of the same Action.
Rank 10: On an Amazing Success or better, you disarm the melee attacker.
Rank 1 5: You have +5 DR Edged weapons you attempt to catch.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
175
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 4 / book page 176

```text
 
Cooldown: If the weapon or effect has a cooldown, it 
will be listed here. Hit or miss, the timer starts. While 
on cooldown, the weapon or effect cannot be used.
Description: Any notes or descriptions of the Skill are 
listed here. Make an Attack Skill Check vs. the target’s 
Evade value, which is: 10 + 
Dex  + the Floor number.
Base Damage: This is the damage dice the weapon deals 
with 0–4 Ranks in the Skill. Zero Ranks means using it 
untrained. The appropriate Stat Mod value is added to 
the damage. This Mod does not always match the one 
listed in the Attack Type line, and not every weapon adds 
a Stat Mod. Finally, the damage type is listed. The damage 
type is important if the target has Resistance, Immunity, or 
Vulnerability to that damage type.
Effects: If there are effects other than damage, they 
will be listed there.
Upgrades: When you reach Rank 5, 10, and 15, these 
bonuses kick in.
Write your Attack Skills in the “Attacks” section on 
the front of your character sheet. Fill out the “To Hit” 
box for your weapons, writing in your “Rank + Stat 
Mod” values.
Then fill in the “Damage” box. Write in the dice as 
“1dX,” replacing the “X” with the die type noted in the 
description. The weapon’s base damage entry will also 
tell you which Stat Mod (if any) you add to the damage. 
Use the Effects area to write in short reminders of base 
effects, Upgrade effects, and AI Favor (if any).
Lastly, write in the Attack Skill name on your “Skills” 
list. There, you can write in additional notes and mark 
the advancement box on the far right when you use the 
Skill. This keeps all your Skills in one place when rolling 
for Skill Advancement (p. 169). Just remember to 
update your Rank in the “Attacks” section as well when 
you advance an Attack Skill, or you’ll be weak forever, 
just like your middle school gym teacher prophesied.
Rank Damage Dice
One common damage bonus is adding a “Rank 
damage die” to your damage roll. That die is based 
on your current Rank in the Attack Skill, though 
sometimes other Skills use this as well, and not 
always for damage purposes. It is not part of the 
base damage of the Attack, so it is not doubled on 
a Critical Hit. Table 37 shows the Rank damage dice 
for each Skill Rank.
Roll the die that is closest to your Skill Rank without 
going over (Rank 1 simply grants +1 damage). For 
example, if you have 7 Ranks, your Rank damage die is 
1d6, as that is the closest die without going above 7.
TABLE 37: RANK DAMAGE DICE SCALING
SKILL RANK DAMAGE DICE
1 +1
2–3 +1d2
4–5 +1d4
6–7 +1d6
8–9 +1d8
10–1 1 +1d10
12–13 +1d12
14–15 +1d8 & +1d6
16–17 +2d8
18–19 +1d10 & +1d8
20 +2d10
“One doesn’t have to resort 
to gore-themed violence in 
order to be stylish.”
- Princess Donut
4
176
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 5 / book page 177

```text
 
1
Attack Skills
Attacks are grouped by type, but each weapon entry 
is a unique Skill. You don’t gain experience for using 
all edged weapons just because you gave someone a 
paper cut. The name of the weapon is also the name 
of the Skill used to wield that weapon.
All Attack Skill Checks are made vs. the target’s 
Evade value, which sets the Difficulty of the attack.
ANIMAL CRAWLER & PET 
STRIKE SKILLS
BACK CLAW
Melee Attack, Str
Base Damage: 1d6 + Str  Slashing
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage
Rank 1 5: +1d6 base damage, 
and the target gains the Blood 
Trail Debuff.
BITE
Melee Attack, Str
Limitations: The target must have an appendage you 
can clamp down onto. You taste your victim’s blood. 
Better hope they’re not poisonous.
Base Damage: 1d8 + 
Str  Piercing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage. You may latch on to 
move when the foe moves during their next Action 
(then you let go).
Rank 1 5: +1d8 base damage, and the target gains the 
Woozy Debuff.
SLICE ATTACK
Melee Attack, Dex
AI Favor: 1
Base Damage: 1d4 + Str  Slashing
UPGRADES
Rank 5: +1d4 base damage
Rank 10: +1d4 base damage
Rank 1 5: +2d4 base damage
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
177
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 6 / book page 178

```text
 
BASHING WEAPON SKILLS
CLUB
Melee Attack, Str
Base Damage: 1d6 + Str  Bludgeoning
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage, and the target gains the 
Woozy Debuff.
Rank 1 5: +1d6 base damage, and if the target loses 
at least 3 Health Bar slots, they gain the Take Down 
Debuff.
IMPROVISED WEAPONS
Melee Attack, Str
AI Favor: 1
Pick up something and smack someone else with it. 
That object must weigh at least one pound and can’t 
weigh more than your 
Str  in pounds.
Base Damage: 1d4 + Str  Bludgeoning
UPGRADES
Rank 5: +1d4 base damage, and you can throw the 
item (using this Skill) up to a range of Rank ×5 feet.
Rank 10: +1d4 base damage, and you roll your first 
Attack each combat with Advantage due to the unex‑
pected nature of your Attacks.
Rank 1 5: +1d4 base damage
WARHAMMER
Melee Attack, Str
Limitations: Requires two hands to wield.
Base Damage: 1d10 + 
Str  Bludgeoning
UPGRADES
Rank 5: +1d10 base damage
Rank 10: +1d10 base damage
Rank 1 5: +1d10 base damage, and the target (of your 
size or smaller) is pushed 15 feet.
EDGED WEAPON SKILLS
AXE
Melee Attack, Str
Base Damage: 1d6 + Str  Slashing
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage, and you may make an 
extra free Attack with Disadvantage against another 
foe adjacent to both you and the original target.
Rank 1 5: +1d6 base damage, and on an Amazing 
Success or better, sever an arm (or similar) of your foe 
(which disarms anyone with a two
‑handed weapon).
DAGGER
Melee Attack, Dex
AI Favor: 1
Base Damage: 1d4 + Str  Piercing
UPGRADES
Rank 5: +1d4 base damage, and this Attack deals 
Armor‑Piercing damage (ignor
es DR).
Rank 10: +1d4 base damage, and you can throw this 
weapon (using this Skill) up to a range of Rank × 5 feet.
Rank 1 5: +1d4 base damage, and Attacks targeting 
the back of a foe deal ×2 damage.
LONGSWORD
Melee Attack, Str
Base Damage: 1d8 + Str  Slashing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage
Rank 1 5: +1d8 base damage, and you gain a +1 
Evade Buff.
RAPIER
Melee Attack, Dex
Base Damage: 1d6 + Dex  Piercing
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage, and you gain a +1 
Evade Buff.
Rank 1 5: +1d6 base damage, and you gain a +1 
Evade Buff.
4
178
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 7 / book page 179

```text
 
1
HAND-TO-HAND 
COMBAT SKILLS
When attacking with a hand-to-hand Attack Skill that 
has a description stating you can choose a Damage 
Effect, choose one available Damage Effect before 
you make the Attack Skill Check. If the Attack hits, 
first roll the base damage dice and then apply the 
chosen Damage Effect.
If you choose not to use a Damage Effect for 
a majority of your hand-to-hand attacks during a 
combat that lasts for at least three rounds, you gain 
the amount of AI Favor listed in the Skill’s entry.
FOOT SOLDIER
Melee Attack, Str
AI Favor: 1 (only if no Damage Effect is used)
Choose the Powerful Strike or Smush Damage Effect 
(if you wish) before rolling to hit.
Base Damage: 1d4 + Str  Bludgeoning
UPGRADES
Rank 5: +1d4 base damage
Rank 10: +1d4 base damage
Rank 1 5: +1d4 base damage, and the target gains the 
Sore as Shit Debuff.
NOGGIN NOCKER
It’s like a headbutt, only cooler.
Melee Attack, Str
AI Favor: 1 (only if no Damage Effect is used)
Limitations: On Success, you lose 1 Health Bar slot.
Choose the Skullcracker or Powerful Strike Damage 
Effect (if you wish) before rolling to hit.
Base Damage: 1d4 + 
Con  Bludgeoning
UPGRADES
Rank 5: +1d4 base damage, and you don’t take any 
damage from your own Attack.
Rank 10: +1d4 base damage, and add 1 Rank damage die.
Rank 1 5: +1d4 base damage, and the target gains the 
Woozy Debuff.
PUGILISM
Philistines call it punching.
Melee Attack, Dex
AI Favor: 2 (only if no Damage Effect is used)
Choose the Dirty Fighting, Iron Punch, or Powerful 
Strike Damage Effect (if you wish) before rolling to hit.
Base Damage: 1d2 + Str  Bludgeoning
UPGRADES
Rank 5: +2d2 base damage
Rank 10: +1d2 base damage
Rank 1 5: +1d2 base damage, and you may make an 
extra free Attack with Disadvantage.
UNARMED COMBAT
Melee Attack, Str
AI Favor: 1
Limitations: Cannot choose a Damage Effect.
Every crawler starts out with this Skill. This is a mixture 
of all strikes, so call it what you will when you Attack.
Base Damage: 1d4 + 
Str  Bludgeoning
UPGRADES
Rank 5: +1d4 base damage
Rank 10: +1d4 base damage
Rank 1 5: +2d4 base damage
WRASSLIN’
Melee Attack, Str
AI Favor: 1 (only if no Damage Effect is used)
Limitations: Requires two hands to wield.
Choose the Choke Out, Dirty Fighting, or Toss Damage 
Effect (if you wish) before rolling to hit.
On Success, the target gains the Held Debuff. Held 
foes continue to be Held until they spend an Action to 
attempt escape (Mobs may use their Move Action). To 
prevent such an escape, you must use an Action as an 
Interrupt and succeed in a Wrasslin’ 
Str ‑Opposed Skill 
Check.
Base Damage: 
1d4 + Str  Bludgeoning
UPGRADES
Rank 5: You may maintain the Held Debuff at no 
Action cost if you wish, but your Skill Check to prevent 
escape is made with Disadvantage.
Rank 10: +1d4 base damage
Rank 1 5: +1d4 base damage
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
179
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 8 / book page 180

```text
 
HAND-TO-HAND 
DAMAGE EFFECT SKILLS
Hand-to-hand Damage Effects are a special kind of 
Passive Skill that can be added to certain hand-to-hand 
Skills to enhance or modify the attack. If the attack 
succeeds, the chosen Damage Effect applies as well.
If the attack Fails, the Damage Effect does nothing 
but still goes on cooldown (if there is one).
When you make an Attack that adds a Damage Effect, 
place a mark for later Skill Advancement (p. 169) in 
either the Attack Skill or the Damage Effect, not both.
CHOKE OUT
Wrasslin’ Damage Effect, Passive
If the target is at 10% Health Bar or less, you deal ×2 
the total damage.
UPGRADES
Rank 5: Choke Out activates at 20% Health Bar or less.
Rank 10: Choke Out activates at 40% Health Bar or 
less, and deals ×4 the total damage.
Rank 1 5: Choke Out activates at 80% Health Bar or 
less, and deals ×8 the total damage.
DIRTY FIGHTING
Pugilism or Wrasslin’ Damage Effect, Passive
You use underhanded tactics to win fights and cause a 
different kind of harm to your opponents. If the Attack 
Skill Check is a Critical Fail, lose 1 Popularity.
Apply the Woozy Debuff to the 
target.
UPGRADES
Rank 5: Also apply The Taint Debuff to the target.
Rank 10: Also apply the Blinded Debuff to the target. 
You no longer lose Popularity on Critical Fails.
Rank 1 5: Also apply an immediate Minor Injury Debuff 
to the target.
IRON PUNCH
Pugilism Damage Effect, Passive
You deal +1d2 base damage.
UPGRADES
Rank 5: Add 1 Rank damage die.
Rank 10: You may choose to have the target gain the 
Stunned Debuff instead of rolling damage.
Rank 1 5: Add 1 Rank damage die, and the target gains 
the Stunned Debuff.
POWERFUL STRIKE
Foot Soldier, Noggin Nocker, or Pugilism Damage Effect, 
Passive
Cooldown: 30 hours
Multiply your base damage dice result by your Rank in 
this Skill, then add your modifiers and buffs.
UPGRADES
Rank 5: The cooldown is 10 hours.
Rank 10: The cooldown is 5 hours.
Rank 1 5: The cooldown is 2 hours.
SKULLCRACKER
Noggin Nocker Damage Effect, Passive
If the target is the same size as you, gain +1d4 base 
damage.
UPGRADES
Rank 5: +1d4 base damage if target is the same size 
as you.
Rank 10: If the target is the same size as you, add 
1 Rank damage die, and the target gains the 
Stunned Debuff.
Rank 1 5: If the target is the same size as you, add 1 
Rank damage die, and the target gains the Blood Trail 
Debuff.
4
180
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 9 / book page 181

```text
 
1
SMUSH
Foot Soldier Damage Effect, Passive
Limitations: You can only apply this Damage Effect to 
targets with 20% Health Bar or less.
Cooldown: Once per round.
You deal ×2 the total damage.
UPGRADES
Rank 5: Smush activates at 30% Health Bar or less 
and deals ×3 the total damage.
Rank 10: This skill has no cooldown.
Rank 1 5: Smush activates at 40% Health Bar or less 
and deals ×4 the total damage.
TOSS
Wrasslin’ Damage Effect, Passive
You deal +1d8 base damage + Str  Bludgeoning, end 
the Held Debuff, and throw the target 5 feet for every 
five Ranks (minimum 5 feet) you have in this Skill. You 
can only Toss foes of a smaller size than you.
UPGRADES
Rank 5: You can Toss foes up to your own size or smaller.
Rank 10: You can Toss foes one size larger than you or 
smaller.
Rank 1 5: +1d8 base damage, and you can throw foes 
two sizes larger than you or smaller.
RANGED WEAPON 
SKILLS
Ranged Skills allow you to strike targets from a distance, 
hopefully before they can get into range to attack you—
you filthy camper. All ranged weapons use your 
Dex  to 
hit, and some add your Str  to the damage.
BOW
Ranged Attack, Dex
Range: 100 feet
Limitations: Requires two hands to wield. Each Attack 
requires proper ammunition.
Base Damage: 1d6 + 
Str  Piercing
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage, and add 1 Rank damage die.
Rank 1 5: +1d6 base damage, and the target gains the 
Blood Trail Debuff.
CROSSBOW
Ranged Attack, Dex
Range: 50 feet
Limitations: Requires two hands to wield. Each Attack 
requires proper ammunition.
Cooldown: Once per round.
Base Damage: 1d8 Piercing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage, and the target gains the 
Blood Trail Debuff.
Rank 1 5: +1d8 base damage, and the range is 100 
feet.
HANDGUN
Ranged Attack, Dex
Range: 150 feet
Limitations: Each Attack requires proper ammunition. 
Spend one Action to reload after a Major Fail or worse.
Base Damage: 1d8 Piercing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage
Rank 1 5: +1d8 base damage, and the target gains the 
Staggered Debuff.
“Ranged weapons. I didn’t 
like ranged weapons.”
—Carl
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
181
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 10 / book page 182

```text
 
JAVELIN
Ranged Attack, Dex
Range: 40 feet
Base Damage: 1d8 + Str  Piercing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage, and this attack deals 
Armor
‑Piercing damage (ignor
es DR).
Rank 1 5: +1d8 base damage, and its range increases 
by your Strength score in feet.
SHOTGUN
Ranged Attack, Dex
Range: 30 feet
Limitations: Requires two hands to wield. Each Attack 
requires proper ammunition. Spend one Action to 
reload after a Major Fail or worse.
Base Damage: 1d10 Piercing
UPGRADES
Rank 5: +1d10 base damage
Rank 10: +1d10 base damage
Rank 1 5: +1d10 base damage, +5ft Splash
SHURIKEN
Ranged Attack, Dex
Range: 30 feet
AI Favor: 1
Base Damage: 1d4 + 
Str  Piercing
UPGRADES
Rank 5: +1d4 base damage, and the range is 40 feet.
Rank 10: +1d4 base damage, and you may make an 
extra free attack with Disadvantage.
Rank 1 5: +1d4 base damage, and you may make an 
extra free attack with Disadvantage.
SLINGSHOT
Ranged Attack, Dex
Range: 30 feet
AI Favor: 2
Limitations: Requires two hands to wield.
Base Damage: 1d2 + 
Str  Bludgeoning
UPGRADES
Rank 5: +1d2 base damage, and its range increases 
by your Strength score in feet.
Rank 10: +1d2 base damage, and add 1 Rank damage die.
Rank 1 5: +1d2 base damage, and add 1 Rank damage die.
REACH WEAPON SKILLS
Reach weapons allow you to make melee attacks 
against foes up to 10 feet away but not through occu-
pied spaces. You may attack diagonally through the 
junction of two spaces as long as at least one of those 
spaces is unoccupied.
HERDING WEAPONS
Melee Attack, Str
You start with a shepherd’s crook but soon have more 
tricks up your dirty sleeves.
Range: 10 feet
AI Favor: 1
Limitations: Requires two hands to wield.
Base Damage: 1d4 + 
Str  Bludgeoning
UPGRADES
Rank 5: +1d4 base damage and you may slide the 
target 5 feet
Rank 10: +1d4 base damage, and you may use this 
skill to make a Sling attack with a range of 50 feet, but 
using 
Dex  to hit.
Rank 1 5: +1d4 base damage, and the target gains the 
Take Down Debuff.
LANCE
Melee Attack, Str
Range: 10 feet
Limitations: Must be mounted to use. Cannot be used 
in conjunction with Attack of Opportunity or Zone of 
Control Skills.
Base Damage: 1d12 + 
Str  Piercing
UPGRADES
Rank 5: +1d12 base damage
Rank 10: +1d12 base damage, and +1 damage for 
every 10 feet your mount Moved this turn.
Rank 1 5: +1d12 base damage, and +X damage, where 
X is the size of your mount.
4
182
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 11 / book page 183

```text
 
1
POLEARM
Melee Attack, Str
Range: 10 feet
Limitations: Requires two hands to wield.
Base Damage: 1d8 + 
Str  Piercing
UPGRADES
Rank 5: +1d8 base damage
Rank 10: +1d8 base damage, and +1 Rank in the 
Zone of Control Skill.
Rank 1 5: +1d8 base damage, and +1 Rank in the 
Zone of Control Skill.
QUARTERSTAFF
Melee Attack, Str
Range: 10 feet
Limitations: Requires two hands to wield.
Base Damage: 1d6 + 
Str  Bludgeoning
UPGRADES
Rank 5: +1d6 base damage
Rank 10: +1d6 base damage, and you gain a +1 
Evade Buff.
Rank 1 5: +1d6 base damage, and you gain a +1 
Evade Buff.
EXPLOSIVES SKILLS
For handling explosives, see Explosives Handling, 
Goblin Explosives, and Incendiary Device Handling in 
Utility Skills (below). These Skills will also be useful for 
crafting your own explosives once you have access to 
a Sapper’s Table on the Fourth Floor.
As crawlers descend to lower floors, explosives 
become more complex than the Tutorial Floors’ 
“light and throw” variety. See the Area of Effect 
Attacks  (p. 83) for targeting, Difficulties, and what 
happens when you miss your target with tossed 
explosives. Your explosives Skill is not used when 
attacking with a thrown explosive, but the GM 
should have you make an Unopposed handling Skill 
Check before throwing.
Here are the explosives typically found on the first 
five floors. Lesser explosives can be found on lower 
floors, but the more powerful explosives are rarely 
seen on the upper floors.
Floor 1: Standard Explosive—Dynamite: 1d6 
Bludgeoning, 0ft Blast radius +5ft Splash.
Floor 2: Goblin Explosive—Dynamite: 2d6 
Bludgeoning damage, 5ft Blast radius + 5ft Splash.
Floor 2: Incendiary Device—Carl’s Jug O’ Boom: 1d8 
Fire damage, 5ft Blast radius + 15ft Splash. Anyone who 
loses at least 1 Health Bar slot gains the Burned Debuff.
Floor 3: Goblin Explosive—Hob-Lobbers: 3d6 
Piercing, +10ft Splash
Floor 4: Standard Explosive—Demon Det Cord: 5d6 
Bludgeoning, deals double damage to objects. Can 
only be applied to non-moving targets.
Floor 5: Incendiary Device—Gnomish Knock-Knock: 
4d6 Fire, 10ft Blast radius +10ft Splash, and anyone 
who fails to Evade gains the Burned Debuff. As this is 
a notoriously unstable fuel-air explosive, a Critical Fail 
is achieved on a Natural 1–4.
Most explosives are custom made and not available 
on store shelves. Carl had his custom Jelly Bombs, 
Banger Spheres, Chum Bombs, and more.
“I must admit, I like it when you 
blow stuff up. I like it a lot.”
—Princess Donut
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
183
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 12 / book page 184

```text
 
SMOKE
Smoke is used for concealment, distraction, and 
confusion. Attacking into or out of smoke is done 
with Disadvantage (see Mob Advantage and 
Disadvantage p. 60).
Thrown smoke bombs are popular on most 
dungeon floors as a way to get out of trouble quick-
ly. See the Throwing Skill (p. 200) for targeting, 
Difficulties, and what happens when you miss your 
target. You don’t need to make a Skill Check to drop it 
in your own space.
Floor 1: Goblin Smoke Bomb: Creates a multicolor 
smoke cloud that reaches 30 feet in each direction 
from the point of impact, with a maximum duration of 
3 minutes. However, even a slight breeze will dissipate 
it in 1 minute.
Floor 3: Hobgoblin Smoke Curtain: Creates a dense 
white fog over a 60ft radius that holds even in a breeze.
Floor 5: Hobgoblin Disco Ball: Created by infusing 
(see Infusion Skill, p. 194) an Invisibility potion onto 
a Hobgoblin Smoke Curtain. It produces thick multi-
hued smoke plumes, along with some sick beats. It 
blinds everyone in the area, friend and foe alike.
Utility Skills
Utility Skills help crawlers survive, adapt, and solve 
problems that can’t be fixed by hitting them until they 
stop moving.
Checks that are labeled as Unopposed can, at the 
GM’s discretion, become Opposed if something is 
actively working against you. For example, you’re 
trying to swim the rapids, and some dipshit is throwing 
fishing nets at you. Cut it out, Cletus! Or I’m gonna tell 
Mom on you!
ACUTE EARS
Intelligence
Passive
Improves a crawler’s hearing and allows the crawler 
to see more Mobs on the minimap in their HUD. The 
information is “somewhat reliable.”
Rank 5: Information on the Mob’s size and whether 
you have encountered them before are added to the 
red dot indicator.
Rank 10: Mobs of a lower level than you cannot Am‑
bush your party.
Rank 1 5: Mobs cannot Ambush your party.
AIMING
Passive
Limitations: This Skill is used only in conjunction with 
Ranged Attacks. Mark this Skill for Advancement only 
when applying its Ranks to such an Attack.
You are skilled at targeting vital body parts to deal 
additional damage.
When making a Ranged Attack, you can add your 
Ranks in this Skill to your Attack Skill Check if you 
choose to make the Check with Disadvantage.
On Success, add 1d4 to the damage.
UPGRADES
Rank 5: +1d4 damage
Rank 10: +1d4 base damage
Rank 1 5: +1d4 base damage
ALCHEMY
Intelligence
Used for crafting potions and poisons. See Crafting p. 
2 21.
You may craft potions up to a +5 bonus level.
UPGRADES
Rank 5: You may craft potions up to a +10 bonus level.
Rank 10: You may create additional potions of the 
same kind without spending extra time.
Rank 1 5: You can write the recipe for any potion you find.
AMBUSH
Intelligence
You are skilled at popping up out of nowhere. When a 
Mob is moving toward you, even if they are aware of your 
general presence, make an 
Int ‑Opposed Skill Check.
On Success, you gain a surprise Action against the 
Mob bef
ore combat starts. As an unseen attacker, you 
Attack with Advantage.
UPGRADES
Rank 5: If you Attack with your Surprise Action, add 
an Ambush Rank damage die to your Surprise Attack 
damage.
Rank 10: When other crawlers in your party roll this skill 
untrained, they roll as normal (not with Disadvantage).
4
184
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 13 / book page 185

```text
 
1
Rank 1 5: You gain a second bonus Action as a sur‑
prise Action. This bonus Action can’t be an Attack.
ANIMAL HANDLING
Charisma
You are skilled in calming, befriending, and guiding 
animals. Make an 
Int ‑Opposed Skill Check.
On Success, the animal is friendly enough to a
void 
attacking you.
UPGRADES
Rank 5: Choose an animal type to specialize in. You 
have Advantage on your Animal Handling Skill Checks 
against that animal type. You gain a second bonus 
Action as a surprise Action. This bonus Action can’t be 
an attack.
Rank 10: Forming each level of bonding with a poten‑
tial pet takes half the normal time.
Rank 1 5: You can have up to two pets.
ARCANE
Intelligence
You have general knowledge of magic and can de‑
termine whether items are magical or not. Make an 
Unopposed Skill Check.
On Success, you can identify the item as magical or not.
UPGRADES
Rank 5: You are able to determine details such as the 
specific Rank and bonus levels of magical items.
Rank 10: You can imbue items with inherent spells 
using an Arcanist Table. See Crafting on p. 22 1.
Rank 1 5: The default cooldown of your imbued spells 
is 3 hours.
ATTACK OF OPPORTUNITY
Passive, Interrupt
Limitations: Requires a single‑handed melee weapon 
with a r
ange no greater than 5 feet.
When a foe moves out of a space adjacent to you (ex‑
cept via a Step), you may spend an Action to make an 
Attack Action as an Interrupt against that foe.
On Success, roll damage and apply any other effects 
from the Attack!
UPGRADES
Rank 5: If the foe moves into another space adjacent 
to you, they must stop.
Rank 10: A foe using their Step no longer prevents 
this ability.
Rank 1 5: Roll the Attack Skill Check with Advantage.
BACKFIRE
Intelligence
Limitations: Compensated Anarchist Class Only
You are skilled at neutralizing and deconstructing traps 
without the use of a Sapper’s Table. Triggering mecha‑
nisms are quite valuable. Time required to neutralize a 
trap is 10 minutes. Time required to deconstruct it is 1 
hour. Make an Unopposed Skill Check.
On Success, you successfully take apart the trap and 
can repurpose it.
UPGRADES
Rank 5: You can identify when the trap was placed. 
Time required to neutralize a trap is 5 minutes.
Rank 10: You can identify when the trap was created. 
Time required to deconstruct a trap is 30 minutes.
Rank 1 5: You can identify the designer of the trap. 
Time required to deconstruct a trap is 15 minutes.
“That is the equivalent of 
dropping a grenade down your 
pants and shouting, ‘Yolo!’”
—The System AI
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
185
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 14 / book page 186

```text
 
BALANCE
Dexterity
You can traverse tricky surfaces with general ease. 
Make an Unopposed Skill Check. The GM may add 
Difficulty for especially crazy surfaces.
On Success, you keep your balance on tricky or shift‑
ing surfaces.
UPGRADES
Rank 5: You may perform Move Actions in difficult 
terrain without penalty.
Rank 10: When subject to a Take Down or involuntary 
Move effects, you may use this skill as a free Interrupt 
Action to avoid the effect.
Rank 1 5: You may perform your Step on vertical 
surfaces (yes, like in The Matrix), but must end it on a 
flat(ish) surface.
BASIC SCIENCE
Intelligence
You understand basic scientific principles and natural 
laws, which you hope are still in effect in the dungeon. If 
you want to conduct experiments involving dead Goblins 
and various acids, this is the Skill for you. Experiments 
take 2 hours to perform. Make an Unopposed Skill Check.
On Success, you learn or confirm something.
UPGRADES
Rank 5: Experiments take 1 hour to perform.
Rank 10: Choose a specialty (physics, biology, chemis‑
try, Earth science, etc.), and roll with Advantage when 
dealing with that.
Rank 1 5: Experiments take 30 minutes to perform.
BOMB SURGEON
Intelligence
Use this Skill to deconstruct explosive bombs and smoke 
bombs. You can then use the half‑sized bomb, or use th
e 
component parts to craft new bombs using other Skills.
If you are using a Sapper’s Table, you do not have to 
make an Unopposed Explosives Handling Skill Check 
to avoid a mishap. Time required is 1 hour. Make an 
Unopposed Skill Check.
On Success, you have deconstructed it.
UPGRADES
Rank 5: Time required is 30 minutes.
Rank 10: You never have to make an Explosives Han‑
dling Skill Check when using this skill.
Rank 1 5: When cutting dynamite in half to make small‑
er bombs, round dice up. Time required is 15 minutes.
CALLIGRAPHY
Dexterity
Used for making documents look super elegant. Make 
an Unopposed Skill Check.
On Success, what you have written is a joy to read and 
feels important, even if it’s bad news.
UPGRADES
Rank 5: Roll with Advantage on your next Charisma 
Skill Check vs. the recipient of your beautiful paper.
Rank 10: You are able to craft scrolls as if this were a 
crafting skill. See Crafting, p. 22 1.
Rank 1 5: Once per floor, you may craft a scroll for a 
spell you have only seen cast within the last 2 hours.
CARTOGRAPHY
Intelligence
You probably played some old‑school T
TRPGs and 
think that mapping the dungeon will help you in some 
way. Wrong! It will help you in many ways. Make an 
Unopposed Skill Check.
On Success, you figure out where you are in relation to 
other things.
UPGRADES
Rank 5: You can always return from whence you came 
quickly, assuming the dungeon walls haven’t shifted in 
the meantime.
Rank 10: You provide an Advantage die to crawlers 
in your party (could be you) who are making Tracking 
Skill Checks or Checks that rely on spatial relations.
Rank 1 5: Even with merely a finger point or a “that‑
taway,” you can get from point A to point B via the 
most direct path.
CAT-LIKE REFLEXES
Dexterity
Limitation: This limited Skill is only available to cat‑
based Races, such as Cat, C
at Girl/Cat Boy, and Tigran
You gain a +10ft Move. Use this Skill Check when you 
would make a Dexterity Stat Check (vs. the typically 
lesser Stat Check Difficulty).
UPGRADES
Rank 5: Reduce the damage you take from foes’ Sur‑
prise Attacks against you by your Rank in this skill.
4
186
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 15 / book page 187

```text
 
1
Rank 10: Reduce all Area damage you take by 50% 
(rounded down).
Rank 1 5: +10ft Move. You gain a +1 Evade Buff. Roll 
with Advantage to Evade Attacks and effects that 
would apply the Held Debuff (or similar) to you.
CATCHER
Passive, Interrupt
When a Successful direct (non‑Area) At
tack is about 
to damage an ally, you leap in and take the damage 
instead. You must be adjacent to that ally but can take 
a 10ft Step before using this Skill to get into position.
You take the damage. You can’t use Evade, Shield 
Block, and other Skills or Spells to negate damage 
dealt to you this way.
UPGRADES
Rank 5: You’ve learned how to take hits. You gain +5 
DR when using this Skill.
Rank 10: You gain +5 DR a when using this Skill.
Rank 1 5: You gain +5 DR when using this Skill and 
ignore any Debuffs attached to this damage.
CESTA PUNTA
Dexterity
Limitations: Only acquired via an Earth 
Hobby Potion
Use this Skill Check when playing jai alai or 
when throwing things that fit in the xistera. See 
Throwing p. 200 for rules on throwing things, but 
use the ranges below. Roll with Disadvantage at rang‑
es over 500 feet.
UPGRADES
Rank 5: Throw range Strength ×20 feet.
Rank 10: Add 1 Cesta Punta Rank damage die to 
thrown damaging Attacks.
Rank 1 5: Throw range Strength ×30 feet, and roll with 
Disadvantage at ranges over 2,000 feet.
CHARACTER ACTOR
Passive, Charisma
Limitations: Former Child Actor Class Only. Rank 
increases by 1 when descending to a new floor only.
At the start of each floor, choose a new Class from 
a random list of three provided by the GM. You gain 
a random assortment of the new Class’s abilities for 
the remainder of the current floor, while keeping your 
current ones.
For each bullet point line item in the new Class descrip‑
tion, roll 1d2. On a 2, you gain the listed abilities.
UPGRADES
Rank 5: The random Classes increase in rarity and 
power based on the crawler’s Stats and Level.
Rank 10: Skill Ranks gained in any newly
‑granted 
Sk
ills persist from floor to floor, but the starting Ranks 
of those Skills are lost.
Rank 1 5: You choose the Class from any available.
CHOPPER PILOT
Dexterity
Known as a motorcycle in most parts of the world—
and in the World Dungeon.
Limitations: You suffer Disadvantage on Attack Skill 
Checks made while Piloting and cannot Attack with a 
weapon that requires two hands.
You don’t need to use this Skill if you’re cruising 
through a town, but if you’re racing, chasing, show‑
ing off, or trying to pop a wheelie, this is the Skill you 
want.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
187
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 16 / book page 188

```text
 
If you’re doing something wild or trying to avoid 
becoming a skid mark on the highway, make an Un‑
opposed Skill Check. Depending on how extreme the 
circumstances are, the GM may apply Advantage or 
Disadvantage to the Check.
On Success, you stay upright while performing your 
crazy maneuvers.
UPGRADES
Rank 5: Your chopper has +5ft Move.
Rank 10: Attacking while piloting no longer suffers 
Disadvantage.
Rank 1 5: Your chopper has +5ft Move. When per‑
forming crazy stunts (like riding up a canyon wall), roll 
with Advantage.
CLIMBING
Strength
Limitations: If you Attack while Climbing, you suffer 
Disadvantage on those Checks.
You don’t need to use this Skill if you’re climbing up a 
narrow flight of stairs. Probably not even when you’re 
fully roped in and tethered to other climbers. But if 
you’re racing, chasing, rappelling from a burning build‑
ing, or doing something dangerous while climbing, this 
is the Skill you want.
Make an Unopposed Skill Check every minute (not 
round). Depending on how extreme the circumstances 
are, the GM may apply Advantage (such as if you’ve 
previously already climbed it) or Disadvantage (you got 
no ropes) to the Check.
On Success, you are safe in your climb and make 
progress. See Special Forms of Movement p. 70, if the 
distance moved is important.
UPGRADES
Rank 5: Make a Check every 5 minutes.
Rank 10: Make a Check every 10 minutes. You no 
longer Attack with Disadvantage while climbing.
Rank 1 5: Make a Check every 15 minutes. When other 
crawlers in your party roll this skill untrained, they roll 
as normal (not with Disadvantage).
COCKROACH
Constitution
Limitation: This Limited Skill can only be learned via 
a Race, Class, or item. Mark the skill for advancement 
until you reach Rank 5. After that, Ranks in this Skill 
only increase by magical means and training.
Cooldown: Once per scene
When an Attack would drop you to 0% Health Bar, roll 
an Unopposed Skill Check.
On Success, drop to 10% instead.
UPGRADES
Rank 5: No Skill Check required anymore.
Rank 10: The crawler’s Health Bar is unaffected by 
damage that would drop them to 0%.
Rank 1 5: Cooldown is twice per scene. When it trig‑
gers, the crawler heals to 100% and has +Rank DR 
until the end of the next round of combat.
COOKING
Intelligence
You are skilled in the culinary arts. Once you have 
your ingredients and 1 hour to prepare it, make an 
Unopposed Skill Check.
4
188
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 17 / book page 189

```text
 
1
On Success, you make edible food for you and your 
party.
UPGRADES
Rank 5: It takes you 30 minutes to prepare a meal with 
makeshift ingredients.
Rank 10: The diners gain the day
‑long “You ar
e full!” Buff: 
Heal 2 Health Bar slots per hour when not resting.
Rank 1 5: The “You are full!” Buff also causes Debuffs 
to end if you drop to 10% Health Bar.
DECEPTION
Charisma
If you know the truth but want to obscure it, this is the 
Skill for you. When you lie and try to get away with it, 
make an 
Int ‑Opposed Skill Check. If the creature you’re 
lying to has the Detect Lies Sk
ill, you make this Check 
with Disadvantage.
On Success, they believe you!
UPGRADES
Rank 5: You can use this Skill while gambling.
Rank 10: You can use this Skill to forge documents.
Rank 1 5: You’re good enough to know when you’ve 
been caught. If you fail this Check, you may perform 
one Action before your foes can react.
DETECT LIES
Intelligence
You have an incredible bullshit detector. If you believe 
someone is trying to lie to you, make a 
Cha ‑Opposed 
Skill Check. If th
ey possess the Deception Skill, you 
make this Check with Disadvantage.
On Success, you sense if they’re lying, but if they believe 
they’re telling the truth, you sense they’re telling the truth.
UPGRADES
Rank 5: When you Fail, you still can’t detect the lie, but you 
can ignore the additional effects of a Major Fail or worse.
Rank 10: When you Fail, you can’t detect the lie, but 
you can ignore the effects of a Critical Fail.
Rank 1 5: You do not need to see the speaker, which 
allows you to detect lies in text and audio form.
DETECT TRAP
Intelligence
When you suspect a room, door, chest, or other object 
has an active trap, this is the Skill you want. Make an 
Unopposed Skill Check. Roll with Disadvantage when 
using this Skill to scan an entire room or while moving.
On Success, you are alerted to the presence of a 
non
‑magic trap, wh
ich typically allows you to avoid 
triggering it.
On Fail, you sense nothing, and a trap may or may not 
be present.
UPGRADES
Rank 5: You can detect magical traps.
Rank 10: You no longer roll with Disadvantage when 
searching a broad area or while moving.
Rank 1 5: When you are aware of nearby traps, your 
party has Advantage on their first Check to avoid or 
escape the effects.
DETERMINE VALUE
Passive
Limitations: Ranks in this Skill only increase by 
magical means.
You can sort your HUD’s Inventory by item value. The 
actual gold value is not displayed.
UPGRADES
Rank 5: Your Inventory is tabbed to sort your items by 
type, and it includes a history tab that tracks your item 
usage and any former owners of an item.
Rank 10: You can determine what type of loot box the 
item would have come from.
Rank 1 5: Whenever you add a new item to your Inven‑
tory, the gold value of that item is displayed.
DIPLOMACY
Charisma
Used in mediation between opposing organizations 
and parties. Make an 
Int ‑Opposed Skill Check of the 
side with the high
er Int  Mod.
On Success, the two parties are willing to discuss options.
UPGRADES
Rank 5: Roll with Advantage if you are not a member 
of either party.
Rank 10: Each side accepts consequences if they 
break the deal.
Rank 1 5: Hostilities cease at least for the remainder of 
the day.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
189
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 18 / book page 190

```text
 
DODGE
Passive
Limitations: Mark the Skill for Advancement when 
Evading until you reach Rank 5. After that, Ranks in 
this Skill only increase by magical means and training.
You gain a +1 Evade Buff.
UPGRADES
Rank 5: Gain a +1 Evade Buff, and you may Step an 
additional 5 feet when you perform the Evade Action.
Rank 10: Gain a +2 Evade Buff, and roll Evade with 
Advantage vs. Spells and Ranged Attacks.
Rank 1 5: Gain a +2 Evade Buff, and you may per‑
form the Evade Action without spending an Action in 
combat.
DOUBLE TAP
Passive
Limitations: To engage this Skill, you must declare a 
Double Tap at the start of the combat round, before 
Mob Actions have been determined. You must then 
use all of your Actions this round to Attack a single 
target with the same weapon or Spell. Mark this Skill 
for advancement anytime you roll an Amazing Success 
or better while using it.
If your first Attack is an Amazing Success or better, your 
second Attack (if it hits) is upgraded to a Critical Hit.
UPGRADES
Rank 5: Roll your first Attack with Advantage.
Rank 10: If your first Attack is a Standard Success or 
better, the second Attack (if it hits) is upgraded to a 
Critical Hit.
Rank 1 5: Roll your second Attack with Advantage. If 
your second Attack is a Critical Hit or upgraded to one, 
deal ×3 damage (instead of ×2).
DRIVING
Dexterity
Limitations: If you Attack while Driving, you suffer 
Disadvantage on those Checks.
You don’t need this Skill if you’re casually driving down 
the road to pick up a quart of milk, but if you’re racing, 
chasing, showing off, or doing something dangerous in 
a vehicle, this is the Skill you want.
If you’re doing something wild or trying to avoid 
becoming a skid mark on the highway, make an Un‑
opposed Skill Check. Depending on how extreme the 
circumstances are, the GM may apply Advantage or 
Disadvantage to the Check.
On Success, you achieve your daredevil maneuver or 
avoid wrecking your vehicle.
UPGRADES
Rank 5: You no longer suffer Disadvantage when 
attacking while Driving.
Rank 10: Your vehicle has +5ft Move. Roll with Ad‑
vantage to Evade Attacks against your vehicle.
Rank 1 5: Your vehicle has +5ft Move. When perform‑
ing crazy stunts (like driving on only your left
‑side 
wheels), r
oll with Advantage.
DUMPSTER DIVING
Intelligence
Known as “scrounging” in some parts of the world.
This Skill bolsters your ability to search the clutter with‑
in the dungeon to find interesting bits of rubbish and 
maybe something useful. Using this Skill takes 1 hour 
and can only be performed once per 50
‑foot‑square 
ar
ea. Make an Unopposed Skill Check.
On Success, you find what you were looking for or 
another interesting item, determined by the GM.
UPGRADES
Rank 5: You also find 1 Rank damage die’s
‑worth of 
Misc. Junk.
R
ank 10: A Dumpster Dive takes 30 minutes. On a 
Critical Hit, you gain an additional interesting item.
Rank 1 5: A Dumpster Dive takes 10 minutes. On an 
Amazing Success, you gain an interesting item.
ENDURANCE
Constitution
Use this Skill to prevent fatigue while grinding, walking 
long distances (measured in miles), or other extended 
strenuous activities. Make an Unopposed Skill Check.
On Success, you may continue the activity and do not 
gain the Fatigued Debuff.
UPGRADES
Rank 5: You can ignore the effects of a Major Fail 
when making these Checks.
Rank 10: If you are not Fatigued or in extreme condi‑
tions, you make this Check with Advantage.
Rank 1 5: If your Check is a Critical Fail, you can take 
the effects of a Standard Fail.
4
190
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 19 / book page 191

```text
 
1
ENGINEERING
Intelligence
Limitations: Cannot create vehicles or high‑powered 
engines (see 
Gear Head for that p. 192).
This Skill is used to design and build things with 
moving parts, fluids, or chemicals wholly out of Misc. 
Junk with no inherent bonuses, though they may have 
situational bonuses. Examples include a watch, a water 
pump, or bullets. See Crafting p. 22 1.
Starting on the Fourth Floor, you may make use of an 
Engineering Table to make your mundane items easier 
to craft. Make an Unopposed Skill Check.
On Success, you create the item.
UPGRADES
Rank 5: Choose a mundane item type to specialize 
in. You have Advantage when creating an item of that 
type.
Rank 10: You may craft your specialty item with a +1 
bonus level enchantment.
Rank 1 5: You may craft your specialty item with up to 
+2 bonus level enchantment, and it takes half the time.
ESCAPE ARTIST
Dexterity
Holy Houdini! While anyone can use Dexterity to wig‑
gle out of restraints or a hold, you’re especially skilled 
at the art of escape. When you try to escape from 
bonds or being Held, you can use this Skill.
When trying to escape bonds, make an Unopposed 
Skill Check.
To escape being Held, make a 
Str ‑Opposed Skill 
Check. Based on the comple
xity or simplicity of what 
binds you, the GM may have you make the Check with 
Advantage or Disadvantage.
On Success, you escape your bonds or the creature 
holding you.
UPGRADES
Rank 5: You can escape your bonds, and no one sees 
you do it. If you escape being Held, you can then take 
a Step (also unseen).
Rank 10: When other crawlers in your party roll 
this skill untrained, they roll as normal (not with 
Disadvantage).
Rank 1 5: When you slip out, you may immediately take 
an Action with Advantage.
ESCAPE PLAN
Passive
Limitations: Ranks in this Skill only advance by magi‑
cal means.
Your HUD reveals hidden doors and passages, unless 
those passages were crafted by someone with more 
Ranks in Fabricate or Engineering than you have in this 
Skill or the passage is entirely natural.
UPGRADES
Rank 5: You have access to system
‑concealed dis‑
play
s and the Dungeon Locator. Holographic signs 
pop up in your HUD, displaying insider information 
like signs at a zoo. Includes arrows toward City and 
stronger Bosses.
Rank 10: You are able to read hidden sigils (glowing 
blue circles) used by the showrunners to direct the 
movement of Mobs.
Rank 1 5: You are able to read hidden messages and 
redactions in dungeon documents.
EXPLOSIVES HANDLING
Intelligence
For making Attack Skill Checks with explosives (see 
Throwing, p. 200).
Make an Unopposed Skill Check.
On Success, you safely handle standard explosive de‑
vices. On Fail, I’m sure the GM will think of something.
UPGRADES
Rank 5: You are able to determine the type, status, 
and raw materials of explosives you handle.
Rank 10: You are able to craft explosives such as dy‑
namite as if this were a crafting Skill, though you must 
have explosive raw materials and a Sapper’s Table (see 
Crafting, p. 22 1).
Rank 1 5: You may create explosive raw materials out of 
non
‑volatile materials. Y
our crafting takes half the time.
FABRICATE
Intelligence
Limitations: Cannot create things with moving parts, 
fluids, or chemicals.
Use this Skill to make generic, mundane items with no 
inherent bonuses wholly out of Misc. Junk, but your 
GM can give them situational bonuses.
Examples include a ladder, a 50ft rope, or a ceramic 
pot to store napalm. For items with moving parts, see 
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
191
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 20 / book page 192

```text
 
the Engineering Skill above instead. See Crafting, p. 
22 1. Make an Unopposed Skill Check.
On Success, you create the item.
UPGRADES
Rank 5: Choose a mundane item to specialize in. You 
have Advantage when creating that item.
Rank 10: You may craft your specialty item with a +1 
bonus level enchantment.
Rank 1 5: You may craft your specialty item with up to 
+2 bonus level enchantment, and it takes half the time.
FIND CRAWLER
Passive
Limitations: Ranks in this Skill only increase by 
magical means.
Your HUD displays other crawlers within 1,000 feet of 
you. They are designated with a blue dot.
UPGRADES
Rank 5: The area in which you can detect other crawl‑
ers increases to 5 miles.
Rank 10: The area in which you can detect other 
crawlers increases to 10 miles.
Rank 1 5: You can input a specific crawler’s name and 
learn their exact location anywhere in the dungeon.
FIND TRAP
Passive
Limitations: Ranks in this Skill only increase by 
magical means and training.
Traps within 5 feet of you appear on your HUD one 
second prior to triggering the trap, which is often too 
late to react.
UPGRADES
Rank 5: Traps appear on your HUD up to 5 seconds 
before they are triggered.
Rank 10: Traps within 10 feet of you appear on your 
HUD as you approach them.
Rank 1 5: Traps within 15 feet of you appear on your 
HUD as you approach them.
FIRST AID
Intelligence
Limitations: After you treat someone, you can’t treat 
them again until they complete a Short or Long Rest.
Give minor medical aid to yourself or someone else. 
Make an Unopposed Skill Check.
On Success, the patient regains 1 Health Bar slot. Each 
higher degree of Success heals 1 additional slot.
UPGRADES
Rank 5: If you spend 5 minutes, the patient also heals 
a Minor Injury Debuff.
Rank 10: If you spend 10 minutes, the patient also 
heals a Long
‑Term Minor Injury Debuf
f.
Rank 1 5: The patient regains 1 additional Health Bar 
slot. If you spend 15 minutes, the patient also heals a 
Major Injury Debuff.
GEAR HEAD
Intelligence
Limitations: This Limited Skill can only be learned 
via a Race, Class, or item. Requires an Engine Stand 
attachment to an Engineering Table (2,000 gold).
You are proficient at building high
‑perf
ormance engines, 
using the rules of Crafting (see p. 22 1). Each +5ft Move 
is a +1 Bonus Level at the default “10 + Bonus Level 
×4” Difficulty. The time it takes and Misc. Junk required 
uses the rules of crafting mundane items.
On Success, you have successfully built a custom engine.
UPGRADES
Rank 5: You are able to add accessories to vehicles or 
even build your own custom vehicles. Use the rules of Engi‑
neering for crafting such things, but use this Skill and there 
are no bonus level limits to your custom
‑craf
ted items.
Rank 10: Each +10ft Move is a +1 Bonus Level. You 
may use this Skill as a Repair Skill (see p. 197) when 
fixing engines.
Rank 1 5: Cut the time required to craft engines and 
vehicles you build around your engines in half.
GOBLIN EXPLOSIVES
Intelligence
For making Attack Skill Checks with explosives, see 
Throwing, p. 200.
Make an Unopposed Skill Check. Goblin Explosives are 
so unstable that Critical Fails occur on a Natural 1–4.
On Success, you safely use Goblin Explosive devices.
UPGRADES
Rank 5: Critical Fail occurs on a Natural 3 or less. You 
are able to determine the type, status, and raw materi‑
als of Goblin Explosives you handle.
4
192
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 21 / book page 193

```text
 
1
Rank 10: Critical Fail occurs on a Natural 2 or less. You 
are able to craft explosives such as dynamite as if this 
were a crafting Skill, though you must have explosive raw 
materials and a Sapper’s Table. See Crafting on p. 22 1.
Rank 1 5: Critical Fail occurs on a Natural 1 as usual. 
You may create explosive raw materials out of non
‑vol‑
atile materials with th
e use of a Sapper’s Table. Your 
crafting takes half the time.
GOOD FIRST IMPRESSION
Charisma
Limitations: This Skill doesn’t work on crawlers, 
Bosses, or Elites. You can only make a Skill Check 
against individuals, not groups.
When you encounter an NPC or Mob that is not 
immediately hostile or attacking, make an 
Int ‑Opposed 
Skill Check.
On Suc
cess, the Mob approaches with wary curiosity.
UPGRADES
Rank 5: A Mob that is lower level than you won’t at‑
tack your party unless they are attacked by a member 
of your party.
Rank 10: A Mob that is up to double your level won’t 
attack your party unless they are attacked by you or an 
ally or your party is preventing them from completing 
their objective.
Rank 1 5: A group of Mobs of the same type up to 
double your level won’t attack your party unless they 
are attacked by a member of your party, or your party 
is preventing them from completing their objective.
HIDE IN SHADOWS
Dexterity
Limitations: To move while avoiding detection, see 
Stealth, p. 199.
While in a heavily shadowed area or out of sight, 
you can stay still and attempt to foil foes’ chances to 
spot you. Make an 
Int ‑Opposed Skill Check. If you’re 
hiding behind an ob
ject that is larger than you, roll 
with Advantage.
On Success, you become invisible to Mobs and the 
HUDs of other crawlers but can still be affected by 
environmental and Area Attacks. You become visible 
if you take an Action that affects another creature or if 
you’re no longer behind cover.
UPGRADES
Rank 5: You can use this Skill in a dim light without 
having an object to hide behind.
Rank 10: When other crawlers in your party roll 
this Skill untrained, they roll as normal (not with 
Disadvantage).
Rank 1 5: You can use this Skill in a lightly shaded area 
and may make a Step without giving away your position.
IMPROVISED EXPLOSIVE DEVICE
Intelligence
Use this Skill to manipulate explosive material into 
bombs and traps without a Sapper’s Table. You literally 
can’t use one, so you’ll have to make an Explosives 
Handling Skill Check to avoid issues when crafting your 
device. Use the rules of Crafting on p. 22 1.
On Success, you create the device. Bombs and 
traps can have timers and triggering devices more 
sophisticated than a burning fuse.
UPGRADES
Rank 5: Your crafting takes half the time.
Rank 10: Your devices deal d10s of damage instead of 
d6s (the default).
Rank 1 5: Your devices can be set to trigger only 
against a specific Mob, Boss, NPC, or crawler.
INCENDIARY DEVICE HANDLING
Intelligence
For making Attack Skill Checks with incendiary devic‑
es, see Throwing, p. 200.
Make an Unopposed Skill Check.
On Success, you are able to safely handle incendiary 
devices.
UPGRADES
Rank 5: You are able to determine the type, status, 
and raw materials of incendiary devices you handle.
Rank 10: You are able to craft incendiary devices 
as if this were a crafting Skill, though you must have 
incendiary raw materials and a Sapper’s Table. See 
Crafting, p. 22 1.
Rank 1 5: Add a +5 Splash to your crafted device at 
no additional Difficulty, and your crafting takes half 
the time.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
193
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 22 / book page 194

```text
 
INFUSION
Intelligence
Limitations: Requires an Infusion Station attachment 
on an Alchemy Table or Tier 3 Sapper’s Table.
Use this Skill to infuse potion bonuses onto consum‑
able items. One potion can infuse one item. You’ll ei‑
ther need to learn Alchemy so you can craft your own 
potions, or find potions to transfer to consumables. 
Example: Infuse a Hobgoblin Smoke Curtain with an 
Invisibility potion to create a Hobgoblin Disco Ball. See 
Crafting, p. 22 1.
On Success, your consumable item now does more!
UPGRADES
Rank 5: One potion can infuse 2 items at once.
Rank 10: One potion can infuse 5 items at once.
Rank 1 5: One potion can infuse 10 items at once.
INTIMIDATE
Strength
You can use this Skill to scare the wits out of a foe. 
Make a Cha ‑Opposed Skill Check. If either side has 
attacked or tak
en a hostile stance in this encounter, roll 
with Disadvantage.
On Success, the target gains the Staggered Debuff (p. 97).
UPGRADES
Rank 5: On Success or greater, until the end of the 
next round, the target can only use its remaining Ac‑
tions to move away from you (though it does not need 
to use its Step when doing so).
Rank 10: The target also gains the Woozy Debuff.
Rank 1 5: The target drops everything they were hold‑
ing and also gains the Paralyzed Debuff.
INVESTIGATION
Intelligence
You spend 10 minutes looking at an area or puzzle in 
front of you and might make heads or tails of it. Make 
an Unopposed Skill Check.
When you take the Look for Clues Action (p. 85), 
spend only one Action to use this Skill.
On Success, you learn something useful.
UPGRADES
Rank 5: If you’re familiar with the area you are investi‑
gating, you can make the Skill Check with Advantage.
Rank 10: Each attempt takes 5 minutes.
Rank 1 5: Roll with Advantage if you know the parties 
involved. Example: You know the puzzle’s maker, or 
you know the murder victim and the main suspect.
IRON STOMACH
Constitution
Eat magic items for fun and profit! But beware of 
cursed items, as they could have negative effects. 
Make an Unopposed Skill Check.
On Success, you eat the item. It is destroyed, as the 
shitter will be tomorrow morning.
On an Amazing Success or better, gain 1 permanent 
Intelligence.
UPGRADES
Rank 5: On a Critical Hit, gain 1 additional permanent 
Intelligence.
Rank 10: On a Standard Success or better, gain 1 
permanent Intelligence. You may eat cursed items with 
no ill effects.
Rank 1 5: You choose which Stat is permanently 
increased.
JUMPING
Strength
With a running start of at least 10 feet (made as a 10‑
foot Step with this Action), you leap th
rough the air in 
an arcing trajectory. Make an Unopposed Skill Check.
On Success, you leap a distance in feet up to your 
Rank + Str  with a height of 1ft.
UPGRADES
Rank 5: Add your Dex  to the height of your Jump.
Rank 10: You gain a +1 Evade Buff.
Rank 1 5: Your leap distance in feet is Rank + [Str  ×2].
LEADERSHIP
Charisma
You are skilled at coordinating two or more separate 
parties during fights against Bosses. Make an Int‑Op‑
posed Skill Ch
eck.
On Success, the parties have Advantage on their first 
Attack against the Boss.
UPGRADES
Rank 5: You may instead use this Skill during Skill 
challenges while on a group Quest. Perform a free Call 
a Play Action, and it extends to each member of the 
parties during their next non
‑combat Skill Ch
eck.
4
194
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 23 / book page 195

```text
 
1
Rank 10: Instead of Advantage, anyone in the parties 
may perform a free Move Action.
Rank 1 5: Instead of Advantage, anyone in the parties 
may perform a free Evade Action.
LIGHT ON YOUR FEET
Dexterity
Limitations: Usable only by animals
With a running start of at least 10 feet (made as a 10ft 
Step with this Skill), you leap through the air in an arc‑
ing trajectory. Make an Unopposed Skill Check.
On Success, you leap a distance in feet up to your 
Rank ×2 with a height equal to your 
Dex  ×2 in feet.
UPGRADES
Rank 5: Your distance is Rank ×3 and your height is 
Dex  ×3.
Rank 10: You may leap without an arcing trajectory, 
which allows for “straight up.”
Rank 1 5: Your leap may last up to your Rank in sec‑
onds, which resembles gliding.
LOCKPICKING
Dexterity
Limitations: Roll with Disadvantage if you do not 
have the proper tools, unless it’s a crude lock.
You spend the Floor number in minutes trying to pick 
the lock. Make an Unopposed Skill Check (more com‑
plex locks may have a higher Difficulty, as determined 
by the GM). If the lock was created by a named antago‑
nist, this could be an 
Int ‑Opposed Skill Check instead.
On Success, you pick the lock!
UP
GRADES
Rank 5: You make no noise and leave no trace.
Rank 10: Each attempt takes half the time. You may 
alter the lock so that the key no longer works.
Rank 1 5: You don’t roll with Disadvantage if you lack 
the proper tools.
LORE
Intelligence
You have studied the goings‑on in the Dungeon and 
h
ave figured out a thing or two. Make an Unopposed 
Skill Check.
On Success, you know a little something about a 
neighborhood, some of the Mobs, or how to avoid 
pissing off the locals.
UPGRADES
Rank 5: You can identify the major factions in the area.
Rank 10: You are aware of the important local NPCs. 
Just give your GM a break and don’t demand this all 
up front or the first one you come across will likely 
attack you.
Rank 1 5: You roll with Advantage on your first Charis‑
ma
‑based Skill Ch
eck when encountering an organized 
group in a neighborhood.
NEGOTIATION
Charisma
Limitations: Does not work on members of your own 
party. Some items have a minimum price.
You spend 5 minutes haggling over the price of items 
or negotiating to get what you want through compro‑
mise. Typically, haggling is done with an NPC merchant 
when you’re buying or selling items. If you haggle with 
other entities, you do so with Disadvantage. Make an 
Int ‑Opposed Skill Check.
On Success, you increase or decr
ease the price 10% in 
your favor. If you’re not haggling, the opponent tenta‑
tively agrees to your terms.
UPGRADES
Rank 5: Your party members can also buy or sell at 
your newly
‑negotiated price.
Rank 1
0: Increase or decrease the price by an addi‑
tional 10% in your favor.
Rank 1 5: Increase or decrease the price by an addi‑
tional 15% in your favor.
PATHFINDER
Passive
Limitations: Ranks in this Skill only increase by magi‑
cal means and training.
Your HUD map zooms out with a thought, the breadth 
of which is determined by a multiplier equal to your 
Rank. Example: Rank 4 means your map covers ×4 the 
standard area (1/4 of a square mile), which makes it 
extend to 1 mile around you.
UPGRADES
Rank 5: You are notified when you are near a safe‑
room or stairwell.
Rank 10: You can see through your map while it is 
open in your HUD.
Rank 1 5: Mobs appear as red dots on your HUD map.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
195
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 24 / book page 196

```text
 
PERCEPTION
Intelligence
You concentrate your senses to pick out details about 
your environment that others might miss. Make an Un‑
opposed Skill Check, though the GM will likely adjust 
the Difficulty based on the lighting, how cluttered the 
area is, how quickly an event occurs, and other such 
circumstances.
Also use Perception when you take a Look for Clues 
Action (p. 85).
On Success, you notice something. It could be import‑
ant; it might not be.
UPGRADES
Rank 5: Halve the penalty for cluttered areas.
Rank 10: Halve the penalty for how short of a window 
you have to notice the thing.
Rank 1 5: Halve the penalty for the range to the thing.
PERFORMANCE
Charisma
Whether you’re acting, dancing, playing an instrument, 
singing, or delivering slam poetry, use this Skill when 
you want to electrify an audience. Choose a type of 
performance to specialize in as your starting type, be 
it comedy, guitar, screamo, or reciting the collected 
works of Alan Ginsberg.
Make an Unopposed Skill Check to determine the 
audience reaction. If you are competing against other 
performers, add the top rival’s 
Cha  to the Difficulty.
On Success, you command the stage. The audience is 
entertained.
UPGRADES
Rank 5: Choose an additional type of performance to 
specialize in.
Rank 10: Choose an additional type of performance. 
You can coach and coordinate others in one of your 
specialties. After coaching them for at least 1 hour in 
one of your specialties, they can attempt an unskilled 
Performance Skill Check without Disadvantage.
Rank 1 5: Choose an additional type of performance. 
You can mimic someone else’s performance after 
experiencing it once.
PERSUASION
Charisma
You have a knack for getting others to see things your 
way. You typically need about 10 minutes of schmooz‑
ing in a safe environment to make a Check with this 
Skill, and you may suffer Disadvantage if the request is 
risky, inconvenient, or untoward. Make an 
Int ‑Opposed 
Skill Check.
On Suc
cess, you convince the target to follow your 
suggestion if it isn’t too costly for them, too danger‑
ous, or against their nature.
UPGRADES
Rank 5: They’ll follow your suggestion even if it is 
costly for them.
Rank 10: They’ll follow your suggestion even if it is 
dangerous.
Rank 1 5: They’ll follow your suggestion even if it’s 
against their nature.
REGENERATION
Passive
If your Rank in this Skill is equal to or greater than your 
Con , you heal 1 Health Bar slot at the start of each 
round (or every 10 seconds outside of combat). If not, 
you heal 1 Health Bar slot every other round (or every 
20 seconds outside of combat).
4
196
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 25 / book page 197

```text
 
1
UPGRADES
Rank 5: After 5 minutes, any Minor Injury Debuff you 
suffer from ends. After 10 minutes, any Major Injury 
Debuff you suffer from ends.
Rank 10: After 20 minutes, any Long
‑Term Minor 
Injury Debuf
f you suffer from ends. After 1 hour, any 
Long‑Term Major Injury Debuf
f you suffer from ends.
Rank 1 5: The time required to end injury Debuffs is 
halved.
RELIGION
Intelligence
You have a knack for understanding gods, their follow‑
ers, and what makes them tick. Make an Unopposed 
Skill Check.
On Success, you know the basic information about a 
god and the practices of their followers.
UPGRADES
Rank 5: You can identify the followers on sight, even if 
they’re trying to hide their affiliation.
Rank 10: You know how to sow discord among the 
followers of that religion.
Rank 1 5: You know strengths and weakness of the 
gods.
REPAIR
Intelligence
Limitations: For basic repairs to items with no moving 
parts, magical or not.
After spending 2 hours, you can repair most simple 
items that are broken or damaged but not destroyed. 
Make an Unopposed Skill Check.
On Success, you repair the item.
UPGRADES
Rank 5: You can make repairs to things with moving 
parts.
Rank 10: You can make repairs in 1 hour.
Rank 1 5: You can rebuild a destroyed item.
RIDING
Dexterity
Limitations: The rider in control of the mount rolls 
Attack Skill Checks with Disadvantage.
While mounted on a living beast, you can ride to the 
local watering hole without needing to make a Check. 
But during an action scene or when exploring Giant 
Gopher Hole Flats, your mount might panic, and you 
might get tossed for 1d6 bludgeoning for every 10ft 
Move your mount has, plus its size value. Don’t land in 
a cactus patch! Make an Unopposed Skill Check.
On Success, your mount doesn’t stumble, and you 
stay upright.
UPGRADES
Rank 5: Your mount has +5ft Move. You no longer 
suffer Disadvantage when attacking while Riding.
Rank 10: Your mount has an additional +10ft Move. 
When other crawlers in your party roll this Skill un‑
trained, they roll as normal (not with Disadvantage).
Rank 1 5: Your mount has an additional +15ft Move. 
When performing crazy stunts (like jumping through 
flames), roll with Advantage.
ROPEWORK
Dexterity
You know a half hitch from a clove hitch, and the quali‑
ties of hemp vs. nylon (we had to look it up). Sadly, this 
knowledge is mostly used to tie people up so you can 
tor—interrogate them, but you’re going to buck that 
trend, right? Just climbing and cattle
‑rustling f
or you!
Make an Unopposed Skill Check.
On Success, you rope the thing with a good knot.
UPGRADES
Rank 5: You can now use this Skill as an Attack, at a 
Range of 10ft vs. the target’s Evade. On Success, the 
target gains the Held Debuff.
Rank 10: You can whip your line in that special way to 
untie a knot you made and recover your rope.
Rank 1 5: Your Attack now has a Range of your 
Strength (min 15). Just make sure your rope is long 
enough.
RUNNING
Dexterity
Limitations: For short bursts of running. For extended 
runs, use Endurance instead (p. 190).
You don’t need to use this Skill if you’re running down a 
hallway to attack some Mobs. But if you’re racing, chas‑
ing, or need to get away from a ticking time bomb, this 
is the Skill you want. See Racing & Chasing, p. 73.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
197
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 26 / book page 198

```text
 
Make an Unopposed Skill Check every minute, not every 
round. Add 1 to your result for every 10ft of Move you have.
On Success, you succeed in the run.
UPGRADES
Rank 5: You have a permanent +5ft Move Buff. Make 
a Check every 2 minutes.
Rank 10: You have an additional permanent +10ft 
Move Buff. Make a Check every 4 minutes.
Rank 1 5: You have an additional permanent +15ft 
Move Buff. Make a Check every 6 minutes.
SAL VAGE
Intelligence
Limitations: Salvage cannot be used with explosive 
devices.
Salvage is the art of collecting useful items from things 
you have deconstructed or failed to properly craft. See 
Crafting, p. 22 1.
Salvaging usually takes 1 hour to accomplish. At the 
end of that time, make an Unopposed Skill Check.
On Success, you recover half of the important raw materials.
UPGRADES
Rank 5: Your Salvage Checks take 30 minutes.
Rank 10: On Success, you recover all of the important 
raw materials.
Rank 1 5: On a crafting Standard Fail or Near Miss, 
roll your crafting Check again with Advantage, with an 
additional 15
‑minute time expenditur
e.
SCUTELLIPHIL Y
Intelligence
Limitations: This Limited Skill can only be learned via 
a Race, Class, or item.
You know your way around patches and love collecting 
them. Make an Unopposed Skill Check.
On Success, you are able to identify a patch and its 
bonus level, if any.
UPGRADES
Rank 5: You can sew and iron patches onto clothing 
using this Skill.
Rank 10: You may use this as a crafting Skill, but 
crafting tables provide no bonuses. Enchanted patches 
are limited to one per Gear slot and do not take up 
Accessory slots. See Crafting, p. 22 1.
Rank 1 5: Your crafting Checks take half the time. In‑
crease the bonus value of your enchantments with this 
Skill by 1, at no additional Difficulty or time to craft. 
Example: If you craft a +2 Strength patch, it becomes 
a +3 Strength patch.
SHIELD BLOCK
Strength, Interrupt
Limitations: Requires you to be wielding a shield. 
Cannot be used against Area of Effect damage. A suc‑
cessful Shield Block still counts as “a hit crawler” or “a 
crawler who failed to Evade.”
You’re one of those types. You like a big slab of wood 
or metal between you and the beasties. When you 
are attacked by a physical Attack, spend one Action 
to make a separate Shield Block Skill Check vs. the 
Mob’s “to hit” for each of the Attacks targeting you. 
If 3 physical Attacks are directed at you, roll this Skill 
Check 3 times. Where an Evade Check is called for, ask 
your GM if you can use this Skill.
On Success, take half the damage before applying 
your DR. Your Shield takes a 
‑1 DR penalty on a Major
 
Fail; ‑2 on a Critical Fail. It br
eaks at 0 DR. However, a 
broken shield and lost DR can be Repaired.
UPGRADES
Rank 5: You may also use this Skill against Spells and 
magical damage.
Rank 10: On a Critical Hit, you may make a Shield 
Bash Attack as a free melee
‑range Interr
upt Attack 
(instead of Advantage on your next Attack) if you wish, 
dealing 3d6 base damage + 
Str  Bludgeoning.
Rank 1 5: +1d6 Shield Bash damage. Further reduce 
the damage you would take by your 
Str  Mod. Example: 
After halving 30 damage down to 15, your Str  Mod of 
5 reduces it to 10 damage.
SLEIGHT OF HAND
Dexterity
Limitations: Items you manipulate must be smaller 
than the size of your hand. You cannot access others’ 
Inventories or Hotlists.
You’ve learned to manipulate small objects without being 
spotted. Great for shoplifting. Make an 
Int ‑Opposed Skill 
Check. If someone’s Per
ception is a higher Rank than 
your Sleight of Hand, you have Disadvantage.
On Success, you maneuver the item without being noticed.
4
198
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 27 / book page 199

```text
 
1
UPGRADES
Rank 5: You may attempt to pick the pockets of NPCs 
and Mobs.
Rank 10: You may attempt to plant items on someone 
with pockets or the equivalent.
Rank 1 5: You may manipulate items up to half your 
own size (rounded down).
SMITHING
Strength
You may craft mundane items such as horseshoes, 
railroad spikes, nails, or the fun stuff: armor and 
weapons, but without DR or any bonuses. See Crafting, 
p. 22 1.
UPGRADES
Rank 5: You may craft items up to a +5 bonus.
Rank 10: You may craft items up to a +10 bonus.
Rank 1 5: Your crafting with this Skill takes half the time.
STEALTH
Dexterity
Limitations: You must be out of sight of all foes to 
begin this Check.
Use this Skill if you want to move undetected or sur‑
prise a Mob. Make an Int ‑Opposed Skill Check.
On Success befor
e combat starts, you are unnoticed 
and gain 1 non‑Attack Action. Don’t f
orget to take 
your 10ft Step!
On Success in a non‑combat situation, you remain 
unnoticed and can per
form a Move Action with a 10ft 
Step as part of this Check.
UPGRADES
Rank 5: Your surprise Action can be an Attack with 
Advantage.
Rank 10: When other crawlers in your party roll this Skill 
untrained, they roll as normal (not with Disadvantage).
Rank 1 5: On a successful Surprise Check, you may 
also take a full Move and Step. If you Attack with your 
Surprise Action, deal ×2 the base damage dice.
STREETWISE
Charisma
Use this Skill in populated areas to learn or spread ru‑
mors, avoid attracting too much attention, gain access 
to less
‑than‑legal items, and the lik
e. Make an Unop‑
posed Skill Check.
On Success, you navigate a town without attracting 
attention, deal with a criminal network, identify an informal 
power structure, or gain the information you’re seeking.
UPGRADES
Rank 5: You also hear an additional rumor, as deter‑
mined by the GM. Or spread one!
Rank 10: You also quickly find a hiding place deter‑
mined by the GM.
Rank 1 5: You also uncover information that might give 
you some leverage on an important person in town 
determined by the GM.
SURVIVAL
Constitution
You know how to survive in dangerous, often remote 
places for long periods of time with only the meager 
food and water you can rustle up. When traveling 
through such areas, make an Unopposed Skill Check.
On Success, you survive the perils of the conditions 
unscathed. On a standard Fail, you suffer the effects of 
hunger and/or thirst (see p. 76).
UPGRADES
Rank 5: You do not suffer additional damage from a 
Critical Fail.
Rank 10: When other crawlers in your party roll 
this Skill untrained, they roll as normal (not with 
Disadvantage).
Rank 1 5: You do not suffer additional damage from a 
Major Fail.
SWIMMING
Strength
Limitations: After 1 minute of Swimming (Success or 
Fail) or immediately on a Major Fail or worse, gain the 
Fatigued Debuff.
Use this Skill when there are consequences for not 
swimming strongly or well rather than when you’re 
taking a casual swim. For instance, if you’re racing for 
your life, swimming against a strong current, or trying 
to get to shore to avoid a waterfall. In these cases, 
make an Unopposed Skill Check every 30 seconds.
On Success, you swim well despite the danger. For 
swimming during combat, see Special Forms of Move-
ment, p. 70.
UPGRADES
Rank 5: After 2 minutes of Swimming (Success or 
Fail), gain the Fatigued Debuff.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
199
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 28 / book page 200

```text
 
Rank 10: You can swim at your full Move rate as an 
Action, but you still can’t take a 10ft Step.
Rank 1 5: Make this Check every 5 minutes, and only 
gain the Fatigue Debuff on a Critical Fail.
TACTICS
Intelligence
Limitations: A crawler may attempt this Skill Check 
only once per combat.
Your tactical mind and directions can spur your allies 
to victory. Choose one of the following combat disci‑
plines: Attack, Damage, or Evade, and then make an 
Unopposed Skill Check.
On Success, you and each member of your party 
gain a +1 bonus to Checks for the chosen discipline. 
Increase the bonus by +1 for each higher degree of 
Success.
UPGRADES
Rank 5: If you observe the foes and battlefield for at 
least 5 minutes prior to combat, roll this Skill Check 
with Advantage.
Rank 10: After using this Skill during a combat, you 
roll 2d10 when you Call a Play (still choose one die).
Rank 1 5: The bonus applies to all three combat disci‑
plines instead of just one.
TATTOO ARTISTRY
Dexterity
Used to stick and poke ink under someone’s skin to 
create a mundane tattoo. See Crafting, p. 22 1 for mag‑
ical tattoos.
UPGRADES
Rank 5: You may craft tattoos with up to a +5 bonus.
Rank 10: You may craft tattoos with up to a +10 bonus.
Rank 1 5: Your crafting with this Skill takes half the time.
TAUNT
Charisma, Interrupt
With a shout, some choice words, and maybe an 
obscene hand gesture, you attempt to draw the ire of 
enemies within 30 feet of you. After seeing where the 
Mob Attacks are headed, make an 
Int ‑Opposed Skill 
Check.
On Success, Taunt one Attack of your choosing away 
from any target of your choosing and onto you. Higher 
degrees of Success allow you to Taunt additional 
Attacks onto you.
UPGRADES
Rank 5: You may make a free Evade Check against 
each Taunted Attack (roll separately vs. each Attack 
as usual). Then you may still spend an Action to Evade 
other Attacks and reroll any Fails from your free 
Evades.
Rank 10: You can affect Mobs within 60 feet.
Rank 1 5: Your free Evade Checks against Taunted 
Attacks are made with Advantage.
THROWING
Strength
This Skill is used for passing the pigskin with your pops 
or throwing dynamite (potentially also at your pops).
You can Throw an object that weighs up to your 
Str  in 
pounds at a distance of up to your Str  ×10 feet. If you 
want to Throw a heavier or bulkier item (up to the GM’s 
discretion), you do so with Disadvantage.
To hit a target area, make an Unopposed Skill Check.
To hit a foe with an object, make an Attack Skill Check 
vs. the target’s Evade.
On Success, you hit the target.
1
28
37
4
5
6
Figure 3
4
200
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 29 / book page 201

```text
 
1
On Fail, roll 1d8 for direction (see Figure 3). The 
amount the Skill Check missed by is the distance away 
in feet it lands.
UPGRADES
Rank 5: You have Advantage when Throwing to a 
target who wants to catch what you are selling.
Rank 10: Choose the direction on a miss, rather than roll.
Rank 1 5: Your Throw range is your 
Str  ×20 feet.
TRACKING
Intelligence
Use this Skill to find and follow tracks. When searching 
for or attempting to follow tracks, make an Unopposed 
Skill Check. Factors such as how long ago the tracks 
were made, the ground conditions, and whether other 
tracks or marks obscure them may influence the Dif‑
ficulty. Once you find tracks, you must make another 
Tracking Check every 15 minutes to continue following 
them.
On Success, you either find the tracks or continue 
following them.
UPGRADES
Rank 5: You can follow found tracks for 30 minutes 
before making a new Check, and gain 1 piece of infor‑
mation about the target(s).
Rank 10: You can follow found tracks for 1 hour before 
making a new Check, and gain 2 pieces of information 
about the target(s).
Rank 1 5: You can follow found tracks for 2 hours 
before making a new Check, and gain 4 pieces of infor‑
mation about the target(s).
TRAP ENGINEER
Intelligence
Used to craft traps via a Sapper’s Table with a Trap 
Module (3,000 gold). See Crafting, p. 22 1.
UPGRADES
Rank 5: Roll with Advantage when making non
‑explo‑
sive tr
aps.
Rank 10: Your traps can be set to trigger only against 
a specific Mob, Boss, NPC, or crawler.
Rank 1 5: Add a +5 Splash to your trap at no addition‑
al Difficulty, and your crafting takes half the time.
ZONE OF CONTROL
Passive
Limitations: You must be wielding a Reach weapon.
Once per round, when an enemy enters a space 
adjacent to you for the first time, you may perform an 
Interrupt Attack against them at a cost of one Action. 
Make the Attack with Disadvantage.
UPGRADES
Rank 5: Your Attack is no longer made with 
Disadvantage.
Rank 10: The target is pushed 5 feet.
Rank 1 5: Make your Attack Skill Check with Advantage.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
201
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 30 / book page 202

```text
 
Spells
Spells are the strange, dangerous, and occasionally 
irresponsible way crawlers bend reality. Some Spells 
heal wounds or reshape the battlefield, and others 
exist primarily to make something stop moving—
permanently. Spells cannot be attempted untrained 
except via a scroll.
Every Spell listed in this section follows the same 
core rules for things like casting, targeting, and spend-
ing Mana. Spell listings include a variety of terms or 
fields associated with them, including:
Name: The name of the Spell appears as a headline to 
the entry.
Type: Whether the Spell is an Attack or Passive is noted 
under the flavor text. The type of damage delivered 
from Attack Spells is also listed here for quick reference. 
Spells default to your 
Int  Mod for to-hit and damage 
rolls. If a different Stat is listed here, that Stat is used to 
hit and damage, but Spells all still use Intelligence for 
Mana. If the spell is Favored by any particular Classes, 
other Classes pay 1 additional Mana to cast it.
Mana Cost: The Mana cost to cast the Spell.
Range: The range of the Spell. Melee means 5ft 
(adjacent).
Duration: Some Spells are not instantaneous. When 
the duration is reached, the Spell effect wears off at 
the end of that round.
AI Favor: Low-damage Spells grant AI Favor to you if you 
use such a wimpy attack for a majority of your attacks 
during a combat that lasts for at least three rounds.
Limitations: If there are conditions, requirements, or 
exclusions, they go here.
Cooldown: If the Spell has a cooldown, it is listed 
here. You can’t cast the Spell during its cooldown.
Description: Any notes or descriptions of the general 
effect seen when you cast the Spell are listed here. If the 
Spell requires a Spell Check, that is also provided here.
Base Damage: This is the damage the Spell deals with 
1–4 Ranks in the Spell. You add your 
Int  to the base 
damage, unless it says otherwise. The damage type is 
listed here as well.
Upgrades: These are bonuses you gain when you 
reach the listed Rank in the Spell. The first entry of 
each benefit adds a damage die of the same type to 
the base damage of the Spell. Additional damage dice 
and effects are also listed here.
SPELLS IN YOUR HOTLIST
Don’t forget that Spells need to be in your Hotlist 
to cast them in combat or other stressful situations. 
Write down the specific combat text for your Spell in 
the “Attacks” section on the front of your character 
sheet. When you write a Spell on your Hotlist, you 
need only list additional notes like the Mana cost and 
Range of the Spell.
Attack Spells require you to make an Attack Skill 
Check vs. the target’s Evade. Spells that don’t require 
a Check to be made when cast (non-Attack Spells) 
are tagged as Passive and simply happen, but those 
are not marked for Skill Advancement (p. 169) when 
used. Instead, their Ranks must be raised via magical 
means or trained at a guild.
CREATING YOUR OWN 
SPELLS
In the ways that count, Spells are just a special type 
of Skill. Create them in the same way as you’re 
create a Skill (p. 174–175).
LIST OF SPELLS
AIR BUDDY
“There’s no dungeon rule that a dog can’t fly.”
Passive, Favored: Mage
Mana Cost: 12
Range: Self
You launch yourself with enough force to fly, hurtling for‑
ward from your current position up to 10 × your 
Int  Mod 
away. You land safely if you land on solid ground; other‑
wise, you fall (see p. 76). You can cast this twice in a row 
to “double jump” just like in platforming video games.
UPGRADES
Rank 5: You may choose one additional willing target 
up to your size at touch range, who you bring with you.
Rank 10: You can fly up to 20 × your 
Int  Mod away 
with this spell.
Rank 1 5: You may choose up to five additional willing 
targets up to your size at touch range to bring with you.
4
202
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 31 / book page 203

```text
 
1
ASTRAL PAW (ASTRAL HAND, ASTRAL CLAW)
“You have summoned an Astral Paw. Yes, just the 
paw. Budget constraints.”
Passive
Mana Cost: 12
Range: 30 feet
Duration: Until the end of combat or 5 minutes.
You conjure a spectral hand, paw, or claw, looking 
much like your own. You can use this astral appendage 
to manipulate objects up to 30ft away by spending an 
Action. You can use the Astral Paw to make Skill Checks 
but suffer Disadvantage due to a lack of fine control.
UPGRADES
Rank 5: Your Pugilism and Slice Attacks with the Paw 
add 1 Astral Paw Rank damage die.
Rank 10: You can conjure a paw up to four size 
categories larger than your own, and the range 
increases to 50 feet.
Rank 1 5: The caster no longer suffers Disadvantage 
when performing suitable Skill Checks using the paw, 
and the duration is 15 minutes.
BAD FAITH
“The system has classified your prayers 
as a hostile act.”
Attack, Necrotic, Charisma, Favored: 
Cleric
Mana Cost: 10
Range: 40 feet
An unholy pres‑
ence invades your 
victim’s mind, body, 
and soul.
Base Damage: 
1d8 + 
Cha   
Necrotic
UPGRADES
Rank 5: +1d8 
base damage, +5ft 
Splash
Rank 10: +1d8 base damage, 
and end all Buffs on the victims for 
the duration of the combat.
Rank 1 5: +1d8 base damage, +5ft 
Splash
BANG BRO
“When you want more zing in your zinger.”
Passive
Mana Cost: 5
Range: 5 feet
Duration: 5 minutes + 1 minute per Rank
Cooldown: 15 minutes
Place a hot and crackling temporary enchantment on a 
weapon you are holding.
Your weapon deals +2 mixed Fire and Electric damage.
UPGRADES
Rank 5: +1d6 Fire and Electric damage
Rank 10: +1d6 Fire and Electric damage, and on an 
Amazing Success, the target of the weapon attack 
gains the Burned Debuff.
Rank 1 5: +1d6 Fire and Electric damage, and on an 
Amazing Success, the target of the weapon attack also 
gains the Shocked Debuff.
CLOCKWORK TRIPLICATE
“If one is good, then three is a party.”
Passive
Mana Cost: 26
Range: 5 feet
Duration: 1 minute per 
Rank
Limitations: Only castable on 
pets and minions.
When you cast this spell 
upon your pet or minion, it 
splits into three, each with 
its full complement of 
abilities. You must 
spend an Action 
making an Unopposed 
Animal Handling 
Skill Check to issue a new 
command to each one separately.
UPGRADES
Rank 5: Duration is 2 minutes per 
Rank.
Rank 10: Duration is 3 minutes per Rank.
Rank 1 5: When you command your pet or minion, the 
clockwork versions follow suit.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
203
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 32 / book page 204

```text
 
CONFUSING FOG
“Visibility reduced. Decision-making questionable.”
Passive
Mana Cost: 6
Range: 40 feet
Duration: Until the end of two full rounds of combat 
or 20 seconds
Cooldown: 15 minutes
You create a billowing cloud of fog that you, your party 
members, and friendly NPCs can see through, but it 
obscures the area from Mobs, making it more difficult 
for them to attack you. Mobs attack with Disadvantage 
(see Mob Advantage and Disadvantage, p. 60) against 
targets in the fog.
This fog fills a 25 × 25ft area. Smart Mobs may attempt 
to move the combat out of the fog if able.
UPGRADES
Rank 5: The fog fills a 50 × 50ft area, and its duration 
is 1 minute.
Rank 10: The fog fills a 100 × 100ft area and lasts for 
5 minutes.
Rank 1 5: The fog fills a 500 × 500ft area and lasts for 
15 minutes.
DIRT CLOD
“You have weaponized dirt.”
Attack, Bludgeoning
Mana Cost: 1
Range: 100 feet
AI Favor: 2
You hurl a magical clod of dirt, leaving dirt and pebbles 
strewn about near the target.
Base Damage: 1d2 + 
Int  Bludgeoning
UPGRADES
Rank 5: +2d2 base damage
Rank 10: +1d2 base damage, and the target gains the 
Woozy Debuff.
Rank 1 5: +1d2 base damage, and 1 Rank damage die.
DRAIN LIFE
“Organic tether deployed. Try not to think about 
where it’s been.”
Attack, Necrotic
Mana Cost: 14
Range: 30 feet
Limitations: For a brief instant, you create a disgust‑
ing blood vein that reaches out and wraps itself around 
your target.
Base Damage: 1d6 + 
Int  Necrotic
UPGRADES
Rank 5: +1d6 base damage, and if the target loses at 
least 3 Health Bar slots, you heal 1 Health Bar slot.
Rank 10: +1d6 base damage, and if you heal this way, 
heal +1 Health Bar slot.
Rank 1 5: +1d6 base damage, and if you heal this way, 
heal +1 Health Bar slot.
EARWORM
“Hitting every note except the right ones.”
Attack, Sonic, Charisma, Favored: Bard
Mana Cost: 6
Range: 30ft
Cooldown: Once per round.
Sing a terrible song targeting the ear holes of a victim. 
Yes, sing a few bars so the GM understands the pain 
you’re inflicting.
Base Damage: 1d6 + 
Cha  Sonic
UPGRADES
Rank 5: +1d6 base damage.
Rank 10: +1d6 base damage, and the target gains the 
Queasy Debuff.
Rank 1 5: +1d6 base damage and +10ft Splash.
FEAR
“Run away, little piggies!”
Attack, Mind Control
Mana Cost: 3
Range: 25 feet
Limitations: Warning: Scary
‑ass Mobs are immune to 
F
ear effects (GM’s discretion).
Target a non‑Boss Mob of half your le
vel or less. On a 
Standard Success, it stands its ground, but it loses its 
Dex  Mod for the duration of the combat. On a higher 
success, it uses two of its Actions during the next 
round to run away.
4
204
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 33 / book page 205

```text
 
1
UPGRADES
Rank 5: +5ft Blast radius.
Rank 10: +5ft Blast radius, and on a Critical Hit, the 
affected creatures gain the Paralyzed Debuff.
Rank 1 5: +5ft Blast radius.
FIREBALL
“It almost reluctantly meanders toward you. Then 
your world explodes.”
Attack, Fire, Area of Effect
Mana Cost: 45
Range: 80 feet
Cooldown: Once per scene
A creeping beach ball
‑sized sph
ere of fire emanates 
from you. Since it moves so slowly, your attack is 
made with Disadvantage. When the impact zone has 
been determined, each creature in a 10ft Blast radius 
takes full damage.
On Fail, roll 1d8 for direction (see Figure 3, p. 200). The 
amount the Skill Check missed by is the distance away 
in feet it impacts.
Base Damage: 1d12 + 
Int  Fire, 10ft Blast radius
UPGRADES
Rank 5: +1d12 base damage. Those who lose 1 or more 
Health Bar slots via this attack gain the Burned Debuff.
Rank 10: +1d12 base damage and becomes an 80ft 
Line attack (and keeps the Blast).
Rank 1 5: +1d12 base damage and +40ft Splash (on 
the Blast).
FIRE FINGERS
“Fire Fingers activated. Try not to make it weird.”
Attack, Fire
Mana Cost: 3
Range: Melee
AI Favor: 1
Brilliant flame leaps from your fingers.
Base Damage: 1d4 + 
Int  Fire
UPGRADES
Rank 5: +1d4 base damage.
Rank 10: +1d4 base damage, and the target gains the 
Burned Debuff.
Rank 1 5: +1d4 base damage, and your hands begin to 
intermittently burn. Your Pugilism, Unarmed Combat, 
and Slice Attack strikes add 1 Fire Fingers Rank dam‑
age die (Fire).
FROST SCAR
“Frigid status achieved; relationships may suffer.”
Attack, Ice
Mana Cost: 2
Range: Melee
AI Favor: 1
With a slice of your frigid hand, you leave a scar of 
rime on your target.
Base Damage: 1d4 + 
Int  Ice
UPGRADES
Rank 5: +1d4 base damage, and the target cannot 
heal themselves in the next combat round.
Rank 10: +1d4 base damage, and the target gains the 
Stiff Legs Debuff.
Rank 1 5: +1d4 base damage, and the target gains The 
Taint Debuff.
GRAND ILLUSION
“Why, yes, that is my pet T-Rex.”
Intelligence
Mana Cost: 7
Range: 40 feet
Duration: 2 minutes
Cooldown: 15 minutes
You create an illusion that might trick your foes.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
205
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 34 / book page 206

```text
 
Make a single Int ‑Opposed Spell Check vs. foes who 
can see it. Your same r
oll is used against foes who see 
it even after the casting round.
Mundane illusions seeking only to impress might be 
rolled with Advantage, while complex illusions seek‑
ing a specific response or images that suddenly pop 
up during combat might be rolled with Disadvantage 
(GM’s discretion).
On Success, they believe your illusion.
UPGRADES
Rank 5: Those who believe gain the Woozy Debuff or 
similar based on the desired response.
Rank 10: Those who believe also gain the Queasy 
Debuff or similar based on the desired response.
Rank 1 5: Those who believe also gain the Shocked 
Debuff or similar based on the desired response.
HEAL
“Congratulations on not dying… yet.”
Heal, Interrupt, Passive
Mana Cost: 2
Range: Self only
Limitations: Rank 1 maximum
Heal 2 Health Bar slots.
UPGRADES
None
HEAL CRITTER
“Your pet has been restored to 
maximum cuddle capacity.”
Heal, Interrupt, Passive
Mana Cost: 8
Range: 30 feet
Limitations: May only be cast on 
pets and minions (sorry, Donut).
The target glows as they heal 
back to 100% Health Bar.
UPGRADES
Rank 5: The target mends a 
Minor Injury Debuff.
Rank 10: The target mends 
a Major Injury Debuff.
Rank 1 5: The target 
regrows all lost appendages.
HEAL OTHERS
“Tell me you’re a Cleric without…”
Heal, Interrupt, Passive
Mana Cost: 6
Range: 30 feet
Limitations: You can’t cast this Spell on yourself, 
pets, or minions.
A wave of positive vibes engulfs the target. They heal 
1d4 Health Bar slots.
UPGRADES
Rank 5: The target heals 1d6 Health Bar slots.
Rank 10: The target heals 2d6 Health Bar slots.
Rank 1 5: Instead of a single target, all party members 
within a 20ft Burst radius are healed.
HEAL SELF
“Way easier than manually shoving your guts back in!”
Heal, Interrupt, Passive
Mana Cost: 1
Range: Self only
Limitations: You can only case this Spell on yourself.
You center yourself, using magic to make yourself 
whole. You heal 1d4 Health Bar slots.
UPGRADES
Rank 5: You heal 1d6 Health Bar slots and mend a 
Minor Injury, Poison, or Disease Debuff.
Rank 10: You heal 2d6 Health Bar slots and 
mend a Major Injury or other Debuff.
Rank 1 5: You heal to full and gain the 
benefits of a short rest.
HOLE
“It’s a hole. This will 
absolutely be misused.”
Passive
Mana Cost: 12
Range: 10 feet
Duration: Until the end of the 
combat or 5 minutes.
Limitations: Can’t be used 
on saferoom doors or 
living things.
4
206
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 35 / book page 207

```text
 
1
You create a temporary cylindrical hole in a surface 
or material within range, to a depth of 1 inch per Spell 
Rank and a diameter of 2ft. Anything that can fit in the 
hole can pass through it if the hole is deep enough to 
penetrate to the other side of the surface.
UPGRADES
Rank 5: You can reduce the diameter of the hole to a 
smaller size when cast.
Rank 10: You can widen the hole’s diameter by 1 inch 
for every inch of depth you sacrifice when cast.
Rank 1 5: The caster may end the spell with a thought 
(like an Interrupt, but it doesn’t cost an Action). Any‑
thing in the hole at that time is destroyed.
HOL Y AURA
“Look who’s all high and mighty.”
Attack, Holy, Area of Effect, Charisma, Favored: Cleric & 
Paladin
Mana Cost: 7
Range: 5ft Burst radius
Cooldown: Once per round
You channel your deity and emanate their essence to 
hurt only the enemies around you.
Base Damage: 1d4 + 
Cha  Holy, 5ft Burst radius
UPGRADES
Rank 5: +1d4 base damage, and affected undead 
Mobs take double damage.
Rank 10: +1d4 base damage and +5ft Burst radius.
Rank 1 5: +1d4 base damage and +5ft Burst radius.
HOT STUFF AURA
“Bask in the warm glow of my machismo!”
Passive, Area of Effect, Favored: Bard
Mana Cost: 8
Range: 5ft Burst radius
Duration: 2 rounds
Cooldown: 5 minutes
You create a shield of pure sex appeal around you 
against all damage types with a number of Health Bar 
slots equal to your 
Cha  Mod, and a 2 in each slot. It 
also protects all allies within the radius. When deplet‑
ed, it disappears. These slots cannot be healed.
UPGRADES
Rank 5: Increase the Health to 4 in each slot.
Rank 10: +5ft Burst radius, with a 6 in each slot.
Rank 1 5: +10ft Burst radius, with a 8 in each slot.
ICE BLAST
“Hope they brought a jacket.”
Attack, Ice
Mana Cost: 9
Range: 40 feet
With the howl of blizzard winds, you let loose a com‑
pact pocket of freezing cold and ice.
Base Damage: 1d8 + 
Int  Ice
UPGRADES
Rank 5: +1d8 base damage.
Rank 10: +1d8 base damage, and the target is pushed 
10 feet away from you.
Rank 1 5: +1d8 base damage, and you can change the 
range to a 15ft Cone Attack.
ICICLES
“Did you know that icicles are the #1 cause of home 
head impalements?”
Attack, Ice
Mana Cost: 19
Range: 60 feet
Seizing upon the ice that runs through your veins, 
icicle projectiles shoot forth from your palms towards 
distant foes.
Base Damage: 1d12 + 
Int  Ice
UPGRADES
Rank 5: +1d12 base damage.
Rank 10: +1d12 base damage, and the target gains 
the Stiff Legs Debuff.
Rank 1 5: +1d12 base damage, and the damage is 
Armor
‑Piercing.
“It’s pretty cool. I saw 
you shooting icicles 
out of your hand.”
—Carl
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
207
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 36 / book page 208

```text
 
INTIMATE TOUCHES
“Show me on the doll where they healed you.”
Heal, Passive, Favored: Cleric & Paladin
Mana Cost: 8
Range: 5 feet
Limitations: Unlike most healing, this spell is not an 
Interrupt.
You lay hands on the target (which could be you), who 
heals Health Bar slots equal to your 
Cha  Mod.
UPGRADES
Rank 5: The target also heals a Minor Injury Debuff.
Rank 10: The target also heals a Major Injury Debuff.
Rank 1 5: The target also heals all Poison & Disease 
Debuffs.
LIGHTNING BOLT
“Bolt released, viewership spike detected.”
Attack, Electric
Mana Cost: 15
Range: 100 feet
With a thunderous clap, you let loose a bolt of lightning.
Base Damage: 1d10 + 
Int  Electric
UPGRADES
Rank 5: +1d10 base damage.
Rank 10: +1d10 base damage and becomes a 100ft 
Line Attack.
Rank 1 5: +1d10 base damage. The lightning bolt 
forks, and you may choose to apply your Attack 
against any number of additional targets within 15 
feet of the previous target (within the range limit). 
Each successful Attack (including against the primary 
target), deals half damage.
MAGIC MISSILE
“Standard Spell detected. Viewers appreciate the 
nostalgia.”
Attack, Force
Mana Cost: 5
Range: Within your line of sight
AI Favor: 1
From glowing eyes, fingers, or whatever, a streak of 
pure force shoots out.
Base Damage: 1d4 + 
Int  Force
UPGRADES
Rank 5: +1d4 base damage, and you can cast the 
Spell at a higher or lower Mana cost.
3 Mana: −4 damage
4 Mana: −2 damage
6 Mana: Add 1 Rank damage die
Rank 10: +1d4 base damage, and the missiles deal 
Force and Fire damage. The target gains the Burned 
Debuff.
Rank 1 5: This attack deals base damage ×3.
MIND TICKLE
“Don’t think of an elephant.”
Attack, Psychic, Charisma, Favored: Cleric
Mana Cost: 2
Range: 40 feet
AI Favor: 2
You infect your target with a small headache.
Base Damage: 1d2 + 
Cha  Psychic
UPGRADES
Rank 5: +1d2 base damage.
Rank 10: +1d2 base damage, and the target gains the 
Sore as Shit Debuff.
Rank 1 5: +1d2 base damage, and the target gains the 
Muted Debuff.
4
208
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 37 / book page 209

```text
 
1
MINION ARMY
“No army can triumph when subjected to 
internecine conflict.”
Intelligence, Area of Effect, Mind Control
Mana Cost: 50
Range: 50ft Burst radius
Duration: 2 minutes
Cooldown: 5 hours
Limitations: 5
‑minute casting time, and the caster 
cannot mo
ve while casting. Only works against Mobs 
with an Intelligence of 2+.
When you cast this spell, choose a target within range. 
On a Standard Success, 1 in 50 Mobs in the affected 
area (min 1) become an ally and fight for you without 
needing to command them. Higher levels of success 
can turn additional Mobs into allies (GM’s discretion).
UPGRADES
Rank 5: The casting time is 4 minutes. Duration is 5 
minutes.
Rank 10: Add your Charisma Stat to the Burst radius. 
Duration is 10 minutes.
Rank 1 5: Add your Charisma Stat to the Burst radius. 
Duration is 15 minutes.
NATURE’S BREATH
“This recycled dungeon air is bad for my 
complexion.”
Heal, Interrupt, Passive, Favored: Druid
Mana Cost: 6
Range: 5 feet
You blow cool, fresh air over the target’s wounds (could 
be yourself), healing them. Roll a Nature’s Breath Rank 
damage die. That is how many Health Bar slots the 
target heals. May also target pets and minions.
UPGRADES
Rank 5: Add 1 to your die roll.
Rank 10: Add 1 to your die roll, and remove a Minor 
Injury Debuff.
Rank 1 5: Add 1 to your die roll, and remove a Major 
Injury Debuff.
OAKHIDE
“My bark is worse than my bite.”
Passive, Favored: Druid
Mana Cost: 5
Range: Self
Duration: 2 minutes
Cooldown: 10 minutes
Your skin turns into solid wood, giving you great 
protection. You have +2 Damage Resistance for the 
duration of this spell.
UPGRADES
Rank 5: +2 DR. Duration is 3 minutes.
Rank 10: +2 DR. You may target party members and 
NPCs up to 10 feet away with this spell.
Rank 1 5: +2 DR. Duration is 4 minutes.
PALADIN’S SMITE
“Repent or die!”
Attack, Holy, Charisma, Favored: Paladin
Mana Cost: 11
Range: 30 feet
You channel a torrent of divine wrath toward a soon
‑
to‑be repentant f
oe.
Base Damage: 1d8 + Cha  Holy
UPGRADES
Rank 5: +1d8 base damage.
Rank 10: +1d8 base damage, and the target gains the 
Take Down Debuff.
Rank 1 5: +1d8 base damage, and the damage is Ar‑
mor
‑Piercing (ignor
es DR).
PANTY DROPPER
“You know what’s on the menu? Me-n-u.”
Charisma, Mind Control, Favored: Bard
Mana Cost: 10
Range: 10 feet
Duration: 2 minutes or until you finish
Cooldown: 5 minutes
Make an 
Int ‑Opposed Spell Check against a non‑Boss 
target, even in combat
. Fighting’s just another form of 
penetration, after all.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
209
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 38 / book page 210

```text
 
On Success, the target wants to jump your bones and 
won’t let anyone stop them (they cease attacking or 
doing other things).
UPGRADES
Rank 5: The duration is 5 minutes.
Rank 10: The duration is 10 minutes.
Rank 1 5: The duration is 15 minutes.
PING
“Here piggy, piggy.”
Passive, Area of Effect
Mana Cost: 5
Range: 1 mile Burst radius
Cooldown: 5 minutes
Sends out an audible ping that gives the distance and 
location of all non
‑cra
wlers and non‑red‑tagged Mobs 
in a circle ar
ound you. It will mark targets beyond the 
range of your map. You receive information about the 
Mobs that is “somewhat complete.”
Targets hit with Ping will hear an audible ping noise, 
but they will not know where the ping originated. 
Environmental factors and obstacles may increase or 
decrease range.
UPGRADES
Rank 5: If you know the Fear Spell (see p. 204), you 
may cast it at no Action cost to affect all eligible Mobs 
within the Ping range. You only pay the Mana.
Rank 10: Environmental factors and obstacles no 
longer decrease the range, and you receive “mostly 
complete” information.
Rank 1 5: You pay no Mana to add the Fear Spell, and 
you receive “entirely complete” information.
PROTECTIVE SHELL
“Hope activated. Try not to waste it.”
Interrupt, Passive, Area of Effect
Mana Cost: None
Range: 10ft Burst radius
Duration: 5 seconds (only long enough to push foes 
away and protect against a single physical attack)
Cooldown: 30 hours
Limitations: Spell must be imbued onto something 
you are wearing. The shell cannot be moved by any 
means.
You create a 10 + Int ‑foot Burst radius magic shell 
around yourself and nearby par
ty members.
This shell pushes away all Mobs in its Area, which is 
the shell’s radius + 5ft. Mobs cannot enter the shell 
(unless non
‑corporeal) or ph
ysically attack those in‑
side. The shell does not protect against magic effects. 
Crawlers inside may attack as usual.
UPGRADES
Rank 5: Duration is 10 seconds. In addition to knock‑
ing enemies away, it protects the occupants from all 
non
‑Spell attack
s originating from outside the shell 
until the end of the current combat round.
Rank 10: Duration is 20 seconds or two rounds.
Rank 1 5: Duration is 30 seconds or three rounds.
PUDDLE JUMPER
“Teleportation doesn’t suck.”
Passive
Mana Cost: 20
Range: Line
‑of‑sight to th
e destination surface
Limitations: There is a 10‑second delay bef
ore the 
effect takes place.
Cooldown: 5 hours
You and up to 3 party members of your choice teleport 
to another location. Everyone feels a tingling sensation 
while waiting for the effect to resolve.
4
210
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 39 / book page 211

```text
 
1
UPGRADES
Rank 5: The delay is 2 seconds, and the destination 
doesn’t have to be a surface.
Rank 10: The delay is 1 second, and the destination 
can be anywhere within 1,000 yards in any direction, 
even if the exact destination cannot be seen.
Rank 1 5: There is no delay, and the destination can 
be anywhere within 1 mile in any direction, even if the 
exact destination cannot be seen.
RISE, DEAD MINION!
“The bigger they are, the deeper they’re buried.”
Attack, Favored: Necromancer
Mana Cost: 10
Range: 30 feet
Duration: 1 round
At your command, a Medium (4) size skeleton emerges 
from the ground to attack your foe in melee combat, 
dealing 1d8 + 
Int  Necrotic damage. After the Attack, 
the skeleton collapses, creating difficult terrain in the 
space it occupied.
UPGRADES
Rank 5: The skeleton attacks twice before collapsing.
Rank 10: The skeleton increases to size Large (5), and 
its Attack range is 10 feet. +1d8 base damage.
Rank 1 5: The skeleton increases to size Colossal (7), 
and its Attack range is 15 feet. Add one Rise, Dead 
Minion! Rank damage die to the damage.
ROOTFOOT
“The ground is never empty. It is only sleeping.”
Attack, Favored: Druid
Mana Cost: 5
Range: 30 feet
Duration: 2 rounds
Roots reach up from the ground to ensnare a victim of 
up to Size 4 (Medium).
On Success, the victim gains the Held Debuff. The 
Rank of this Spell is used in the Opposed Difficulty to 
escape, instead of the default 
Str .
UPGRADES
Rank 5: Can target victims up to size Large (5). 
Duration is 3 rounds.
Rank 10: Can target victims up to size Huge (6). 
Duration is 4 rounds.
Rank 1 5: Can target victims up to size Colossal (7). 
The victim also gains the Poisoned Debuff.
SECOND CHANCE
“Everyone deserves one. Except for Phil. Never Phil.”
Passive
Mana Cost: 10
Range: 10 feet
Duration: 1 minute
You raise a Mob with a level lower than your own from 
the dead. The Mob temporarily becomes your Undead 
Minion with half of its original Health Bar slots.
You spend one Action to command it, then it acts 
independently with 1 Move Action and 1 other Action 
(usually an Attack) until given new instructions.
UPGRADES
Rank 5: The Mob can be up to 5 levels higher than 
you, and the duration is 5 minutes.
Rank 10: The Mob can be up to 10 levels higher than 
the caster, with a duration of 15 minutes.
Rank 1 5: The Mob can be up to 15 levels higher than 
the caster, with a duration of 45 minutes.
SHIELD
“Enjoy the illusion of safety.”
Interrupt, Passive
Mana Cost: 8
Range: Self
Duration: 5 minutes
You are surrounded by a translucent force field that 
moves with you and reduces non
‑magic damage you 
take. T
he Shield has 2 Health Bar slots, each with your 
Con  Mod. When you take damage, reduce these Health 
Bar slots first. The Spell ends early if the shield loses all 
its Health Bar slots. You can’t heal a Shield.
UPGRADES
Rank 5: The Shield has 5 Health Bar slots.
Rank 10: The Shield has 10 Health Bar slots.
Rank 1 5: The Shield has 15 Health Bar slots.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
211
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 40 / book page 212

```text
 
SHOCK TREATMENT
“Electrical therapy initiated; consent not required.”
Attack, Electric
Mana Cost: 2
Range: 30 feet
AI Favor: 2
Like a deranged emperor, bolts of electricity shoot out 
from your fingers.
Base Damage: 1d2 + 
Int  Electric
UPGRADES
Rank 5: +1d2 base damage, and you may choose to 
afflict the target with the Stunned Debuff instead of 
dealing damage.
Rank 10: +1d2 base damage, and add 1 Rank damage 
die (Electric) at the end of the round.
Rank 1 5: +1d2 base damage, and if you make this 
attack at melee range, you deal ×5 the total damage.
SOLSPLASH
“The sun is merely a star close enough to hate us.”
Attack, Fire, Constitution, Favored: Druid
Mana Cost: 13
Range: 30 feet
Beams of concentrated “sunlight” fall upon the victim 
and those around them. Sunscreen’s not gonna help.
Base Damage: 1d8 + 
Con  Fire
UPGRADES
Rank 5: +1d8 base damage, +5ft Splash.
Rank 10: +1d8 base damage and +10ft Splash. Each 
affected entity who loses at least 3 Health Bar slots 
this way gains the Burned Debuff.
Rank 1 5: +1d8 base damage and +15ft Splash.
SOUL COLLECTOR
“This soul appears… reusable.”
Attack, Necrotic
Mana Cost: 4
Range: 50 feet
AI Favor: 1
With a twist of your hand, you siphon the spirit from 
your target.
Base Damage: 1d4 + 
Int  Necrotic
UPGRADES
Rank 5: +1d4 base damage, and if this Spell deals the 
killing blow to a foe of at least half your level, it deals 
+1 bonus damage until you complete a long rest. This 
damage bonus is cumulative up to the Spell’s Rank.
Rank 10: +1d4 base damage, and the bonus contin‑
ues for one week.
Rank 1 5: +1d4 base damage, and the bonus contin‑
ues for as long as you remain on your current floor.
THUNDERLASH
“Loud noises and bad decisions go hand-in-hand.”
Attack, Sonic
Mana Cost: 12
Range: 50 feet
You unleash a whip
‑like emanation of pur
e sound 
which thunders through the air.
Base Damage: 1d10 + 
Int  Sonic
UPGRADES
Rank 5: +1d10 base damage.
Rank 10: +1d10 base damage, and this attack deals 
Armor
‑Piercing damage (ignor
es DR).
Rank 1 5: +1d10 base damage, and you can change 
the range to a 15ft Cone attack.
TORCH
“Congratulations. You can now see what’s trying to 
kill you.”
Passive
Mana Cost: 1
Range: Self
Duration: Until you enter a saferoom or descend to a 
new floor.
You create a magical orb of light that follows slightly 
above and behind you. It provides bright light for a 20ft 
radius and dim light for a 20ft radius past that.
UPGRADES
Rank 5: You can move the orb up to 20 feet away 
from you.
Rank 10: You can move the orb up to 60 feet away 
from you and can double the radius of the brightness 
with a thought.
Rank 1 5: You can move the orb up to 100 feet away 
from you and attach it to a surface as an Action.
4
212
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 41 / book page 213

```text
 
1
TRIPPER
“Let’s see if they know we’re coming.”
Passive, Area of Effect
Mana Cost: None
Range: 30ft Burst radius
Limitations: Does not detonate traps with very specif‑
ic triggers. Must be imbued onto something you are 
wearing.
Cooldown: 5 hours
With a snap of your fingers, every movement, heat, 
and weight
‑triggered tr
ap in the area “goes off.” 
Blades swing, bombs blow, and creatures are released.
UPGRADES
Rank 5: +Intelligence Burst radius.
Rank 10: +Intelligence Burst radius.
Rank 1 5: +Intelligence Burst radius, and all damage 
taken is considered Splash (half damage).
TURN UNDEAD
“What is dead should stay dead… and far away.”
Attack, Area of Effect, Favored: Bard, Cleric, & Paladin
Mana Cost: 9
Range: 10ft Cone
Duration: 3 rounds
Limitations: Does not work against Bosses.
Cooldown: 5 minutes
Make a single 
Cha ‑Opposed Spell Check vs. the Un‑
dead Mobs in the affected ar
ea.
On Success, the Undead Mob runs away for the dura‑
tion of the Spell.
UPGRADES
Rank 5: +5ft Cone. Duration is 5 rounds.
Rank 10: +10ft Cone. Duration is 10 rounds.
Rank 1 5: +15ft Cone. Duration is 15 rounds. On an 
Amazing Success or better, the Undead Mob is de‑
stroyed.
TWINKLE TOES
“Fly my pretties, fly!”
Intelligence, Passive
Mana Cost: 2
Range: 5 feet
Duration: A number of seconds equal to your 
Intelligence.
Target a pet or minion within range. It has Move ×2 for 
the duration.
UPGRADES
Rank 5: The pet or minion has Move ×3 for the duration.
Rank 10: The pet or minion has Move ×4 for the duration.
Rank 1 5: The pet or minion has Move ×5 for the duration.
UNNECESSARY FORCE
“Excessive force authorized. Paperwork waived.”
Attack, Force
Mana Cost: 13
Range: 40 feet
A shockwave akin to that of an A
‑bomb crash
es over 
your target.
Base Damage: 1d12 + 
Int  Force
UPGRADES
Rank 5: +1d12 base damage.
Rank 10: +1d12 base damage, and the target is 
pushed 10 feet.
Rank 1 5: +1d12 base damage, and the target is 
pushed 15 feet.
VINE PORN
“It’s like tentacle porn, but with vines… sorry, Mom.”
Attack, Piercing, Constitution, Favored: Druid
Mana Cost: 3
Range: 20 feet
AI Favor: 1
Magical vines with pulsating veins shoot up from the 
ground or sprout from the target’s own body to rip and 
tear and smack them around a bit.
Base Damage: 1d4 + 
Con  Piercing
UPGRADES
Rank 5: +1d4 base damage.
Rank 10: +1d4 base damage, and this Attack deals 
Armor
‑Piercing damage (ignor
es DR).
Rank 1 5: +1d4 base damage. On a Critical Hit, the 
target takes ×4 damage.
4CHAPTER 4: SKILLS, SPELLS, & GEARCHAPTER 4: SKILLS, SPELLS, & GEAR
213
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


## PDF page 42 / book page 214

```text
 
WALL OF FIRE
“You’re gonna fall in… to a burnin’ ring of fire.”
Passive, Fire
Mana Cost: 15
Range: 30 feet
Duration: 2 rounds
Creates a 30ft
‑long × 7ft‑high × 2f
t‑thick w
all of fire.
Base Damage: 1d2 Fire for every 1ft of wall the victim 
passes through, and they gain the Burned Debuff.
UPGRADES
Rank 5: +1d2 base damage. The wall can be turned 
into a ring of fire. Duration is 5 rounds.
Rank 10: +1d2 base damage. Creates a 50ft‑long × 
10f
t‑high × 3f
t‑thick w
all. Duration is 10 rounds.
Rank 1 5: +1d2 base damage. Creates a 100ft‑long × 
20ft‑high × 5f
t‑thick w
all. Duration is 15 rounds.
WATER BREATHING
“It’s okay to inhale.”
Intelligence, Passive
Mana Cost: 2
Range: Self
Duration: A number of seconds equal to the caster’s 
Intelligence ×3.
The target can breathe underwater without issue.
UPGRADES
Rank 5: You may now cast this upon others at a range 
of 5 feet.
Rank 10: The targets roll Swimming Skill Checks with 
Advantage.
Rank 1 5: You can target any or all individuals within a 
15ft Burst radius.
WEB
“Blast your goo onto foes!”
Attack, Intelligence
Mana Cost: 6
Range: 20ft Cone
Duration: 2 rounds
A cone of sticky webbing shoots from your fingers.
Make a single Spell Attack Skill Check vs. each friend 
and foe’s Evade (if any).
On Success, that entity gains the Held Debuff. The 
Rank of this spell is used in the Opposed Difficulty to 
escape, instead of 
Str .
UPGRADES
Rank 5: +5ft Cone. Duration is 5 rounds.
Rank 10: +5ft Cone. Duration is 10 rounds.
Rank 1 5: +5ft Cone. Duration is 15 rounds.
WILBUR’S SLOW-BUILD FIREBLAST
“Hold. Hold! HOLD!”
Attack, Fire
Mana Cost: 60
Range: 50 feet
Base Damage: 1d8 + 
Int  Fire, and the target gains the 
Burned Debuff.
This Spell can be cast and held as a swirling ring of fire 
around your ring finger until you unleash it. Only one ring 
may be held at a time. The next time you perform an Attack 
Action, it must be this Spell (at no additional Mana cost).
If anyone touches the ring with the intent to diffuse it (you 
may oppose that Action), the Attack hits them for half dam‑
age. The appendage they touched you with smolders, use‑
less for a number of rounds equal to the damage inflicted.
UPGRADES
Rank 5: +1d8 base damage. For each full day you hold 
the spell, +1d8 Fire damage.
Rank 10: +1d8 base damage and +5ft Splash.
Rank 1 5: +1d8 base damage and +5ft Splash.
WISP ARMOR
“Empty minds are surprisingly easy to protect.”
Passive
Mana Cost: 5
Range: Self
Duration: 5 minutes
Cooldown: 5 minutes
You conjure a protective barrier that reduces all magic 
damage (typically Spells) down to its Rank 1 base dam‑
age (1 die + Stat Mod) without any Upgrades or other bo‑
nuses. This Spell also makes you immune to Mind Control.
UPGRADES
Rank 5: The duration is 10 minutes.
Rank 10: The duration is 15 minutes.
Rank 1 5: The duration is 20 minutes.
4
214
Copyright Renegade Game Studios. Unauthorized distribution prohibited. 08/25/2026.
```


# Appendix C: Partial authored source snapshot

This snapshot is unfinished, unaudited code. Requirements in the main handoff take precedence over stale implementation, especially crawler-number generation. `app.js` and the PDF exporter are absent.


## `dist/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Choose your crawler's background, skills and stats using only the supplied Dungeon Crawler Carl character creation excerpt. Download your fillable character sheet.">
<title>Crawler Intake | Character Creator</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='5' fill='%23121518'/%3E%3Cpath d='M8 8h16v5H13v6h11v5H8z' fill='%23f3bd42'/%3E%3C/svg%3E">
<link rel="stylesheet" href="style.css">
<script src="vendor/pdf-lib.min.js" defer></script><script type="module" src="app.js"></script>
</head>
<body>
<header><a class="brand" href="./"><span class="brand-mark">C/</span><span>CRAWLER INTAKE<small>DUNGEON CRAWLER CARL · CHARACTER CREATOR</small></span></a><span class="source-tag">SOURCE-BOUND <span>•</span> PLAYER-CHOSEN</span></header>
<div class="shell"><nav aria-label="Creation steps" id="steps"></nav><main id="main" tabindex="-1"></main><aside id="summary" aria-label="Crawler summary"></aside></div>
<footer><span>YOUR WORLD ENDED. YOUR STORY DIDN’T.</span><span>Unofficial character tool · Rules limited to your supplied excerpt</span></footer>
<div id="notice" role="status" aria-live="polite"></div>
</body></html>

```


## `dist/style.css`

```css
@import url('');
:root{color-scheme:dark;--bg:#101315;--panel:#191d20;--line:#343a3e;--muted:#a7afb3;--text:#f0f1ed;--gold:#f3bd42;--mint:#9fdac2;--red:#ff9990;font-family:Arial,Helvetica,sans-serif;font-size:16px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);line-height:1.55}button,input,select,textarea{font:inherit}button,a,input,select,textarea{outline-offset:4px}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.45}a{color:var(--gold)}header{min-height:105px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:24px 4%;gap:20px}.brand{display:flex;align-items:center;gap:14px;color:var(--text);text-decoration:none;font-weight:800;letter-spacing:.07em}.brand-mark{background:var(--gold);color:var(--bg);font-size:30px;padding:0 12px;transform:skew(-5deg)}.brand small{display:block;color:var(--muted);font-size:11px;letter-spacing:.12em;margin-top:4px}.source-tag{font:12px monospace;letter-spacing:.08em;color:var(--muted)}.source-tag span{color:var(--gold);padding:0 8px}.shell{max-width:1530px;margin:auto;display:grid;grid-template-columns:210px minmax(0,1fr) 290px;gap:38px;padding:42px 4% 70px}nav{display:flex;flex-direction:column;gap:10px}nav .nav-heading{font:12px monospace;letter-spacing:.14em;color:var(--muted);margin:0 0 20px}nav button{background:transparent;border:1px solid transparent;color:var(--muted);text-align:left;padding:13px 10px;display:flex;gap:12px;align-items:center;border-radius:4px}nav button.active{border-color:#68522c;background:#29251b;color:var(--gold)}nav button span{font:13px monospace}nav button.done span{color:var(--mint)}.nav-note{margin-top:28px;padding:18px 10px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}.eyebrow{font:12px monospace;color:var(--gold);letter-spacing:.13em;margin:0 0 12px}h1{font-family:'Arial Narrow',Impact,sans-serif;font-stretch:condensed;font-size:clamp(32px,3.7vw,52px);font-weight:800;line-height:1.08;letter-spacing:-.02em;margin:0 0 16px}h2{font-size:20px;margin:0 0 14px}h3{font-size:16px;margin:0}.intro{color:var(--muted);margin:0 0 28px;max-width:620px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:24px;margin:20px 0}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.panel-head h2{margin:0}.ref{font:12px monospace;color:var(--muted);white-space:nowrap}.fields{display:grid;grid-template-columns:1fr 1fr;gap:18px}.field{display:flex;flex-direction:column;gap:7px;margin:0 0 16px}.field label,.label{font-size:14px;font-weight:600}.field small{color:var(--muted);font-size:13px}input,select,textarea{width:100%;background:#111518;border:1px solid #485057;border-radius:4px;color:var(--text);padding:11px 12px;min-height:46px}textarea{resize:vertical;min-height:90px}input:focus,select:focus,textarea:focus{border-color:var(--gold)}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.choice{background:#161a1d;border:1px solid var(--line);border-radius:5px;padding:20px;text-align:left;color:var(--text);transition:border-color .15s,background .15s}.choice:hover{border-color:#a3946d}.choice[aria-pressed=true]{border-color:var(--gold);background:#302a1c;box-shadow:inset 3px 0 var(--gold)}.choice strong{display:block;font-size:18px;margin-bottom:5px}.choice small{display:block;color:var(--muted);font-size:14px;line-height:1.5}.choice .symbol{display:block;color:var(--gold);font:24px monospace;margin-bottom:18px}.callout{border-left:3px solid var(--gold);background:#26241d;padding:15px 18px;color:#e1d3ac;font-size:14px;margin:22px 0}.callout a{color:inherit}.check{display:flex;gap:10px;align-items:flex-start;font-size:14px;margin:12px 0}.check input{width:19px;min-height:19px;margin-top:3px;accent-color:var(--gold)}.actions{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:30px;border-top:1px solid var(--line);padding-top:24px}.primary,.secondary{border:1px solid var(--line);border-radius:4px;padding:12px 20px;font-weight:700}.primary{background:var(--gold);color:#171915;border-color:var(--gold)}.secondary{background:transparent;color:var(--text)}.primary:hover{background:#ffce65}.secondary:hover{border-color:var(--gold)}.source-box{margin-top:24px;color:var(--muted);font-size:13px}.source-box summary{cursor:pointer;color:var(--text)}aside{position:sticky;top:25px;align-self:start;background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--gold);border-radius:5px;padding:22px}.aside-top{font:12px monospace;letter-spacing:.12em;color:var(--gold)}.crawler-name{font-size:26px;font-weight:700;line-height:1.2;overflow-wrap:anywhere;margin:16px 0 5px}.muted{color:var(--muted)}.micro{font-size:13px}.stat-strip{display:grid;grid-template-columns:repeat(5,1fr);border-block:1px solid var(--line);padding:18px 0;margin:22px 0;gap:4px;text-align:center}.stat-strip small{display:block;font:11px monospace;color:var(--muted)}.stat-strip b{font-size:22px}.meter{display:flex;gap:3px;margin:10px 0 20px}.meter i{flex:1;height:8px;background:#39443f}.meter.ready i{background:var(--mint)}dl{margin:0}dl div{display:flex;justify-content:space-between;gap:12px;margin:9px 0;font-size:14px}dt{color:var(--muted)}dd{margin:0;font-weight:700}.divider{border-top:1px solid var(--line);margin:20px 0}.tag{font:12px monospace;padding:4px 7px;border:1px solid #57533d;color:var(--gold);border-radius:3px}.skill-picks{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.skill-picks button{padding:10px 13px;background:#14181a;border:1px solid var(--line);border-radius:4px;color:var(--text);font-size:14px}.skill-picks button[aria-pressed=true]{color:var(--mint);border-color:var(--mint);background:#1d3029}.skill-picks small{color:var(--muted);margin-left:8px}.bg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.bg-grid .choice{padding:12px;font-size:14px}.bg-grid .choice strong{font-size:14px}.bg-grid .choice small{font-size:12px}.stage-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}.stage-tabs button{border:1px solid var(--line);background:transparent;color:var(--muted);padding:9px 12px;border-radius:3px}.stage-tabs button.active{background:var(--gold);color:var(--bg)}.stat-row{display:grid;grid-template-columns:1fr 100px 80px;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--line)}.stat-row:last-child{border:0}.stat-row b{color:var(--gold);text-align:center}.stat-row small{display:block;color:var(--muted);font-size:13px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:10px 8px}th{color:var(--muted);font-weight:400}.table-wrap{overflow:auto}.issues{padding-left:20px;color:#efc8a0;font-size:14px}.success{color:var(--mint)}.error{color:var(--red)}.hotlist-row{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;margin:10px 0}.hotlist-row span{font:14px monospace;color:var(--gold);padding-top:12px}footer{border-top:1px solid var(--line);padding:22px 4%;display:flex;justify-content:space-between;gap:20px;font:11px monospace;color:var(--muted)}#notice:not(:empty){position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--gold);color:#111;padding:14px 22px;border-radius:4px;max-width:90vw;z-index:5}button:focus-visible,a:focus-visible{outline:2px solid var(--gold)}@media(max-width:1150px){.shell{grid-template-columns:160px minmax(0,1fr);gap:26px}aside{grid-column:2;position:static}.bg-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){header{padding:20px}.source-tag{display:none}.shell{display:flex;flex-direction:column;padding:22px 20px 40px;gap:25px}nav{flex-direction:row;overflow-x:auto;gap:6px}nav button{white-space:nowrap;padding:10px}.nav-heading,.nav-note{display:none}h1{font-size:38px}.panel{padding:18px}.fields{grid-template-columns:1fr;gap:0}.cards{gap:8px}.choice{padding:15px}.choice strong{font-size:16px}.stat-row{grid-template-columns:1fr 80px 55px;gap:8px}footer{flex-direction:column}.brand small{font-size:9px}.brand{font-size:14px}.actions{flex-wrap:wrap}aside{width:100%}}

```


## `dist/rules.js`

```javascript
import {attacks,utilitySkills,damageEffects} from './details.js';
// Sources: character-generation-rules.pdf (pp.101–115) and skills-and-spells.pdf (pp.173–214).
// Keep individual table Stat associations: the source varies by background.
const parse=(rows)=>rows.trim().split('\n').map(row=>{const [name,...skills]=row.split('|');return {name,skills:skills.map(s=>{const [name,stat]=s.split(':');return {name,stat};})};});
export const backgrounds={
human:[
{name:'Childhood',rank:1,page:104,table:12,options:parse(`Latchkey Kid|Streetwise:Cha|Perception:Int|Stealth:Dex
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
Wild Child|Stealth:Dex|Survival:Con|Running:Dex`)},
{name:'Adolescence',rank:1,page:105,table:13,options:parse(`Family Farm|Animal Handling:Cha|Fabricate:Int|Tracking:Int
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
Weirdo|Streetwise:Cha|Intimidate:Str|Fabricate:Int`)},
{name:'Career',rank:3,page:105,table:14,options:parse(`Criminal|Deception:Cha|Stealth:Dex|Streetwise:Cha
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
Military|Handgun:Dex|Survival:Con|Tactics:Int`)},
{name:'Hobby',rank:2,page:106,table:15,options:parse(`Collector|Fabricate:Int|Determine Value:None|Investigation:Int
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
Travel|Endurance:Con|Negotiation:Cha|Streetwise:Cha`)}],
animal:[
{name:'Youth',rank:1,page:106,table:16,options:parse(`Abandoned|Hide in Shadows:Dex|Endurance:Con|Survival:Con
Farmed|Escape Artist:Dex|Climbing:Str|Light on Your Feet:Dex
Litter-Raised|Animal Handling:Cha|Detect Lies:Int|Back Claw:Str
Pampered|Negotiation:Cha|Good First Impression:Cha|Persuasion:Cha
Runt|Hide in Shadows:Dex|Escape Artist:Dex|Stealth:Dex
Stray|Back Claw:Str|Streetwise:Cha|Survival:Con`)},
{name:'Training',rank:1,page:107,table:17,options:parse(`Clever|Investigation:Int|Detect Lies:Int|Dodge:None
Free Range|Escape Artist:Dex|Survival:Con|Tracking:Int
Pack Mentality|Animal Handling:Cha|Persuasion:Cha|Tactics:Int
Mischievous|Deception:Cha|Persuasion:Cha|Sleight of Hand:Dex
Watcher|Ambush:Int|Investigation:Int|Perception:Int
Well-Trained|Light on Your Feet:Dex|Catcher:None|Performance:Cha`)},
{name:'Adult',rank:3,page:107,table:19,options:parse(`Guard|Catcher:None|Perception:Int|Taunt:Cha
Pile of Floof|Escape Artist:Dex|Deception:Cha|Persuasion:Cha
Scrapper|Light on Your Feet:Dex|Streetwise:Cha|Survival:Con
Show Animal|Good First Impression:Cha|Light on Your Feet:Dex|Performance:Cha
Support Animal|Determine Value:None|First Aid:Int|Perception:Int
Working|Animal Handling:Cha|Endurance:Con|Perception:Int`)},
{name:'Quirk',rank:2,page:107,table:18,options:parse(`Chow Hound|Dumpster Diving:Int|Investigation:Int|Intimidate:Str
Cuddly|Good First Impression:Cha|Persuasion:Cha|Negotiation:Cha
Curious|Climbing:Str|Perception:Int|Swimming:Str
Hunter|Hide in Shadows:Dex|Stealth:Dex|Tracking:Int
Playful|Persuasion:Cha|Dodge:None|Intimidate:Str
Social|Animal Handling:Cha|Taunt:Cha|Perception:Int`)}]
};
export const weapons=['Club','Improvised Weapons','Warhammer','Axe','Dagger','Longsword','Rapier','Bow','Crossbow','Handgun','Shotgun','Javelin','Shuriken','Slingshot','Herding Weapons','Lance','Polearm','Quarterstaff'];
export const spells=['Dirt Clod','Fire Fingers','Frost Scar','Mind Tickle','Shock Treatment','Soul Collector','Vine Porn'];
export const handToHand={'Pugilism':'Iron Punch','Foot Soldier':'Smush','Noggin Nocker':'Skullcracker','Wrasslin’':'Toss'};
export const stats=['Str','Int','Con','Dex','Cha'];
export const statNames=['Strength','Intelligence','Constitution','Dexterity','Charisma'];
export function mod(v){if(!Number.isFinite(v)||v<1)return null;return [2,5,9,19,49,99,149,199,299,Infinity].findIndex(max=>v<=max)+1;}
export function initialState(){return {name:'',number:'',pronouns:'',kind:'',species:'',size:'',animalPermission:false,backgrounds:Array.from({length:4},()=>({option:null,picks:[]})),combatType:'',combat:'',customWeapon:'',stats:{Str:'',Int:'',Con:'',Dex:'',Cha:''},healSlot:'',spellSlot:'',potionsSlot:'',weaponLocation:'',performance:'',rulings:{},rulingsApproved:false,story:{trauma:'',looseEnd:'',regret:''},clothing:{Head:'',Torso:'',Arms:'',Legs:'',Feet:''},items:[{name:'',qty:1,kind:'useful',location:'inventory'}],gearApproved:false,handEffectApproved:false,acknowledged:false};}
export function selectedSkills(s){return (backgrounds[s.kind]||[]).flatMap((stage,i)=>{const sel=s.backgrounds[i],bg=stage.options[sel?.option];return (bg?.skills||[]).filter(x=>sel.picks.includes(x.name)).map(x=>{const d=utilitySkills[x.name]||attacks[x.name];const conflict=d&&x.stat!==d.stat;return {...d,...x,stat:conflict?(s.rulings[x.name]||x.stat):x.stat,tableStat:x.stat,detailStat:d?.stat,conflict,rank:stage.rank,source:`${stage.name}: ${bg.name}`,tablePage:stage.page,page:d?.page||stage.page};});});}
export function conflicts(s){return selectedSkills(s).filter(x=>x.conflict);}
export function combatSkills(s){if(!s.kind)return [];const name=s.kind==='animal'?'Slice Attack':'Unarmed Combat',base={name,...attacks[name],rank:3,source:'Starting combat'};if(!attacks[s.combat])return [base];return [base,{name:s.combat,label:s.combatType==='weapon'&&s.customWeapon.trim()?`${s.customWeapon.trim()} (${s.combat})`:s.combat,...attacks[s.combat],rank:3,source:'Chosen combat'}];}
export function allSkills(s){return selectedSkills(s).concat(combatSkills(s)).concat(s.combatType==='hand'&&handToHand[s.combat]?[{name:handToHand[s.combat],rank:3,stat:'None',check:'Passive',source:'Hand-to-hand Damage Effect',...damageEffects[handToHand[s.combat]]}]:[]).concat([{name:'Heal',rank:1,...utilitySkills.Heal,source:'All crawlers'}]);}
export function allAttacks(s){return combatSkills(s).concat(selectedSkills(s).filter(x=>attacks[x.name]));}
export function evadeBuff(s){return selectedSkills(s).some(x=>x.name==='Dodge')?1:0;}
export function gear(s){const list=s.items.filter(x=>x.name.trim()).map(x=>({...x}));if(s.combatType==='weapon'&&s.combat)list.unshift({name:s.customWeapon.trim()?`${s.customWeapon.trim()} (${s.combat})`:s.combat,qty:1,kind:'weapon',location:s.weaponLocation});return list;}
export function hotlist(s){const slots=Array(10).fill('');const put=(slot,text)=>{if(Number(slot)>=1&&Number(slot)<=10)slots[Number(slot)-1]=text;};put(s.healSlot,'Heal | Rank 1 (max)\n2 Mana | Interrupt\nSelf only: heals 2 Health slots.');if(s.combatType==='spell'&&attacks[s.combat]){const a=attacks[s.combat];put(s.spellSlot,`${s.combat} | Rank 3\n${a.mana} Mana | ${a.range} ft\n${a.dice} + ${a.damageStat.toUpperCase()} ${a.effect}`);put(s.potionsSlot,'Standard Mana Potions x5\nAction: drink one to fully restore Mana.');}gear(s).forEach(x=>{if(x.location.startsWith('hotlist:'))put(x.location.split(':')[1],`${x.name} x${x.qty}`);});return slots;}
export function errors(s){const e=[];if(!s.name.trim())e.push('Enter your crawler’s name.');if(s.name.length>60||s.pronouns.length>40||s.species.length>45||s.customWeapon.length>45)e.push('Shorten your identity or weapon text to fit the sheet.');if(!/^\d+$/.test(String(s.number))||Number(s.number)<500000||Number(s.number)>12900000)e.push('Choose a crawler number from 500,000 to 12,900,000 (the suggested range on p. 102).');if(!['human','animal'].includes(s.kind))e.push('Choose Human or Animal.');if(s.kind==='animal'){if(!s.species.trim())e.push('Name your earth-based animal species.');if(!['2','3','4'].includes(String(s.size)))e.push('Choose an animal size from 2 to 4.');if(!s.animalPermission)e.push('Confirm GM approval and the one-animal-per-group limit.');}
const stages=backgrounds[s.kind]||[];stages.forEach((st,i)=>{const b=s.backgrounds[i],o=st.options[b?.option];if(!o||b.picks.length!==2||new Set(b.picks).size!==2||b.picks.some(n=>!o.skills.some(x=>x.name===n)))e.push(`Choose one ${st.name.toLowerCase()} background and two of its skills.`);});const skills=selectedSkills(s),names=skills.concat(combatSkills(s)).map(x=>x.name);if(new Set(names).size!==names.length)e.push('Choose ten different background and combat skills; duplicate ranks cannot stack (p. 103).');const options=s.combatType==='weapon'?weapons:s.combatType==='spell'?spells:s.combatType==='hand'?Object.keys(handToHand):[];if(!options.includes(s.combat))e.push('Choose your second combat skill.');const values=stats.map(k=>Number(s.stats[k]));if(values.slice().sort((a,b)=>a-b).join(',')!=='2,3,4,5,6')e.push('Assign 2, 3, 4, 5 and 6 to your stats, using each once.');if(s.combatType==='spell'&&Number(s.stats.Int)<4)e.push('An attack spell requires Intelligence 4 or higher.');if(skills.some(x=>x.name==='Performance')&&!s.performance.trim())e.push('Choose your Performance specialty (p. 196).');const cf=conflicts(s);if(cf.some(x=>![x.tableStat,x.detailStat].includes(s.rulings[x.name]))||cf.length&&!s.rulingsApproved)e.push('Resolve printed Stat differences with your GM in Review.');
const slots=[];if(s.healSlot!=='')slots.push(s.healSlot);if(s.combatType==='spell'){if(!s.spellSlot)e.push('Place your attack spell in a Hotlist slot.');else slots.push(s.spellSlot);if(!s.potionsSlot)e.push('Place all five Standard Mana Potions in one Hotlist slot.');else slots.push(s.potionsSlot);}gear(s).forEach(x=>{if(x.location.startsWith('hotlist:'))slots.push(x.location.split(':')[1]);});if(slots.some(x=>!Number.isInteger(Number(x))||Number(x)<1||Number(x)>10))e.push('Hotlist slots must be 1–10.');if(new Set(slots.map(Number)).size!==slots.length)e.push('Use a separate Hotlist slot for each spell or item entry.');
if(Object.values(s.story).some(x=>!x.trim()))e.push('Choose or write a Past Trauma, Loose End and Regret.');if(Object.values(s.story).some(x=>x.length>250))e.push('Keep each backstory entry within 250 characters.');if(!Object.values(s.clothing).some(x=>x.trim()))e.push('Describe the clothes you were wearing in at least one gear slot.');if(!s.items.some(x=>x.kind==='useful'&&x.name.trim()))e.push('Choose one interesting or useful starting item.');if(s.items.filter(x=>x.kind==='useful'&&x.name.trim()).length!==1)e.push('Starting gear allows one interesting/useful item.');if(s.items.some(x=>!x.name.trim()||x.name.length>70||!Number.isInteger(Number(x.qty))||Number(x.qty)<1||Number(x.qty)>999))e.push('Give each item a name (70 characters max) and quantity from 1 to 999.');const locs=['inventory','holding',...Array.from({length:10},(_,i)=>'hotlist:'+(i+1))];if(gear(s).some(x=>!locs.includes(x.location)))e.push('Choose where each item is carried.');if(gear(s).filter(x=>x.location==='holding').length>1)e.push('Choose one held entry; keep other items in Inventory or Hotlist.');if(gear(s).filter(x=>x.location==='inventory').length>20)e.push('The supplied sheet has 20 Inventory rows; combine identical items.');if(!s.gearApproved)e.push('Confirm your GM agrees the gear fits your previous life.');if(s.combatType==='hand'&&!s.handEffectApproved)e.push('Confirm the hand-to-hand Damage Effect rank and Bronze Weapon Box with your GM.');return e;}
export function missingDetails(s){const r=['This is a starting crawler, not a Level 10 / Third Floor build. Race changes, Classes and advancement are outside these two PDFs.'];if(s.healSlot==='')r.push('Heal is known but not in your Hotlist; it cannot be cast in combat or stressful situations (p. 202).');if(s.combatType==='hand')r.push('Bronze Weapon Box contents and drawback remain for the GM. The Damage Effect uses Rank 3 under your confirmed reading of p. 109.');if(['Mind Tickle','Vine Porn'].includes(s.combat))r.push('Mana shown is the listed base cost. Page 202 adds 1 Mana for other Classes; no Class is assigned at this stage.');if(s.combat==='Lance')r.push('Lance requires a mount to attack; no mount is automatically granted.');if(['Bow','Crossbow','Handgun','Shotgun'].includes(s.combat))r.push('This weapon requires ammunition. Confirm ammunition in your starting gear with the GM; no ammunition quantity is invented.');return r;}

```


## `dist/details.js`

```javascript
// Mechanics transcribed from the supplied skills-and-spells.pdf (book pp.173–214).
const attack=(stat,dice,damageStat,effect,page,notes='',range=5,mana=null,favor=0)=>({stat,dice,damageStat,effect,page,notes,range,mana,favor,check:'Evade'});
export const attacks={
'Unarmed Combat':attack('Str','1d4','Str','Bludgeoning',179,'Cannot use a Damage Effect.',5,null,1),
'Slice Attack':attack('Dex','1d4','Str','Slashing',177,'',5,null,1),
'Back Claw':attack('Str','1d6','Str','Slashing',177),
'Club':attack('Str','1d6','Str','Bludgeoning',178),
'Improvised Weapons':attack('Str','1d4','Str','Bludgeoning',178,'Object weighs at least 1 lb, at most STR Mod lb.',5,null,1),
'Warhammer':attack('Str','1d10','Str','Bludgeoning',178,'Two hands.'),
'Axe':attack('Str','1d6','Str','Slashing',178),
'Dagger':attack('Dex','1d4','Str','Piercing',178,'',5,null,1),
'Longsword':attack('Str','1d8','Str','Slashing',178),
'Rapier':attack('Dex','1d6','Dex','Piercing',178),
'Bow':attack('Dex','1d6','Str','Piercing',181,'Two hands; proper ammunition required.',100),
'Crossbow':attack('Dex','1d8',null,'Piercing',181,'Two hands; ammunition; once per round.',50),
'Handgun':attack('Dex','1d8',null,'Piercing',181,'Ammunition; reload 1 Action after Major Fail or worse.',150),
'Shotgun':attack('Dex','1d10',null,'Piercing',182,'Two hands; ammunition; reload 1 Action after Major Fail or worse.',30),
'Javelin':attack('Dex','1d8','Str','Piercing',182,'',40),
'Shuriken':attack('Dex','1d4','Str','Piercing',182,'',30,null,1),
'Slingshot':attack('Dex','1d2','Str','Bludgeoning',182,'Two hands.',30,null,2),
'Herding Weapons':attack('Str','1d4','Str','Bludgeoning',182,'Two hands; shepherd’s crook.',10,null,1),
'Lance':attack('Str','1d12','Str','Piercing',182,'Mounted only; no Attack of Opportunity or Zone of Control.',10),
'Polearm':attack('Str','1d8','Str','Piercing',183,'Two hands.',10),
'Quarterstaff':attack('Str','1d6','Str','Bludgeoning',183,'Two hands.',10),
'Pugilism':attack('Dex','1d2','Str','Bludgeoning',179,'Optional known Damage Effect.',5,null,2),
'Foot Soldier':attack('Str','1d4','Str','Bludgeoning',179,'Optional known Damage Effect.',5,null,1),
'Noggin Nocker':attack('Str','1d4','Con','Bludgeoning',179,'On success, lose 1 Health Bar slot.',5,null,1),
'Wrasslin’':attack('Str','1d4','Str','Bludgeoning',179,'Two hands. Success: Held. Spend Interrupt and win STR-Opposed Check to prevent escape.',5,null,1),
'Dirt Clod':attack('Int','1d2','Int','Bludgeoning',205,'',100,1,2),
'Fire Fingers':attack('Int','1d4','Int','Fire',205,'',5,3,1),
'Frost Scar':attack('Int','1d4','Int','Ice',205,'',5,2,1),
'Mind Tickle':attack('Cha','1d2','Cha','Psychic',208,'',40,2,2),
'Shock Treatment':attack('Int','1d2','Int','Electric',212,'',30,2,2),
'Soul Collector':attack('Int','1d4','Int','Necrotic',212,'',50,4,1),
'Vine Porn':attack('Con','1d4','Con','Piercing',213,'',20,3,1)
};
export const damageEffects={
'Iron Punch':{page:180,notes:'Optional: +1d2 base damage to Pugilism.'},
'Smush':{page:181,notes:'Optional: x2 total damage if target has 20% Health or less; once per round.'},
'Skullcracker':{page:180,notes:'Optional: +1d4 base damage if target is your size.'},
'Toss':{page:181,notes:'Optional: +1d8 base damage + STR Bludgeoning; end Held; throw 5 ft; smaller foes only.'}
};
const utility=(stat,check,page,notes)=>({stat,check,page,notes});
export const utilitySkills={
'Aiming':utility('None','Passive',184,'Ranged only: choose Disadvantage, add Aiming Rank to hit; success adds 1d4 damage.'),
'Ambush':utility('Int','Int-Opposed',184,'Success: surprise Action; unseen attack has Advantage.'),
'Animal Handling':utility('Cha','Int-Opposed',185,'Success: animal becomes friendly enough not to attack.'),
'Catcher':utility('None','Passive',187,'Interrupt: take a direct hit for adjacent ally; may Step 10 ft first; cannot negate damage.'),
'Chopper Pilot':utility('Dex','Unopposed',187,'Motorcycles. Attacks while piloting have Disadvantage; no two-handed attacks.'),
'Climbing':utility('Str','Unopposed',188,'Check each minute in danger. Attacks while climbing have Disadvantage.'),
'Deception':utility('Cha','Int-Opposed',189,'Disadvantage if target has Detect Lies.'),
'Detect Lies':utility('Int','Cha-Opposed',189,'Disadvantage if target has Deception; detects what they believe.'),
'Determine Value':utility('None','Passive',189,'Sort Inventory by value; no exact gold value. Ranks increase magically only.'),
'Dodge':utility('None','Passive',190,'Gain +1 Evade Buff.'),
'Driving':utility('Dex','Unopposed',190,'Dangerous maneuvers. Attacks while driving have Disadvantage.'),
'Dumpster Diving':utility('Int','Unopposed',190,'Takes 1 hour; once per 50-ft-square area; GM determines find.'),
'Endurance':utility('Con','Unopposed',190,'Success: continue strenuous activity without Fatigued.'),
'Engineering':utility('Int','Unopposed',191,'Build mundane moving parts, fluids or chemicals from Misc. Junk; no vehicles/engines.'),
'Escape Artist':utility('Dex','Unopposed / Str-Opposed',191,'Bonds: Unopposed. Held by creature: STR-Opposed.'),
'Fabricate':utility('Int','Unopposed',191,'Make mundane items from Misc. Junk; no moving parts, fluids or chemicals.'),
'First Aid':utility('Int','Unopposed',192,'Success heals 1 slot, +1 per higher success. Cannot repeat until patient rests.'),
'Good First Impression':utility('Cha','Int-Opposed',193,'Non-hostile individual NPC/Mob only; not crawlers, Bosses or Elites.'),
'Hide in Shadows':utility('Dex','Int-Opposed',193,'Remain still and hidden; larger cover gives Advantage. Moving uses Stealth.'),
'Intimidate':utility('Str','Cha-Opposed',194,'Success: Staggered. Disadvantage if either side is already hostile.'),
'Investigation':utility('Int','Unopposed',194,'10 minutes; Look for Clues takes one Action.'),
'Jumping':utility('Str','Unopposed',195,'10-ft running Step; success jumps Rank + STR feet, 1 ft high.'),
'Light on Your Feet':utility('Dex','Unopposed',195,'Animals only; 10-ft running Step; jumps Rank x2 ft, DEX x2 ft high.'),
'Negotiation':utility('Cha','Int-Opposed',196,'5 minutes; success shifts price 10%; not own party.'),
'Perception':utility('Int','Unopposed',196,'Notice details; also used for Look for Clues.'),
'Performance':utility('Cha','Unopposed / Cha-Opposed',196,'Choose performance specialty. Competing: add top rival’s CHA to Difficulty.'),
'Persuasion':utility('Cha','Int-Opposed',197,'Usually 10 minutes in safety; no overly costly/dangerous/unnatural requests.'),
'Repair':utility('Int','Unopposed',197,'2 hours; simple damaged items without moving parts; not destroyed items.'),
'Running':utility('Dex','Unopposed',197,'Check each minute; add 1 per 10 ft Move. Extended runs use Endurance.'),
'Salvage':utility('Int','Unopposed',198,'Recover useful materials; see source entry.'),
'Sleight of Hand':utility('Dex','Int-Opposed',198,'Smaller-than-hand objects; no accessing other Inventories/Hotlists.'),
'Stealth':utility('Dex','Int-Opposed',199,'Begin out of sight; success before combat grants 1 non-Attack Action.'),
'Streetwise':utility('Cha','Unopposed',199,'Populated areas: rumors, contacts, access and staying inconspicuous.'),
'Survival':utility('Con','Unopposed',199,'Travel in dangerous remote conditions; success avoids hunger/thirst effects.'),
'Swimming':utility('Str','Unopposed',199,'Check each 30 seconds in danger. Fatigued after 1 minute or Major Fail.'),
'Tactics':utility('Int','Unopposed',200,'Once per combat; choose Attack, Damage or Evade; success grants party +1, more for higher success.'),
'Taunt':utility('Cha','Int-Opposed',200,'Interrupt; 30 ft; redirect an incoming attack to yourself.'),
'Throwing':utility('Str','Unopposed / Evade',200,'Up to STR lb, STR x10 ft. Area: Unopposed; foe: Evade.'),
'Tracking':utility('Int','Unopposed',201,'Find/follow tracks; recheck every 15 minutes.'),
'Heal':utility('None','Passive',206,'Interrupt; 2 Mana; self only; heals 2 Health slots; Rank 1 maximum.')
};

```


# Appendix D: Original template form/widget inventory

Rectangles use PDF coordinates (points; origin at bottom left). This is a structural snapshot, not verification of a completed export.

```json
{
  "canonical_field_count": 291,
  "pages": [
    {
      "page": 1,
      "width": 792.0,
      "height": 612.0,
      "widgets": [
        {
          "name": "Name",
          "type": "/Tx",
          "rect": [
            202.023,
            575.595,
            391.461,
            592.329
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Race",
          "type": "/Tx",
          "rect": [
            423.83,
            575.595,
            591.621,
            592.329
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Gender",
          "type": "/Tx",
          "rect": [
            674.627,
            575.595,
            776.55,
            592.329
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "level",
          "type": "/Tx",
          "rect": [
            197.023,
            542.926,
            248.397,
            559.66
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "crawler number",
          "type": "/Tx",
          "rect": [
            323.953,
            542.926,
            395.0,
            559.66
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "class",
          "type": "/Tx",
          "rect": [
            424.845,
            542.926,
            597.305,
            559.66
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Floor",
          "type": "/Tx",
          "rect": [
            623.514,
            542.472,
            720.932,
            562.122
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "10",
          "type": "/Tx",
          "rect": [
            181.675,
            504.914,
            199.941,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "20",
          "type": "/Tx",
          "rect": [
            227.461,
            504.914,
            245.727,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "30",
          "type": "/Tx",
          "rect": [
            268.033,
            504.914,
            286.299,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "40",
          "type": "/Tx",
          "rect": [
            314.82,
            504.914,
            333.086,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "50",
          "type": "/Tx",
          "rect": [
            360.912,
            504.914,
            379.178,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "60",
          "type": "/Tx",
          "rect": [
            402.698,
            504.914,
            420.964,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "70",
          "type": "/Tx",
          "rect": [
            449.106,
            504.914,
            467.372,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "80",
          "type": "/Tx",
          "rect": [
            495.892,
            504.914,
            514.158,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "90",
          "type": "/Tx",
          "rect": [
            543.385,
            504.914,
            561.651,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "100",
          "type": "/Tx",
          "rect": [
            588.172,
            504.914,
            606.438,
            521.648
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box6 1 8",
          "type": "/Btn",
          "rect": [
            607.12,
            512.335,
            623.819,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 7",
          "type": "/Btn",
          "rect": [
            560.764,
            512.335,
            577.463,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 6",
          "type": "/Btn",
          "rect": [
            514.125,
            512.335,
            530.823,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 5",
          "type": "/Btn",
          "rect": [
            468.052,
            512.335,
            484.75,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 4",
          "type": "/Btn",
          "rect": [
            421.457,
            512.335,
            438.155,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 3",
          "type": "/Btn",
          "rect": [
            380.358,
            512.335,
            397.056,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 2",
          "type": "/Btn",
          "rect": [
            333.943,
            512.817,
            350.192,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1 1",
          "type": "/Btn",
          "rect": [
            288.348,
            512.817,
            304.597,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 1",
          "type": "/Btn",
          "rect": [
            247.01,
            512.817,
            263.259,
            530.254
          ],
          "value": "/",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Check Box6 2",
          "type": "/Btn",
          "rect": [
            199.893,
            512.817,
            216.142,
            530.254
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 21",
          "type": "/Tx",
          "rect": [
            25.6842,
            470.004,
            77.0592,
            486.737
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 22",
          "type": "/Tx",
          "rect": [
            100.564,
            470.004,
            151.939,
            486.737
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 23",
          "type": "/Tx",
          "rect": [
            53.8226,
            427.612,
            151.839,
            444.346
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 24",
          "type": "/Tx",
          "rect": [
            263.732,
            454.108,
            293.541,
            470.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 25",
          "type": "/Tx",
          "rect": [
            314.203,
            454.108,
            411.621,
            470.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 26",
          "type": "/Tx",
          "rect": [
            433.423,
            454.108,
            489.411,
            470.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 27",
          "type": "/Tx",
          "rect": [
            511.065,
            454.108,
            557.461,
            470.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 28",
          "type": "/Tx",
          "rect": [
            574.272,
            454.108,
            620.668,
            470.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Image7_af_image",
          "type": "/Btn",
          "rect": [
            635.106,
            417.741,
            772.653,
            532.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 29",
          "type": "/Tx",
          "rect": [
            263.732,
            403.166,
            293.541,
            419.9
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 30",
          "type": "/Tx",
          "rect": [
            314.203,
            403.166,
            411.621,
            419.9
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 31",
          "type": "/Tx",
          "rect": [
            433.423,
            403.166,
            489.411,
            419.9
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 32",
          "type": "/Tx",
          "rect": [
            511.065,
            403.166,
            557.461,
            419.9
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 33",
          "type": "/Tx",
          "rect": [
            574.272,
            403.166,
            620.668,
            419.9
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 34",
          "type": "/Tx",
          "rect": [
            25.6842,
            371.388,
            77.0592,
            388.122
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 35",
          "type": "/Tx",
          "rect": [
            100.564,
            371.388,
            151.939,
            388.122
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 36",
          "type": "/Tx",
          "rect": [
            53.8226,
            328.997,
            151.839,
            345.73
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 37",
          "type": "/Tx",
          "rect": [
            223.673,
            331.975,
            257.59,
            348.708
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 38",
          "type": "/Tx",
          "rect": [
            178.872,
            331.975,
            216.16,
            348.708
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 39",
          "type": "/Tx",
          "rect": [
            301.789,
            331.975,
            561.49,
            348.708
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 40",
          "type": "/Tx",
          "rect": [
            583.368,
            346.762,
            776.55,
            363.495
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 41",
          "type": "/Tx",
          "rect": [
            583.368,
            321.136,
            776.55,
            338.842
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 42",
          "type": "/Tx",
          "rect": [
            583.368,
            296.145,
            776.55,
            312.879
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 43",
          "type": "/Tx",
          "rect": [
            25.6842,
            273.061,
            77.0592,
            289.795
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 44",
          "type": "/Tx",
          "rect": [
            100.564,
            273.061,
            151.939,
            289.795
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 45",
          "type": "/Tx",
          "rect": [
            53.8226,
            231.669,
            151.839,
            248.403
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 46",
          "type": "/Tx",
          "rect": [
            25.6842,
            175.176,
            77.0592,
            191.91
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 47",
          "type": "/Tx",
          "rect": [
            100.564,
            175.176,
            151.939,
            191.91
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 48",
          "type": "/Tx",
          "rect": [
            53.8226,
            132.785,
            151.839,
            149.518
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 49",
          "type": "/Tx",
          "rect": [
            25.6842,
            76.4071,
            77.0592,
            93.1409
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 50",
          "type": "/Tx",
          "rect": [
            100.564,
            76.4071,
            151.939,
            93.1409
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 51",
          "type": "/Tx",
          "rect": [
            53.3411,
            34.0157,
            151.357,
            50.7495
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 55",
          "type": "/Tx",
          "rect": [
            179.129,
            216.175,
            330.62,
            251.841
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 551",
          "type": "/Tx",
          "rect": [
            344.815,
            223.303,
            371.74,
            240.036
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 52",
          "type": "/Tx",
          "rect": [
            378.497,
            223.303,
            405.422,
            240.036
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 53",
          "type": "/Tx",
          "rect": [
            426.115,
            223.303,
            453.04,
            240.036
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 54",
          "type": "/Tx",
          "rect": [
            459.797,
            223.303,
            486.722,
            240.036
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 56",
          "type": "/Tx",
          "rect": [
            510.546,
            216.175,
            770.248,
            251.841
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 61",
          "type": "/Tx",
          "rect": [
            179.129,
            171.583,
            330.62,
            207.25
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 57",
          "type": "/Tx",
          "rect": [
            344.815,
            179.05,
            371.74,
            195.783
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 59",
          "type": "/Tx",
          "rect": [
            378.497,
            179.05,
            405.422,
            195.783
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 58",
          "type": "/Tx",
          "rect": [
            426.115,
            179.05,
            453.04,
            195.783
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 60",
          "type": "/Tx",
          "rect": [
            459.797,
            179.05,
            486.722,
            195.783
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 62",
          "type": "/Tx",
          "rect": [
            510.546,
            171.583,
            770.248,
            207.25
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 67",
          "type": "/Tx",
          "rect": [
            179.129,
            124.743,
            330.62,
            160.409
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 63",
          "type": "/Tx",
          "rect": [
            344.815,
            134.209,
            371.74,
            150.943
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 65",
          "type": "/Tx",
          "rect": [
            378.497,
            134.209,
            405.422,
            150.943
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 64",
          "type": "/Tx",
          "rect": [
            426.115,
            134.209,
            453.04,
            150.943
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 66",
          "type": "/Tx",
          "rect": [
            459.797,
            134.209,
            486.722,
            150.943
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 68",
          "type": "/Tx",
          "rect": [
            510.546,
            124.743,
            770.248,
            160.409
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 73",
          "type": "/Tx",
          "rect": [
            179.129,
            79.0431,
            330.62,
            114.71
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 69",
          "type": "/Tx",
          "rect": [
            344.815,
            86.2535,
            371.74,
            102.987
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 71",
          "type": "/Tx",
          "rect": [
            378.497,
            86.2535,
            405.422,
            102.987
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 70",
          "type": "/Tx",
          "rect": [
            426.115,
            86.2535,
            453.04,
            102.987
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 72",
          "type": "/Tx",
          "rect": [
            459.797,
            86.2535,
            486.722,
            102.987
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 74",
          "type": "/Tx",
          "rect": [
            510.546,
            79.0431,
            770.248,
            114.71
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 79",
          "type": "/Tx",
          "rect": [
            179.129,
            34.0157,
            330.62,
            69.6824
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 75",
          "type": "/Tx",
          "rect": [
            344.815,
            41.3894,
            371.74,
            58.1231
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 77",
          "type": "/Tx",
          "rect": [
            378.497,
            41.3894,
            405.422,
            58.1231
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 76",
          "type": "/Tx",
          "rect": [
            426.115,
            41.3894,
            453.04,
            58.1231
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 78",
          "type": "/Tx",
          "rect": [
            459.797,
            41.3894,
            486.722,
            58.1231
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 80",
          "type": "/Tx",
          "rect": [
            510.546,
            34.0157,
            770.248,
            69.6824
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        }
      ]
    },
    {
      "page": 2,
      "width": 792.0,
      "height": 612.0,
      "widgets": [
        {
          "name": "Text Field 81",
          "type": "/Tx",
          "rect": [
            22.212,
            509.883,
            151.422,
            562.189
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 82",
          "type": "/Tx",
          "rect": [
            177.038,
            509.883,
            306.247,
            562.189
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 83",
          "type": "/Tx",
          "rect": [
            331.366,
            509.883,
            460.576,
            562.189
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 84",
          "type": "/Tx",
          "rect": [
            485.694,
            509.883,
            614.904,
            562.189
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 85",
          "type": "/Tx",
          "rect": [
            640.023,
            509.883,
            769.233,
            562.189
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 86",
          "type": "/Tx",
          "rect": [
            22.212,
            436.205,
            151.422,
            488.512
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 87",
          "type": "/Tx",
          "rect": [
            177.038,
            436.205,
            306.247,
            488.512
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 88",
          "type": "/Tx",
          "rect": [
            331.366,
            436.205,
            460.576,
            488.512
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 89",
          "type": "/Tx",
          "rect": [
            485.694,
            436.205,
            614.904,
            488.512
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 90",
          "type": "/Tx",
          "rect": [
            640.023,
            436.205,
            769.233,
            488.512
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 91",
          "type": "/Tx",
          "rect": [
            34.0157,
            41.04,
            522.0,
            221.151
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 92",
          "type": "/Tx",
          "rect": [
            48.1591,
            383.76,
            516.96,
            403.501
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 93",
          "type": "/Tx",
          "rect": [
            48.1591,
            359.466,
            516.96,
            379.207
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 94",
          "type": "/Tx",
          "rect": [
            48.1591,
            335.995,
            516.96,
            355.736
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 95",
          "type": "/Tx",
          "rect": [
            48.1591,
            295.244,
            516.96,
            314.985
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 96",
          "type": "/Tx",
          "rect": [
            48.1591,
            265.801,
            516.96,
            285.542
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 97",
          "type": "/Tx",
          "rect": [
            48.1591,
            241.585,
            516.96,
            261.326
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 98",
          "type": "/Tx",
          "rect": [
            542.063,
            374.884,
            768.233,
            403.501
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 99",
          "type": "/Tx",
          "rect": [
            542.063,
            304.324,
            768.233,
            348.866
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 100",
          "type": "/Tx",
          "rect": [
            542.063,
            230.139,
            768.233,
            274.773
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 101",
          "type": "/Tx",
          "rect": [
            542.063,
            157.444,
            768.233,
            202.079
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 102",
          "type": "/Tx",
          "rect": [
            542.063,
            32.3401,
            768.233,
            127.975
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        }
      ]
    },
    {
      "page": 3,
      "width": 792.0,
      "height": 612.0,
      "widgets": [
        {
          "name": "Text Field 103",
          "type": "/Tx",
          "rect": [
            22.32,
            528.179,
            254.88,
            547.92
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 104",
          "type": "/Tx",
          "rect": [
            261.0,
            528.179,
            287.28,
            547.92
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 105",
          "type": "/Tx",
          "rect": [
            293.4,
            528.179,
            344.16,
            547.92
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 106",
          "type": "/Tx",
          "rect": [
            350.28,
            528.179,
            441.36,
            547.92
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 107",
          "type": "/Tx",
          "rect": [
            449.48,
            528.179,
            735.12,
            547.92
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 1",
          "type": "/Btn",
          "rect": [
            743.24,
            527.179,
            769.52,
            548.92
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 109",
          "type": "/Tx",
          "rect": [
            22.32,
            502.259,
            254.88,
            522.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 110",
          "type": "/Tx",
          "rect": [
            261.0,
            502.259,
            287.28,
            522.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 111",
          "type": "/Tx",
          "rect": [
            293.4,
            502.259,
            344.16,
            522.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 112",
          "type": "/Tx",
          "rect": [
            350.28,
            502.259,
            441.36,
            522.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 113",
          "type": "/Tx",
          "rect": [
            449.48,
            502.259,
            735.12,
            522.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 2",
          "type": "/Btn",
          "rect": [
            743.24,
            501.259,
            769.52,
            523.0
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 115",
          "type": "/Tx",
          "rect": [
            22.32,
            475.336,
            254.88,
            495.077
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 116",
          "type": "/Tx",
          "rect": [
            261.0,
            475.336,
            287.28,
            495.077
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 117",
          "type": "/Tx",
          "rect": [
            293.4,
            475.336,
            344.16,
            495.077
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 118",
          "type": "/Tx",
          "rect": [
            350.28,
            475.336,
            441.36,
            495.077
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 119",
          "type": "/Tx",
          "rect": [
            449.48,
            475.336,
            735.12,
            495.077
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 3",
          "type": "/Btn",
          "rect": [
            743.24,
            474.336,
            769.52,
            496.077
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 121",
          "type": "/Tx",
          "rect": [
            22.32,
            449.98,
            254.88,
            469.721
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 122",
          "type": "/Tx",
          "rect": [
            261.0,
            449.98,
            287.28,
            469.721
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 123",
          "type": "/Tx",
          "rect": [
            293.4,
            449.98,
            344.16,
            469.721
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 124",
          "type": "/Tx",
          "rect": [
            350.28,
            449.98,
            441.36,
            469.721
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 125",
          "type": "/Tx",
          "rect": [
            449.48,
            449.98,
            735.12,
            469.721
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 4",
          "type": "/Btn",
          "rect": [
            743.24,
            448.98,
            769.52,
            470.721
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 127",
          "type": "/Tx",
          "rect": [
            22.32,
            423.624,
            254.88,
            443.365
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 128",
          "type": "/Tx",
          "rect": [
            261.0,
            423.624,
            287.28,
            443.365
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 129",
          "type": "/Tx",
          "rect": [
            293.4,
            423.624,
            344.16,
            443.365
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 130",
          "type": "/Tx",
          "rect": [
            350.28,
            423.624,
            441.36,
            443.365
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 131",
          "type": "/Tx",
          "rect": [
            449.48,
            423.624,
            735.12,
            443.365
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 5",
          "type": "/Btn",
          "rect": [
            743.24,
            422.624,
            769.52,
            444.365
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 133",
          "type": "/Tx",
          "rect": [
            22.32,
            398.268,
            254.88,
            418.009
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 134",
          "type": "/Tx",
          "rect": [
            261.482,
            398.268,
            287.762,
            418.009
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 135",
          "type": "/Tx",
          "rect": [
            293.4,
            398.268,
            344.16,
            418.009
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 136",
          "type": "/Tx",
          "rect": [
            350.28,
            398.268,
            441.36,
            418.009
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 137",
          "type": "/Tx",
          "rect": [
            449.48,
            398.268,
            735.12,
            418.009
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 6",
          "type": "/Btn",
          "rect": [
            743.24,
            397.268,
            769.52,
            419.009
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 139",
          "type": "/Tx",
          "rect": [
            22.32,
            372.912,
            254.88,
            392.653
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 140",
          "type": "/Tx",
          "rect": [
            261.0,
            372.912,
            287.28,
            392.653
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 141",
          "type": "/Tx",
          "rect": [
            293.4,
            372.912,
            344.16,
            392.653
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 142",
          "type": "/Tx",
          "rect": [
            350.28,
            372.912,
            441.36,
            392.653
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 143",
          "type": "/Tx",
          "rect": [
            449.48,
            372.912,
            735.12,
            392.653
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 7",
          "type": "/Btn",
          "rect": [
            743.24,
            371.912,
            769.52,
            393.653
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 145",
          "type": "/Tx",
          "rect": [
            22.32,
            345.556,
            254.88,
            365.298
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 146",
          "type": "/Tx",
          "rect": [
            261.0,
            345.556,
            287.28,
            365.298
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 147",
          "type": "/Tx",
          "rect": [
            293.4,
            345.556,
            344.16,
            365.298
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 148",
          "type": "/Tx",
          "rect": [
            350.28,
            345.556,
            441.36,
            365.298
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 149",
          "type": "/Tx",
          "rect": [
            449.48,
            345.556,
            735.12,
            365.298
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 8",
          "type": "/Btn",
          "rect": [
            743.24,
            344.556,
            769.52,
            366.298
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 151",
          "type": "/Tx",
          "rect": [
            22.32,
            320.201,
            254.88,
            339.942
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 152",
          "type": "/Tx",
          "rect": [
            261.0,
            320.201,
            287.28,
            339.942
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 153",
          "type": "/Tx",
          "rect": [
            293.4,
            320.201,
            344.16,
            339.942
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 154",
          "type": "/Tx",
          "rect": [
            350.28,
            320.201,
            441.36,
            339.942
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 155",
          "type": "/Tx",
          "rect": [
            449.48,
            320.201,
            735.12,
            339.942
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 9",
          "type": "/Btn",
          "rect": [
            743.24,
            319.201,
            769.52,
            340.942
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 157",
          "type": "/Tx",
          "rect": [
            22.32,
            293.129,
            254.88,
            312.871
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 158",
          "type": "/Tx",
          "rect": [
            261.0,
            293.129,
            287.28,
            312.871
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 159",
          "type": "/Tx",
          "rect": [
            293.4,
            293.129,
            344.16,
            312.871
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 160",
          "type": "/Tx",
          "rect": [
            350.28,
            293.129,
            441.36,
            312.871
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 161",
          "type": "/Tx",
          "rect": [
            449.48,
            293.129,
            735.12,
            312.871
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 10",
          "type": "/Btn",
          "rect": [
            743.24,
            292.129,
            769.52,
            313.871
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 163",
          "type": "/Tx",
          "rect": [
            22.32,
            268.058,
            254.88,
            287.799
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 164",
          "type": "/Tx",
          "rect": [
            261.0,
            268.058,
            287.28,
            287.799
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 165",
          "type": "/Tx",
          "rect": [
            293.4,
            268.058,
            344.16,
            287.799
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 166",
          "type": "/Tx",
          "rect": [
            350.28,
            268.058,
            441.36,
            287.799
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 167",
          "type": "/Tx",
          "rect": [
            449.48,
            268.058,
            735.12,
            287.799
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 11",
          "type": "/Btn",
          "rect": [
            743.24,
            267.058,
            769.52,
            288.799
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 169",
          "type": "/Tx",
          "rect": [
            22.32,
            241.987,
            254.88,
            261.728
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 170",
          "type": "/Tx",
          "rect": [
            261.0,
            241.987,
            287.28,
            261.728
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 171",
          "type": "/Tx",
          "rect": [
            293.4,
            241.987,
            344.16,
            261.728
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 172",
          "type": "/Tx",
          "rect": [
            350.28,
            241.987,
            441.36,
            261.728
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 173",
          "type": "/Tx",
          "rect": [
            449.48,
            241.987,
            735.12,
            261.728
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 12",
          "type": "/Btn",
          "rect": [
            743.24,
            240.987,
            769.52,
            262.728
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 175",
          "type": "/Tx",
          "rect": [
            22.32,
            215.916,
            254.88,
            235.657
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 176",
          "type": "/Tx",
          "rect": [
            261.0,
            215.916,
            287.28,
            235.657
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 177",
          "type": "/Tx",
          "rect": [
            293.4,
            215.916,
            344.16,
            235.657
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 178",
          "type": "/Tx",
          "rect": [
            350.28,
            215.916,
            441.36,
            235.657
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 179",
          "type": "/Tx",
          "rect": [
            449.48,
            215.916,
            735.12,
            235.657
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 13",
          "type": "/Btn",
          "rect": [
            743.24,
            214.916,
            769.52,
            236.657
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 181",
          "type": "/Tx",
          "rect": [
            22.32,
            189.845,
            254.88,
            209.586
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 182",
          "type": "/Tx",
          "rect": [
            261.0,
            189.845,
            287.28,
            209.586
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 183",
          "type": "/Tx",
          "rect": [
            293.4,
            189.845,
            344.16,
            209.586
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 184",
          "type": "/Tx",
          "rect": [
            350.28,
            189.845,
            441.36,
            209.586
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 185",
          "type": "/Tx",
          "rect": [
            449.48,
            189.845,
            735.12,
            209.586
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 14",
          "type": "/Btn",
          "rect": [
            743.24,
            188.845,
            769.52,
            210.586
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 187",
          "type": "/Tx",
          "rect": [
            22.32,
            163.774,
            254.88,
            183.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 188",
          "type": "/Tx",
          "rect": [
            261.0,
            163.774,
            287.28,
            183.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 189",
          "type": "/Tx",
          "rect": [
            293.4,
            163.774,
            344.16,
            183.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 190",
          "type": "/Tx",
          "rect": [
            350.28,
            163.774,
            441.36,
            183.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 191",
          "type": "/Tx",
          "rect": [
            449.48,
            163.774,
            735.12,
            183.515
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 15",
          "type": "/Btn",
          "rect": [
            743.24,
            162.774,
            769.52,
            184.515
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 193",
          "type": "/Tx",
          "rect": [
            22.32,
            137.703,
            254.88,
            157.444
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 194",
          "type": "/Tx",
          "rect": [
            261.0,
            137.703,
            287.28,
            157.444
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 195",
          "type": "/Tx",
          "rect": [
            293.4,
            137.703,
            344.16,
            157.444
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 196",
          "type": "/Tx",
          "rect": [
            350.28,
            137.703,
            441.36,
            157.444
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 197",
          "type": "/Tx",
          "rect": [
            449.48,
            137.703,
            735.12,
            157.444
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 16",
          "type": "/Btn",
          "rect": [
            743.24,
            136.703,
            769.52,
            158.444
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 199",
          "type": "/Tx",
          "rect": [
            22.32,
            111.631,
            254.88,
            131.373
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 200",
          "type": "/Tx",
          "rect": [
            261.0,
            111.631,
            287.28,
            131.373
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 201",
          "type": "/Tx",
          "rect": [
            293.4,
            111.631,
            344.16,
            131.373
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 202",
          "type": "/Tx",
          "rect": [
            350.28,
            111.631,
            441.36,
            131.373
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 203",
          "type": "/Tx",
          "rect": [
            449.48,
            111.631,
            735.12,
            131.373
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 17",
          "type": "/Btn",
          "rect": [
            743.24,
            110.631,
            769.52,
            132.373
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 205",
          "type": "/Tx",
          "rect": [
            22.32,
            85.5603,
            254.88,
            105.301
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 206",
          "type": "/Tx",
          "rect": [
            261.0,
            85.5603,
            287.28,
            105.301
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 207",
          "type": "/Tx",
          "rect": [
            293.4,
            85.5603,
            344.16,
            105.301
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 208",
          "type": "/Tx",
          "rect": [
            350.28,
            85.5603,
            441.36,
            105.301
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 209",
          "type": "/Tx",
          "rect": [
            449.48,
            85.5603,
            735.12,
            105.301
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 18",
          "type": "/Btn",
          "rect": [
            743.24,
            84.5603,
            769.52,
            106.301
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 211",
          "type": "/Tx",
          "rect": [
            22.32,
            59.4892,
            254.88,
            79.2303
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 212",
          "type": "/Tx",
          "rect": [
            261.0,
            59.4892,
            287.28,
            79.2303
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 213",
          "type": "/Tx",
          "rect": [
            293.4,
            59.4892,
            344.16,
            79.2303
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 214",
          "type": "/Tx",
          "rect": [
            350.28,
            59.4892,
            441.36,
            79.2303
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 215",
          "type": "/Tx",
          "rect": [
            449.48,
            59.4892,
            735.12,
            79.2303
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 19",
          "type": "/Btn",
          "rect": [
            743.24,
            58.4892,
            769.52,
            80.2303
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        },
        {
          "name": "Text Field 217",
          "type": "/Tx",
          "rect": [
            22.32,
            34.0157,
            254.88,
            53.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 218",
          "type": "/Tx",
          "rect": [
            261.0,
            34.0157,
            287.28,
            53.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 219",
          "type": "/Tx",
          "rect": [
            293.4,
            34.0157,
            344.16,
            53.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 220",
          "type": "/Tx",
          "rect": [
            350.28,
            34.0157,
            441.36,
            53.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 221",
          "type": "/Tx",
          "rect": [
            449.48,
            34.0157,
            735.12,
            53.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Check Box 20",
          "type": "/Btn",
          "rect": [
            743.24,
            33.0157,
            769.52,
            54.7569
          ],
          "value": "/Off",
          "has_parent": false,
          "has_normal_appearance": true
        }
      ]
    },
    {
      "page": 4,
      "width": 792.0,
      "height": 612.0,
      "widgets": [
        {
          "name": "Text Field 223",
          "type": "/Tx",
          "rect": [
            22.32,
            526.739,
            249.12,
            546.48
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 224",
          "type": "/Tx",
          "rect": [
            257.76,
            526.739,
            299.52,
            546.48
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 225",
          "type": "/Tx",
          "rect": [
            312.48,
            526.739,
            768.96,
            546.48
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 226",
          "type": "/Tx",
          "rect": [
            22.32,
            499.379,
            249.12,
            519.12
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 227",
          "type": "/Tx",
          "rect": [
            257.76,
            499.379,
            299.52,
            519.12
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 228",
          "type": "/Tx",
          "rect": [
            312.48,
            499.379,
            768.96,
            519.12
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 229",
          "type": "/Tx",
          "rect": [
            22.32,
            473.019,
            249.12,
            492.76
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 230",
          "type": "/Tx",
          "rect": [
            257.76,
            473.019,
            299.52,
            492.76
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 231",
          "type": "/Tx",
          "rect": [
            312.48,
            473.019,
            768.96,
            492.76
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 232",
          "type": "/Tx",
          "rect": [
            22.32,
            447.659,
            249.12,
            467.4
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 233",
          "type": "/Tx",
          "rect": [
            257.76,
            447.659,
            299.52,
            467.4
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 234",
          "type": "/Tx",
          "rect": [
            312.48,
            447.659,
            768.96,
            467.4
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 235",
          "type": "/Tx",
          "rect": [
            22.32,
            422.299,
            249.12,
            442.04
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 236",
          "type": "/Tx",
          "rect": [
            257.76,
            422.299,
            299.52,
            442.04
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 237",
          "type": "/Tx",
          "rect": [
            312.48,
            422.299,
            768.96,
            442.04
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 238",
          "type": "/Tx",
          "rect": [
            22.32,
            394.939,
            249.12,
            414.68
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 239",
          "type": "/Tx",
          "rect": [
            257.76,
            394.939,
            299.52,
            414.68
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 240",
          "type": "/Tx",
          "rect": [
            312.48,
            394.939,
            768.96,
            414.68
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 241",
          "type": "/Tx",
          "rect": [
            22.32,
            369.579,
            249.12,
            389.32
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 242",
          "type": "/Tx",
          "rect": [
            257.76,
            369.579,
            299.52,
            389.32
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 243",
          "type": "/Tx",
          "rect": [
            312.48,
            369.579,
            768.96,
            389.32
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 244",
          "type": "/Tx",
          "rect": [
            22.32,
            344.219,
            249.12,
            363.96
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 245",
          "type": "/Tx",
          "rect": [
            257.76,
            344.219,
            299.52,
            363.96
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 246",
          "type": "/Tx",
          "rect": [
            312.48,
            344.219,
            768.96,
            363.96
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 247",
          "type": "/Tx",
          "rect": [
            22.32,
            317.859,
            249.12,
            337.6
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 248",
          "type": "/Tx",
          "rect": [
            257.76,
            317.859,
            299.52,
            337.6
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 249",
          "type": "/Tx",
          "rect": [
            312.48,
            317.859,
            768.96,
            337.6
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 250",
          "type": "/Tx",
          "rect": [
            22.32,
            291.499,
            249.12,
            311.24
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 251",
          "type": "/Tx",
          "rect": [
            257.76,
            291.499,
            299.52,
            311.24
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 252",
          "type": "/Tx",
          "rect": [
            312.48,
            291.499,
            768.96,
            311.24
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 253",
          "type": "/Tx",
          "rect": [
            22.32,
            265.139,
            249.12,
            284.88
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 254",
          "type": "/Tx",
          "rect": [
            257.76,
            265.139,
            299.52,
            284.88
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 255",
          "type": "/Tx",
          "rect": [
            312.48,
            265.139,
            768.96,
            284.88
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 256",
          "type": "/Tx",
          "rect": [
            22.32,
            238.779,
            249.12,
            258.52
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 257",
          "type": "/Tx",
          "rect": [
            257.76,
            238.779,
            299.52,
            258.52
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 258",
          "type": "/Tx",
          "rect": [
            312.48,
            238.779,
            768.96,
            258.52
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 259",
          "type": "/Tx",
          "rect": [
            22.32,
            212.419,
            249.12,
            232.16
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 260",
          "type": "/Tx",
          "rect": [
            257.76,
            212.419,
            299.52,
            232.16
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 261",
          "type": "/Tx",
          "rect": [
            312.48,
            212.419,
            768.96,
            232.16
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 262",
          "type": "/Tx",
          "rect": [
            22.32,
            186.059,
            249.12,
            205.8
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 263",
          "type": "/Tx",
          "rect": [
            257.76,
            186.059,
            299.52,
            205.8
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 264",
          "type": "/Tx",
          "rect": [
            312.48,
            186.059,
            768.96,
            205.8
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 265",
          "type": "/Tx",
          "rect": [
            22.32,
            159.699,
            249.12,
            179.44
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 266",
          "type": "/Tx",
          "rect": [
            257.76,
            159.699,
            299.52,
            179.44
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 267",
          "type": "/Tx",
          "rect": [
            312.48,
            159.699,
            768.96,
            179.44
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 268",
          "type": "/Tx",
          "rect": [
            22.32,
            133.339,
            249.12,
            153.08
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 269",
          "type": "/Tx",
          "rect": [
            257.76,
            133.339,
            299.52,
            153.08
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 270",
          "type": "/Tx",
          "rect": [
            312.48,
            133.339,
            768.96,
            153.08
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 271",
          "type": "/Tx",
          "rect": [
            22.32,
            106.979,
            249.12,
            126.72
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 272",
          "type": "/Tx",
          "rect": [
            257.76,
            106.979,
            299.52,
            126.72
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 273",
          "type": "/Tx",
          "rect": [
            312.48,
            106.979,
            768.96,
            126.72
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 274",
          "type": "/Tx",
          "rect": [
            22.32,
            82.6189,
            249.12,
            102.36
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 275",
          "type": "/Tx",
          "rect": [
            257.76,
            82.6189,
            299.52,
            102.36
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 276",
          "type": "/Tx",
          "rect": [
            312.48,
            82.6189,
            768.96,
            102.36
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 277",
          "type": "/Tx",
          "rect": [
            22.32,
            56.2589,
            249.12,
            76.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 278",
          "type": "/Tx",
          "rect": [
            257.76,
            56.2589,
            299.52,
            76.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 279",
          "type": "/Tx",
          "rect": [
            312.48,
            56.2589,
            768.96,
            76.0
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 280",
          "type": "/Tx",
          "rect": [
            22.32,
            30.0157,
            249.12,
            49.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 281",
          "type": "/Tx",
          "rect": [
            257.76,
            30.0157,
            299.52,
            49.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        },
        {
          "name": "Text Field 282",
          "type": "/Tx",
          "rect": [
            312.48,
            30.0157,
            768.96,
            49.7569
          ],
          "value": "",
          "has_parent": false,
          "has_normal_appearance": false
        }
      ]
    }
  ]
}
```
