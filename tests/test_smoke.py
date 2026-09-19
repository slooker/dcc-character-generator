from __future__ import annotations

import hashlib
import importlib.util
import re
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def load_serve_module():
    spec = importlib.util.spec_from_file_location("crawler_serve", ROOT / "serve.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load serve.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class ServerSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        serve = load_serve_module()
        cls.httpd = serve.make_server("127.0.0.1", 0)
        cls.port = cls.httpd.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=2)

    def test_root_and_required_assets_return_200(self) -> None:
        # This is the regression test for the reported localhost:4173 404.
        for path in (
            "/",
            "/app.js",
            "/rules.js",
            "/details.js",
            "/pdf.js",
            "/style.css",
            "/character-sheet.pdf",
            "/vendor/pdf-lib.min.js",
        ):
            with self.subTest(path=path):
                with urlopen(self.base_url + path, timeout=5) as response:
                    self.assertEqual(response.status, 200)
                    self.assertGreater(len(response.read()), 0)

    def test_server_is_pinned_to_project_dist_directory(self) -> None:
        serve = load_serve_module()
        self.assertEqual(serve.DIST_DIR, DIST.resolve())
        self.assertTrue((serve.DIST_DIR / "index.html").is_file())


class ProjectStructureTests(unittest.TestCase):
    def test_no_npm_test_scaffold_remains(self) -> None:
        self.assertFalse((ROOT / "package.json").exists())
        self.assertFalse((ROOT / "tests" / "smoke.mjs").exists())
        self.assertTrue((ROOT / "tests" / "test_smoke.py").exists())

    def test_index_references_existing_assets(self) -> None:
        index = (DIST / "index.html").read_text(encoding="utf-8")
        for asset in (
            "style.css",
            "vendor/pdf-lib.min.js",
            "app.js",
        ):
            self.assertIn(asset, index)
            self.assertTrue((DIST / asset).is_file(), asset)

    def test_crawler_number_rule_is_current(self) -> None:
        rules = (DIST / "rules.js").read_text(encoding="utf-8")
        self.assertRegex(rules, r"const min = 50000;")
        self.assertRegex(rules, r"const max = 12900000;")
        self.assertIn("number: generateCrawlerNumber()", rules)
        self.assertNotIn("Number(s.number)<500000", rules)
        self.assertNotIn("Choose a crawler number", rules)

    def test_first_draft_still_requires_player_choices(self) -> None:
        rules = (DIST / "rules.js").read_text(encoding="utf-8")
        # The first draft should expose the authored background tables and the
        # standard-array validation, not a whole-character randomizer.
        for stage in ("Childhood", "Adolescence", "Career", "Hobby", "Youth", "Training", "Adult", "Quirk"):
            self.assertIn(f"name: '{stage}'", rules)
        self.assertIn("Assign 2, 3, 4, 5, and 6 to the five Stats, using each number once.", rules)
        self.assertNotRegex(rules, r"export function randomize(Character|Crawler|All)")

    def test_key_validation_guards_are_present(self) -> None:
        rules = (DIST / "rules.js").read_text(encoding="utf-8")
        for message in (
            "Intelligence 4 or higher",
            "different Hotlist slot",
            "paired hand-to-hand Damage Effect",
            "printed Stat discrepancy",
        ):
            self.assertIn(message, rules)

    def test_pdf_field_map_contains_known_critical_fields(self) -> None:
        pdf_js = (DIST / "pdf.js").read_text(encoding="utf-8")
        for field in (
            "'crawler number'",
            "'Text Field 37'",  # Current Mana
            "'Text Field 38'",  # Max Mana
            "'Text Field 551'", # unusual attack rank field
            "const base = 103 + row * 6", # first Skill row
            "const base = 223 + row * 3", # first Inventory row
        ):
            self.assertIn(field, pdf_js)
        self.assertIn("form.updateFieldAppearances", pdf_js)
        self.assertIn("useObjectStreams: false", pdf_js)

    def test_stats_page_blocks_invalid_standard_array(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        rules = (DIST / "rules.js").read_text(encoding="utf-8")
        self.assertIn("export function statValidationErrors(state)", rules)
        self.assertIn("Each Standard Array value can be used only once", rules)
        self.assertIn('data-action="continue-stats"', app)
        self.assertIn("statIssues.length ? 'disabled aria-disabled=\"true\"' : ''", app)
        self.assertIn("statValidationErrors(state)", app)

    def test_background_continue_targets_first_incomplete_stage(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        rules = (DIST / "rules.js").read_text(encoding="utf-8")
        self.assertIn("export function backgroundStageComplete(state, stageIndex)", rules)
        self.assertIn("export function firstIncompleteBackgroundStage(state)", rules)
        self.assertIn('data-action="continue-backgrounds"', app)
        self.assertIn("activeBackgroundStage = missingStage", app)
        self.assertIn("return navigate('combat')", app)

    def test_identity_name_and_pronouns_use_matching_label_rows(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        css = (DIST / "style.css").read_text(encoding="utf-8")
        self.assertIn('<span class="field-label">Crawler name</span>', app)
        self.assertIn('<span class="field-label">Gender / pronouns <span class="optional">optional</span></span>', app)
        self.assertIn(".field-label{", css)

    def test_forward_sidebar_navigation_cannot_bypass_background_or_stat_validation(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        self.assertIn("targetIndex > currentIndex && activeStep === 'backgrounds'", app)
        self.assertIn("targetIndex > currentIndex && activeStep === 'stats'", app)
        self.assertIn("firstIncompleteBackgroundStage(state)", app)
        self.assertIn("statValidationErrors(state)", app)


    def test_pdf_defaults_level_and_floor_to_one(self) -> None:
        pdf_js = (DIST / "pdf.js").read_text(encoding="utf-8")
        self.assertIn("setField(form, 'level', 1", pdf_js)
        self.assertIn("setField(form, 'Floor', 1", pdf_js)
        self.assertNotIn("clearField(form, 'level')", pdf_js)
        self.assertNotIn("clearField(form, 'Floor')", pdf_js)

    def test_starting_possessions_use_responsive_aligned_field_markup(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        css = (DIST / "style.css").read_text(encoding="utf-8")
        for field_class in (
            "item-field-name",
            "item-field-qty",
            "item-field-location",
            "item-field-note",
        ):
            self.assertIn(field_class, app)
        self.assertIn('<span class="field-label">Where is it carried?</span>', app)
        self.assertIn('<span class="field-label">Short note <span class="optional">optional</span></span>', app)
        self.assertIn("container-type:inline-size", css)
        self.assertIn('@container (max-width: 980px)', css)
        self.assertIn('@container (max-width: 560px)', css)
        self.assertIn('@media(max-width:1280px)', css)
        self.assertIn('@media(max-width:650px)', css)
        self.assertIn('grid-template-areas:"name qty location note"', css)
        self.assertIn('grid-template-areas:"name qty" "location note"', css)
        self.assertIn('grid-template-areas:"name" "qty" "location" "note"', css)

    def test_tablet_layout_switches_to_full_width_content(self) -> None:
        css = (DIST / "style.css").read_text(encoding="utf-8")
        self.assertIn('@media(max-width:860px)', css)
        self.assertIn('.shell{display:flex;flex-direction:column', css)
        self.assertIn('nav{flex-direction:row;overflow-x:auto', css)
        self.assertIn('.shell>main,.shell>aside{width:100%;min-width:0}', css)

    def test_hotlist_collision_is_rejected_at_selection_time(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        self.assertIn("function warnIfHotlistCollision", app)
        self.assertIn("is already being used by", app)
        self.assertIn("warnIfHotlistCollision(value, key)", app)
        self.assertIn("warnIfHotlistCollision(target.value, `item:${item.id}`)", app)
        self.assertIn("target.value = state[target.dataset.bind]", app)

    def test_hotlist_supports_drag_reorder_and_accessible_buttons(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        css = (DIST / "style.css").read_text(encoding="utf-8")
        self.assertIn("function reorderHotlist(fromSlot, toSlot)", app)
        self.assertIn('draggable="true"', app)
        self.assertIn('data-hotlist-move=', app)
        self.assertIn("main.addEventListener('dragstart'", app)
        self.assertIn("main.addEventListener('drop'", app)
        self.assertIn("main.addEventListener('pointerdown'", app)
        self.assertIn("main.addEventListener('pointermove'", app)
        self.assertIn(".hotlist-drag-handle{", css)
        self.assertIn("touch-action:none", css)

    def test_hotlist_reorder_updates_all_assignment_types(self) -> None:
        app = (DIST / "app.js").read_text(encoding="utf-8")
        for marker in (
            "state.healSlot = String(slot)",
            "state.spellSlot = String(slot)",
            "state.potionsSlot = String(slot)",
            "state.weaponLocation = `hotlist:${slot}`",
            "item.location = `hotlist:${slot}`",
        ):
            self.assertIn(marker, app)



@unittest.skipIf(PdfReader is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class PdfTemplateTests(unittest.TestCase):
    def test_dist_template_is_exact_copy_of_supplied_sheet(self) -> None:
        self.assertEqual(
            sha256(ROOT / "fillable-character-sheet.pdf"),
            sha256(DIST / "character-sheet.pdf"),
        )

    def test_template_is_four_pages_and_fillable(self) -> None:
        reader = PdfReader(DIST / "character-sheet.pdf")
        self.assertEqual(len(reader.pages), 4)
        fields = reader.get_fields() or {}
        self.assertGreater(len(fields), 280)
        for name in (
            "Name",
            "Race",
            "Gender",
            "crawler number",
            "Text Field 37",
            "Text Field 38",
            "Text Field 551",
            "Text Field 103",
            "Text Field 223",
        ):
            self.assertIn(name, fields)


if __name__ == "__main__":
    unittest.main(verbosity=2)
