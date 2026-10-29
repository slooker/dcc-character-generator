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

The exported PDF preserves the original four-page fillable AcroForm rather than replacing or flattening it. Starting exported sheets default **Level** to `1` and **Floor** to `1`.

## Run with Docker Compose

Docker Compose is the supported way to run the site.

From the project folder:

```powershell
docker compose up --build -d
```

Then open:

```text
http://localhost:4173/
```

To watch the container logs:

```powershell
docker compose logs -f
```

To stop it:

```powershell
docker compose down
```

### Use a different host port

The container always listens on port 80 internally. Set `PORT` to publish a different host port:

```powershell
$env:PORT=8080
docker compose up --build -d
```

Then open `http://localhost:8080/`.

There is no Python web server and no npm runtime. Nginx serves the static files from `dist/` inside the container.

After changing files under `dist/`, rebuild the image:

```powershell
docker compose up --build -d
```

## Tests

Tests remain Python, as requested. They do not run the application server.

Install the small PDF test dependency once:

```powershell
python -m pip install -r requirements-dev.txt
```

Run the tests with:

```powershell
python -m unittest discover -s tests -v
```

The Python smoke suite checks the character-builder validation behavior, PDF field/template assumptions, responsive markup, Hotlist behavior, and the Docker/Compose packaging needed to serve `dist/` through Nginx.

## Planned second pass: book-accurate rolling

After the manual first draft is accepted, optional dice controls can be added exactly where the supplied character-creation rules provide them:

- Human background category: 1d12 per life stage.
- Animal background category: 1d6 per life stage.
- Stats: 1d6 in order, rerolling 1s, with no swapping.
- Past Trauma, Loose End, and Regret: separate 1d12 rolls.

The roll controls should remain optional. A die-selected background still leaves the player to choose two of its three Skills, because that is a separate player choice in the rules.
