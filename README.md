# Dungeon Crawler Carl - Starting Crawler Builder

Static, browser-based first draft of a character creator for the Dungeon Crawler Carl Roleplaying Game.

## Changelog

`dist/changelog.js` has one entry per commit on `main`: version 0.N for the Nth commit, with its date and what changed. Add an entry with every commit; `tests/test_changelog.py` fails if it falls behind. The page is linked from the footer.

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
python tools/extract_skill_text.py      # regenerates dist/skill-text.js (stat lines + Upgrades)
python tools/build_race_class_data.py   # regenerates dist/races-classes.js
```

The builder does not import rules from D&D, Pathfinder, other chapters, websites, or remembered RPG systems.

## First-draft behavior

This version is deliberately **player-choice driven**. It does not include background/stat/story dice buttons yet.

The only automatic random value is the crawler number, generated once per new crawler in the user-approved range 50,000-12,900,000 and saved with the browser draft.

The flow covers:

1. Identity and Human/optional earth-animal origin, with an optional portrait (JPEG/PNG/WebP/GIF under 2 MB, shrunk in the browser to a small JPEG for the sheet's Portrait box).
2. Four background stages and exactly two player-selected Skills from each chosen background.
3. Starting combat Skill plus a player-selected weapon, attack Spell, or hand-to-hand option.
4. Player-assigned Standard Array (2, 3, 4, 5, 6) with duplicate/missing-value validation and automatic derived values.
5. Past Trauma, Loose End, and Regret - choose a printed prompt or write an original one.
6. Starting gear and player-controlled item placement with responsive layouts for desktop, tablet, and phone widths.
7. Hotlist placement, including attack Spell / mana-potion requirements when applicable. Slot collisions are rejected immediately, and occupied Hotlist rows can be dragged to reorder them (with up/down buttons as a touch/keyboard fallback).
8. Player choice of which learned attacks appear in the sheet's five front-page attack rows.
9. Race & Class: only the Races and Classes whose prerequisites the crawler meets are listed (Earth Classes need an Earth Race; Skill Rank, Popularity, achievement, club, deity and female-only limits are checked). Stat changes go to Unenhanced Stats (Enhanced equals Unenhanced until equipment adds bonuses). Skill and Spell bonuses add Ranks immediately, a new Skill/Spell is gained at the bonus Rank, and totals cap at Rank 10 during selection. "Of your choice" picks and Stat splits are made in the step. DR is listed per source in the sheet's Buffs box; Size and Move are applied; situational benefits go to the sheet notes.
10. Level & Skills: 3 Stat points per level and a floor-stamped Skill & Spell log.
11. Equipment (dcc-gear.pdf pp. 98-99): items found later, with gold and Misc. Junk. Gear Slots hold one item each (Head, Torso, Arms, gloves, Legs, Feet), two hands for Holding (Two-Handed weapons use both), and up to 10 Accessories (one belt, one cape); starting clothing and possessions count too. Only equipped items apply their player-entered bonuses: Stat bonuses raise Enhanced Stats only, Skill bonuses add Ranks while equipped (not counted for prerequisites), and DR goes in the sheet's Armor box. Scrolls are named "Scroll of <Spell> (Rank N)"; reading a spellbook logs its Spell in the Skill & Spell log; potions can be used up. More than 20 Inventory rows add an extra Inventory page. For use at the table, a quick-add bar adds an Item, Potion, Scroll or Spellbook in one line (Custom… opens the full editor for magic gear with bonuses), gold can be added or spent, and each item has quantity buttons (and Use for potions and scrolls); its full editor opens with Edit.
12. Party (optional): the Party's name and notes go in the sheet notes. Party buffs (e.g. +2 DR from a party member while she's in the party) take the same Stat, Skill, DR and damage bonuses as magic items and apply while ticked Active: Stats raise Enhanced Stats, DR goes in the sheet's DR Buffs box, damage adds to all attacks.
13. Validation and filled PDF download (a sheet with unresolved issues can still be downloaded; its notes list them). Where the background tables and Skill entries print different Stats, the user ruled Escape Artist Dex, Performance Cha and Aiming Dex.

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

### Accounts

Crawlers can be saved to an email/password account, up to 5 per account (enforced by the server). The builder still works signed out; the working draft always lives in the browser's localStorage, and **Save** copies it to the account.

- Passwords are hashed with Argon2id. Sessions last 30 days in an HttpOnly, SameSite=Lax cookie; the database stores only a hash of the session token.
- The cookie is marked Secure when the request arrives over HTTPS. Behind an HTTPS reverse proxy that doesn't forward the scheme, set `COOKIE_SECURE=1`.
- Mutating `/api` requests must send an `X-Requested-With` header (CSRF protection).
- Behind Cloudflare Tunnel and Caddy, the visitor's real address comes from `CF-Connecting-IP` (or Caddy's `X-Forwarded-For`) and HTTPS from `X-Forwarded-Proto`. These headers are believed only from `TRUSTED_PROXIES` (default: private and loopback ranges), so outside visitors can't fake them.
- After 10 failed sign-ins for an email or client address within 15 minutes, further attempts get a 429 until the window passes. The counter is in memory, so it resets when the container restarts.
- New accounts must confirm their email with a 6-digit code before they can save crawlers or edit the profile. Codes expire after 15 minutes or 5 wrong tries, and a new one can be requested once a minute. An address nobody has verified (and with no saved crawlers) can be registered again, so a mistyped or squatted sign-up can't lock the owner out.
- **Edit profile** (the name button in the header) changes the display name and email. Changing the email needs the current password and a code sent to the new address; the old address gets a notice once the change goes through.
- API docs: `http://localhost:4173/api/docs`.

