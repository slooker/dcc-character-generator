from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

try:
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine, inspect
except ImportError:  # pragma: no cover
    TestClient = None

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipIf(TestClient is None, "Install dev dependencies: python -m pip install -r requirements-dev.txt")
class ServerTests(unittest.TestCase):
    """FastAPI serves dist/ like the old nginx config and migrates SQLite at startup."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp = tempfile.TemporaryDirectory()
        cls.db_url = f"sqlite:///{cls.tmp.name}/test.db"
        os.environ["DATABASE_URL"] = cls.db_url
        from server import database
        from server.main import app

        database.get_engine.cache_clear()
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()  # runs the lifespan (migrations)

    @classmethod
    def tearDownClass(cls) -> None:
        from server import database

        cls.client_cm.__exit__(None, None, None)
        database.get_engine().dispose()
        database.get_engine.cache_clear()
        os.environ.pop("DATABASE_URL", None)
        cls.tmp.cleanup()

    def test_startup_migrates_to_head(self) -> None:
        engine = create_engine(self.db_url)
        try:
            self.assertIn("alembic_version", inspect(engine).get_table_names())
            with engine.connect() as conn:
                version = conn.exec_driver_sql("SELECT version_num FROM alembic_version").scalar()
        finally:
            engine.dispose()
        heads = [p.name.split("_")[1] for p in (ROOT / "server" / "alembic" / "versions").glob("*.py")]
        self.assertIn(version, heads)

    def test_health_checks_database(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_serves_index_and_assets_without_caching(self) -> None:
        index = self.client.get("/")
        self.assertEqual(index.status_code, 200)
        self.assertIn("CRAWLER INTAKE", index.text)
        self.assertEqual(index.headers["cache-control"], "no-store")
        script = self.client.get("/app.js")
        self.assertEqual(script.status_code, 200)
        self.assertTrue(script.headers["content-type"].startswith("text/javascript"))
        self.assertEqual(self.client.get("/character-sheet.pdf").headers["content-type"], "application/pdf")

    def test_missing_assets_404_and_other_paths_fall_back_to_index(self) -> None:
        self.assertEqual(self.client.get("/missing.js").status_code, 404)
        self.assertEqual(self.client.get("/missing.css").status_code, 404)
        fallback = self.client.get("/some/client/route")
        self.assertEqual(fallback.status_code, 200)
        self.assertIn("CRAWLER INTAKE", fallback.text)

    def test_unknown_api_route_is_404_not_index(self) -> None:
        self.assertEqual(self.client.get("/api/nope").status_code, 404)

    def test_cannot_escape_dist(self) -> None:
        response = self.client.get("/..%2Fserver%2Fmain.py")
        self.assertNotIn("FastAPI app", response.text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
