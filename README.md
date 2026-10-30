# Dungeon Crawler Carl - Starting Crawler Builder

Static, browser-based first draft of a character creator for the Dungeon Crawler Carl Roleplaying Game.

## Source boundary

Game mechanics in this project are intentionally limited to the supplied files:

- `character-generation-rules.pdf` (15 PDF pages / book pp. 101-115)
- `skills-and-spells.pdf` (42 PDF pages / book pp. 173-214)
- `fillable-character-sheet.pdf` is the required four-page output template.

Expansion sources in `source-files/` (book page ranges):

- `dcc-character-creation-first-floor.pdf` (pp. 101-115): First Floor crawler creation.
- `dcc-character-creation-third-floor-and-beyond.pdf` (pp. 115-118): Third/Fourth/Fifth Floor crawlers, starting loot (Tables 25-27), Tutorial Floor Experiences index (Table 28).
- `dcc-tutorial-experience-tables.pdf` (pp. 119-127): Tutorial Floor Experiences (Tables 29-34) and Third/Fourth Floor Events (Tables 35-36).
- `dcc-gear.pdf` (pp. 98-99): Inventory, lifting, Hotlist, Gear Slots, Wealth, Misc. Junk, potions.
- `dcc-races.pdf` (pp. 128-141): Race & Class selection and Races.
- `dcc-classes.pdf` (pp. 142-162): Classes and the Race & Class Point Build System.
- `dcc-gods.pdf` (pp. 163-168): deities and worship.
- `dcc-skills.pdf` (pp. 173-201) and `dcc-spells.pdf` (pp. 202-214).
- `Carl Character Sheet Fillable.pdf`: the four-page sheet (same 291 form fields as `dist/character-sheet.pdf`).

To extract per-page text for reference (written to the gitignored `source-text/`, never served):

```sh
python -m pip install -r requirements-dev.txt
python tools/extract_sources.py
python tools/extract_races_classes.py   # needs: pip install pymupdf
python tools/extract_skill_catalog.py
python tools/build_race_class_data.py   # regenerates dist/races-classes.js
```

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
9. Race & Class: only the Races and Classes whose prerequisites the crawler meets are listed (Earth Classes need an Earth Race; Skill Rank, Popularity, achievement, club, deity and female-only limits are checked). Stat changes go to Unenhanced Stats (Enhanced equals Unenhanced until equipment adds bonuses). Skill and Spell bonuses add Ranks immediately, a new Skill/Spell is gained at the bonus Rank, and totals cap at Rank 10 during selection. "Of your choice" picks and Stat splits are made in the step. DR is listed per source in the sheet's Buffs box; Size and Move are applied; situational benefits go to the sheet notes.
10. Validation, source-discrepancy rulings, and filled PDF download.

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

The container runs a FastAPI app (`server/`) that serves the builder from `dist/` and the `/api` routes (currently `/api/health`; API docs at `/api/docs`). There is no npm runtime.

### Database

Data is stored with SQLAlchemy in SQLite at `/data/app.db`, kept in the `crawler-data` Docker volume so it survives rebuilds and `docker compose down`. (`docker compose down -v` deletes it.)

Migrations are managed with Alembic in `server/alembic/` and run automatically when the container starts. To add a table, define the model in `server/models.py`, then generate a migration:

```sh
DATABASE_URL=sqlite:///./tmp/dev.db alembic -c server/alembic.ini upgrade head
DATABASE_URL=sqlite:///./tmp/dev.db alembic -c server/alembic.ini revision --autogenerate -m "add users"
```

To use Postgres or MySQL instead, add its driver to `server/requirements.txt` (for example `psycopg[binary]` or `PyMySQL`) and set `DATABASE_URL` (for example `postgresql+psycopg://user:pass@host/db`). Compose passes `DATABASE_URL` through from your environment.

After changing files under `dist/`, rebuild the image:

```powershell
docker compose up --build -d
```

## Tests

Tests remain Python, as requested. Server tests use FastAPI's test client against a temporary SQLite database; nothing needs to be running.

Install the small PDF test dependency once:

```powershell
python -m pip install -r requirements-dev.txt
```

Run the tests with:

```powershell
python -m unittest discover -s tests -v
```

The Python smoke suite checks the character-builder validation behavior, PDF field/template assumptions, responsive markup, Hotlist behavior, and the Docker/Compose packaging. `tests/test_server.py` covers static serving, startup migrations and `/api/health`; `tests/test_race_class.py` and `tests/test_pdf_export.py` run the real browser modules (and a full PDF export) in an embedded V8.

## Planned second pass: book-accurate rolling

After the manual first draft is accepted, optional dice controls can be added exactly where the supplied character-creation rules provide them:

- Human background category: 1d12 per life stage.
- Animal background category: 1d6 per life stage.
- Stats: 1d6 in order, rerolling 1s, with no swapping.
- Past Trauma, Loose End, and Regret: separate 1d12 rolls.

The roll controls should remain optional. A die-selected background still leaves the player to choose two of its three Skills, because that is a separate player choice in the rules.