#### Custom Races and Classes

**Custom Races & Classes** in the header opens the workshop. Custom Races and Classes are made with the Race & Class Point Build System (`dcc-classes.pdf` pp. 158-162) and kept apart from any crawler.

- **Rules (`dist/builds.js`):**
  - Point pools: 25 Race and 30 Class Build Points, kept separate.
  - Benefits: the book's benefit menu, plus your own benefits with a tier agreed with the GM.
  - Detriments: they add at most 5 Build Points.
  - Limits: a Class can have at most 5 points of Passive Skills, and DR Buffs stop at +3.
  - Earth builds: an Earth Race or Class gets a Silver Earth Box, and an Earth Class needs an Earth Race.
  - Applied automatically: Stat, Skill and Spell, Rank 20, DR, Move, Step, Size and stat-cap effects work like a book Race or Class. Everything else goes in the sheet's notes.
- **Saving and sharing:** a verified account can keep up to 20 builds, private or shared publicly. Shared builds can be browsed by anyone, signed in or not, and show the author's profile name. Two shared builds of the same kind can't have the same name.
- **Using a build:** "Use for this crawler" copies the build onto the crawler. Later edits or deletes don't change crawlers that already use it, and the card offers to update to the new version. The rules are checked again when a crawler takes a build.
- **Name rules:** names must be 2-40 characters of letters, numbers and simple punctuation. They can't reuse a book Race or Class name or contain links.
- **Filter (`server/moderation.py`):** build names, all text in a build and profile names are screened for slurs, sexual terms and strong profanity. The filter sees through common disguises (`sh1t`, `f u c k`, `fuuuck`) but allows harmless words that contain blocked ones (Cockroach, Grape, Scunthorpe) and mild words like damn or bastard. The word lists are at the top of `server/moderation.py`.

#### Sign in with Google

1. In [Google Cloud Console](https://console.cloud.google.com/), open **APIs & Services → OAuth consent screen** (Google Auth Platform) and set it up as **External**, with the `openid`, `email` and `profile` scopes.
2. Under **Clients** (Credentials), create an OAuth client of type **Web application** with the authorized redirect URI `https://<your-site>/api/auth/google/callback`.
3. Add to `.env`, then `docker compose up -d`:

```sh
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
PUBLIC_URL=https://<your-site>
```

The "Continue with Google" button appears once both client values are set. A Google account links to an existing account through its verified email; if that account never verified its email, its password is removed, since whoever set it never proved they own the address. New Google accounts are verified from the start. Accounts that only use Google change their email without a password, but still confirm the new address with a code.

#### Email

Settings go in a `.env` file next to `docker-compose.yaml` (it's gitignored). Run `docker compose up -d` after changing it.

**Bird** (used first when set):

```sh
BIRD_API_KEY=bk_...
MAIL_FROM="Crawler Intake <noreply@mail.example.com>"   # optional
```

Without `MAIL_FROM`, mail comes from Bird's shared onboarding sender (`onboarding@messagebird.dev`). That sender needs no setup, but it only delivers to verified members of your Bird workspace. To email anyone else, verify a sending domain in Bird (Email > Domains), then set `MAIL_FROM` to an address on it.

**SMTP**:

```sh
SMTP_HOST=smtp.example.com
SMTP_PORT=587               # 465 with SMTP_SECURITY=ssl
SMTP_SECURITY=starttls      # starttls | ssl | none
SMTP_USERNAME=you@example.com
SMTP_PASSWORD=app-password
MAIL_FROM="Crawler Intake <you@example.com>"
```

With neither `BIRD_API_KEY` nor `SMTP_HOST`, nothing is sent: each email, code included, is written to the container log instead (`docker compose logs crawler-builder`).

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
