"""SQLite persistence; each request owns its connection."""
import sqlite3
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def connection(data_dir: Path):
    db = sqlite3.connect(data_dir / "assets.sqlite", timeout=5)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "uploads").mkdir(exist_ok=True)
    with connection(data_dir) as db:
        db.executescript("""
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL COLLATE NOCASE UNIQUE,
                category TEXT NOT NULL,
                photo_filename TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'automated'))
            );
            CREATE INDEX IF NOT EXISTS assets_created_at ON assets(created_at DESC);
            CREATE INDEX IF NOT EXISTS assets_category ON assets(category);
        """)


def serialize(row):
    return {
        "id": row["id"],
        "assetId": row["asset_id"],
        "category": row["category"],
        "photoUrl": f'/uploads/{row["photo_filename"]}',
        "createdAt": row["created_at"],
        "source": row["source"],
    }
