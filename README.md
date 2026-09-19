# Dungeon Crawler Carl - Starting Crawler Builder

Static, browser-based first draft of a character creator for the Dungeon Crawler Carl Roleplaying Game.

## Source boundary

Game mechanics in this project are intentionally limited to the supplied files:

- `character-generation-rules.pdf` (15 PDF pages / book pp. 101-115)
- `skills-and-spells.pdf` (42 PDF pages / book pp. 173-214)
- `fillable-character-sheet.pdf` is the required four-page output template.

The builder does not import rules from D&D, Pathfinder, other chapters, websites, or remembered RPG systems.

## First-draft behavior

This version is deliberately **player-choice driven**. It does not include background/stat/story dice buttons yet.

The only automatic random value is the crawler number, generated once per new crawler in the user-approved range 50,000-12,900,000 and saved with the browser draft.

The flow covers:

1. Identity and Human/optional earth-animal origin.
2. Four background stages and exactly two player-selected Skills from each chosen background.
3. Starting combat Skill plus a player-selected weapon, attack Spell, or hand-to-hand option.
4. Player-assigned Standard Array (2, 3, 4, 5, 6) with duplicate/missing-value validation and automatic derived values.
5. Past Trauma, Loose End, and Regret - choose a printed prompt or write an original one.
6. Starting gear and player-controlled item placement with responsive layouts for desktop, tablet, and phone widths.
7. Hotlist placement, including attack Spell / mana-potion requirements when applicable. Slot collisions are rejected immediately, and occupied Hotlist rows can be dragged to reorder them (with up/down buttons as a touch/keyboard fallback).
8. Player choice of which learned attacks appear in the sheet's five front-page attack rows.
9. Validation, source-discrepancy rulings, and filled PDF download.

The exported PDF preserves the original four-page fillable AcroForm rather than replacing or flattening it.
Starting exported sheets default **Level** to `1` and **Floor** to `1`.

## Run locally

The project includes a small Python server that always serves the correct `dist` directory, regardless of the directory your terminal happens to be in.

From the project folder:

```powershell
python serve.py
```

Then open:

```text
http://localhost:4173/
```

You can also choose a different port:

```powershell
python serve.py --port 8080
```

Do **not** open `dist/index.html` directly with `file://`; the browser needs HTTP access to fetch the PDF template and JavaScript modules.

## Tests

There is no npm test setup and no `package.json`. The test runner is Python as well.

Install the small PDF test dependency once:

```powershell
python -m pip install -r requirements-dev.txt
```

Run the tests with:

```powershell
python -m unittest discover -s tests -v
```

The Python smoke suite checks:

- Background Continue returns the player to the first unfinished life stage until all four background/Skill selections are complete. Forward sidebar navigation cannot bypass this check.
- Stats cannot continue until 2, 3, 4, 5, and 6 are each assigned exactly once (plus the Intelligence requirement for a starting attack Spell). Forward sidebar navigation cannot bypass this check either.
- The name and gender/pronouns controls use matching label rows so their inputs align.
- Starting-possession controls reflow from four columns to two columns to one column as their available width shrinks, rather than squeezing labels and fields out of alignment.
- Trying to place a Spell, potion stack, weapon, or item into an occupied Hotlist slot is rejected immediately with a warning.
- Hotlist entries expose drag-and-drop ordering plus up/down controls, and reordering updates the underlying Spell/item/weapon slot assignment.

- `/` and all required static assets return HTTP 200, preventing the localhost 404 regression.
- The server is pinned to this project's `dist` folder instead of depending on the terminal's working directory.
- The npm test scaffold is gone.
- The current crawler-number bounds and first-draft choice-driven contract are present in the shipped rules module.
- Critical validation guards and PDF field mappings are present.
- `dist/character-sheet.pdf` is byte-for-byte the supplied fillable sheet.
- The template is four pages, still has its AcroForm, and contains the critical fields used by the exporter.

The application itself remains browser JavaScript; these tests deliberately avoid introducing a second Node/npm toolchain just to run the test command.

## Planned second pass: book-accurate rolling

After the manual first draft is accepted, optional dice controls can be added exactly where the supplied character-creation rules provide them:

- Human background category: 1d12 per life stage.
- Animal background category: 1d6 per life stage.
- Stats: 1d6 in order, rerolling 1s, with no swapping.
- Past Trauma, Loose End, and Regret: separate 1d12 rolls.

The roll controls should remain optional. A die-selected background still leaves the player to choose two of its three Skills, because that is a separate player choice in the rules.
