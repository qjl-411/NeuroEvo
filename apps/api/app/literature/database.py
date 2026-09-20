from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import sqlite3
from typing import Iterator

from app.config import settings
from app.literature.topics import topic_seed_rows


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openalex_id TEXT NOT NULL UNIQUE,
    doi TEXT UNIQUE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL DEFAULT '',
    publication_year INTEGER,
    publication_date TEXT,
    work_type TEXT,
    authors TEXT NOT NULL DEFAULT '',
    journal TEXT NOT NULL DEFAULT '',
    cited_by_count INTEGER NOT NULL DEFAULT 0,
    is_oa INTEGER NOT NULL DEFAULT 0,
    oa_status TEXT,
    pdf_url TEXT,
    landing_page_url TEXT,
    primary_custom_topic TEXT,
    openalex_topics_json TEXT NOT NULL DEFAULT '[]',
    local_pdf_path TEXT,
    relevance_score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
    slug TEXT PRIMARY KEY,
    name_zh TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS paper_topics (
    paper_id INTEGER NOT NULL,
    topic_slug TEXT NOT NULL,
    score REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (paper_id, topic_slug),
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_slug) REFERENCES topics(slug) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(publication_year);
CREATE INDEX IF NOT EXISTS idx_papers_citations ON papers(cited_by_count DESC);
CREATE INDEX IF NOT EXISTS idx_papers_oa ON papers(is_oa);
CREATE INDEX IF NOT EXISTS idx_paper_topics_topic ON paper_topics(topic_slug, paper_id);

CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
    paper_id UNINDEXED,
    title,
    abstract,
    authors,
    journal,
    tokenize='unicode61 remove_diacritics 2'
);
"""


def database_path() -> Path:
    path = Path(settings.literature_database)
    if not path.is_absolute():
        api_root = Path(__file__).resolve().parents[2]
        path = (api_root / path).resolve()
    return path


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_database() -> Path:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        connection.executemany(
            """
            INSERT INTO topics(slug, name_zh, description)
            VALUES (?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                name_zh = excluded.name_zh,
                description = excluded.description
            """,
            topic_seed_rows(),
        )
    return path
