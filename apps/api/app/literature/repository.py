from __future__ import annotations

from collections import defaultdict
import json
import re
import sqlite3
from typing import Any, Iterable

from app.literature.database import get_connection, init_database
from app.literature.pdf_download import resolve_local_pdf_path


FTS_TOKEN_PATTERN = re.compile(r"[\w-]+", flags=re.UNICODE)


def build_fts_query(query: str) -> str:
    tokens = [token for token in FTS_TOKEN_PATTERN.findall(query) if token.strip("-_")]
    return " AND ".join(f'"{token.replace(chr(34), chr(34) * 2)}"' for token in tokens)


def upsert_paper(record: dict[str, Any], topics: list[tuple[str, float]], relevance_score: int) -> tuple[int, bool]:
    init_database()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM papers WHERE openalex_id = ?",
            (record["openalex_id"],),
        ).fetchone()

        connection.execute(
            """
            INSERT INTO papers (
                openalex_id, doi, title, abstract, publication_year, publication_date, work_type,
                authors, journal, cited_by_count, is_oa, oa_status, pdf_url, landing_page_url,
                primary_custom_topic, openalex_topics_json, relevance_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(openalex_id) DO UPDATE SET
                doi = COALESCE(excluded.doi, papers.doi),
                title = excluded.title,
                abstract = excluded.abstract,
                publication_year = excluded.publication_year,
                publication_date = excluded.publication_date,
                work_type = excluded.work_type,
                authors = excluded.authors,
                journal = excluded.journal,
                cited_by_count = excluded.cited_by_count,
                is_oa = excluded.is_oa,
                oa_status = excluded.oa_status,
                pdf_url = COALESCE(excluded.pdf_url, papers.pdf_url),
                landing_page_url = COALESCE(excluded.landing_page_url, papers.landing_page_url),
                primary_custom_topic = excluded.primary_custom_topic,
                openalex_topics_json = excluded.openalex_topics_json,
                relevance_score = excluded.relevance_score,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                record["openalex_id"],
                record.get("doi"),
                record.get("title") or "Untitled",
                record.get("abstract") or "",
                record.get("publication_year"),
                record.get("publication_date"),
                record.get("work_type"),
                record.get("authors") or "",
                record.get("journal") or "",
                int(record.get("cited_by_count") or 0),
                1 if record.get("is_oa") else 0,
                record.get("oa_status"),
                record.get("pdf_url"),
                record.get("landing_page_url"),
                topics[0][0] if topics else None,
                record.get("openalex_topics_json") or "[]",
                int(relevance_score),
            ),
        )

        row = connection.execute("SELECT id FROM papers WHERE openalex_id = ?", (record["openalex_id"],)).fetchone()
        if row is None:
            raise RuntimeError("Failed to retrieve paper after upsert.")
        paper_id = int(row["id"])

        connection.execute("DELETE FROM paper_topics WHERE paper_id = ?", (paper_id,))
        if topics:
            connection.executemany(
                "INSERT OR REPLACE INTO paper_topics(paper_id, topic_slug, score) VALUES (?, ?, ?)",
                [(paper_id, slug, score) for slug, score in topics],
            )

        connection.execute("DELETE FROM papers_fts WHERE paper_id = ?", (paper_id,))
        connection.execute(
            "INSERT INTO papers_fts(paper_id, title, abstract, authors, journal) VALUES (?, ?, ?, ?, ?)",
            (
                paper_id,
                record.get("title") or "",
                record.get("abstract") or "",
                record.get("authors") or "",
                record.get("journal") or "",
            ),
        )

        return paper_id, existing is None


def set_sync_state(key: str, value: str) -> None:
    init_database()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO sync_state(key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """,
            (key, value),
        )


def get_sync_state(key: str) -> str | None:
    init_database()
    with get_connection() as connection:
        row = connection.execute("SELECT value FROM sync_state WHERE key = ?", (key,)).fetchone()
        return str(row["value"]) if row else None


def _base_filter_clauses(
    query: str | None,
    year: int | None,
    year_from: int | None,
    year_to: int | None,
    topic: str | None,
    oa: bool | None,
) -> tuple[str, list[Any], bool, str]:
    joins: list[str] = []
    clauses: list[str] = ["1=1"]
    params: list[Any] = []
    has_fts = False

    if query and query.strip():
        fts_query = build_fts_query(query)
        if fts_query:
            joins.append("JOIN papers_fts ON papers_fts.paper_id = p.id")
            clauses.append("papers_fts MATCH ?")
            params.append(fts_query)
            has_fts = True

    if year is not None:
        clauses.append("p.publication_year = ?")
        params.append(year)
    else:
        if year_from is not None:
            clauses.append("p.publication_year >= ?")
            params.append(year_from)
        if year_to is not None:
            clauses.append("p.publication_year <= ?")
            params.append(year_to)

    if topic:
        clauses.append("EXISTS (SELECT 1 FROM paper_topics pt_filter WHERE pt_filter.paper_id = p.id AND pt_filter.topic_slug = ?)")
        params.append(topic)

    if oa is not None:
        clauses.append("p.is_oa = ?")
        params.append(1 if oa else 0)

    return " ".join(joins), params, has_fts, " AND ".join(clauses)


def _topics_for_paper_ids(connection: sqlite3.Connection, paper_ids: Iterable[int]) -> dict[int, list[dict[str, Any]]]:
    ids = list(paper_ids)
    if not ids:
        return {}
    placeholders = ",".join("?" for _ in ids)
    rows = connection.execute(
        f"""
        SELECT pt.paper_id, t.slug, t.name_zh, t.description, pt.score
        FROM paper_topics pt
        JOIN topics t ON t.slug = pt.topic_slug
        WHERE pt.paper_id IN ({placeholders})
        ORDER BY pt.paper_id, pt.score DESC, t.name_zh
        """,
        ids,
    ).fetchall()
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[int(row["paper_id"])].append(
            {
                "slug": row["slug"],
                "name_zh": row["name_zh"],
                "description": row["description"],
                "score": row["score"],
            }
        )
    return dict(grouped)


def list_papers(
    *,
    query: str | None = None,
    year: int | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    topic: str | None = None,
    oa: bool | None = None,
    sort: str = "relevance",
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    init_database()
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    joins, params, has_fts, where = _base_filter_clauses(query, year, year_from, year_to, topic, oa)

    valid_sorts = {"relevance", "citations", "latest", "oldest"}
    if sort not in valid_sorts:
        sort = "relevance"
    if sort == "citations":
        order_by = "p.cited_by_count DESC, p.publication_date DESC"
    elif sort == "latest":
        order_by = "p.publication_date DESC, p.cited_by_count DESC"
    elif sort == "oldest":
        order_by = "p.publication_date ASC, p.cited_by_count DESC"
    elif has_fts:
        order_by = "bm25(papers_fts) ASC, p.cited_by_count DESC"
    else:
        order_by = "p.cited_by_count DESC, p.publication_date DESC"

    with get_connection() as connection:
        count_row = connection.execute(
            f"SELECT COUNT(DISTINCT p.id) AS total FROM papers p {joins} WHERE {where}",
            params,
        ).fetchone()
        total = int(count_row["total"] if count_row else 0)

        select_rank = ", bm25(papers_fts) AS search_rank" if has_fts else ", NULL AS search_rank"
        rows = connection.execute(
            f"""
            SELECT p.* {select_rank}
            FROM papers p
            {joins}
            WHERE {where}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()

        topics_map = _topics_for_paper_ids(connection, [int(row["id"]) for row in rows])
        items: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["is_oa"] = bool(item["is_oa"])
            item["topics"] = topics_map.get(int(item["id"]), [])
            item["has_local_pdf"] = resolve_local_pdf_path(item.get("local_pdf_path")) is not None
            try:
                item["openalex_topics"] = json.loads(item.get("openalex_topics_json") or "[]")
            except json.JSONDecodeError:
                item["openalex_topics"] = []
            item.pop("openalex_topics_json", None)
            items.append(item)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


def get_paper(paper_id: int) -> dict[str, Any] | None:
    init_database()
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if row is None:
            return None
        item = dict(row)
        item["is_oa"] = bool(item["is_oa"])
        item["topics"] = _topics_for_paper_ids(connection, [paper_id]).get(paper_id, [])
        item["has_local_pdf"] = resolve_local_pdf_path(item.get("local_pdf_path")) is not None
        try:
            item["openalex_topics"] = json.loads(item.get("openalex_topics_json") or "[]")
        except json.JSONDecodeError:
            item["openalex_topics"] = []
        item.pop("openalex_topics_json", None)
        return item


def list_topics() -> list[dict[str, Any]]:
    init_database()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT slug, name_zh, description FROM topics ORDER BY name_zh"
        ).fetchall()
        return [dict(row) for row in rows]


def year_stats(
    *, query: str | None = None, topic: str | None = None, oa: bool | None = None
) -> list[dict[str, int]]:
    init_database()
    joins, params, _, where = _base_filter_clauses(query, None, None, None, topic, oa)
    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT p.publication_year AS year, COUNT(DISTINCT p.id) AS count
            FROM papers p
            {joins}
            WHERE {where} AND p.publication_year IS NOT NULL
            GROUP BY p.publication_year
            ORDER BY p.publication_year
            """,
            params,
        ).fetchall()
        return [{"year": int(row["year"]), "count": int(row["count"])} for row in rows]


def topic_stats(
    *,
    query: str | None = None,
    year: int | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    oa: bool | None = None,
) -> list[dict[str, Any]]:
    init_database()
    joins, params, _, where = _base_filter_clauses(query, year, year_from, year_to, None, oa)
    with get_connection() as connection:
        count_rows = connection.execute(
            f"""
            SELECT pt.topic_slug AS slug, COUNT(DISTINCT p.id) AS count
            FROM papers p
            JOIN paper_topics pt ON pt.paper_id = p.id
            {joins}
            WHERE {where}
            GROUP BY pt.topic_slug
            """,
            params,
        ).fetchall()
        counts = {str(row["slug"]): int(row["count"]) for row in count_rows}
        topic_rows = connection.execute(
            "SELECT slug, name_zh, description FROM topics ORDER BY name_zh"
        ).fetchall()
        result = [
            {
                "slug": row["slug"],
                "name_zh": row["name_zh"],
                "description": row["description"],
                "count": counts.get(str(row["slug"]), 0),
            }
            for row in topic_rows
        ]
        result.sort(key=lambda item: (-int(item["count"]), str(item["name_zh"])))
        return result


def quality_report(sample_per_topic: int = 3) -> dict[str, Any]:
    init_database()
    sample_per_topic = min(max(1, sample_per_topic), 10)
    with get_connection() as connection:
        total = int(connection.execute("SELECT COUNT(*) AS n FROM papers").fetchone()["n"] or 0)
        no_abstract = int(connection.execute("SELECT COUNT(*) AS n FROM papers WHERE abstract = ''").fetchone()["n"] or 0)
        no_topics = int(connection.execute("SELECT COUNT(*) AS n FROM papers p WHERE NOT EXISTS (SELECT 1 FROM paper_topics pt WHERE pt.paper_id = p.id)").fetchone()["n"] or 0)
        low_relevance = int(connection.execute("SELECT COUNT(*) AS n FROM papers WHERE relevance_score < 7").fetchone()["n"] or 0)
        topics = connection.execute("SELECT slug, name_zh FROM topics ORDER BY name_zh").fetchall()
        samples: dict[str, list[dict[str, Any]]] = {}
        for topic in topics:
            rows = connection.execute(
                """
                SELECT p.id, p.title, p.publication_year, p.cited_by_count, pt.score
                FROM paper_topics pt
                JOIN papers p ON p.id = pt.paper_id
                WHERE pt.topic_slug = ?
                ORDER BY pt.score DESC, p.cited_by_count DESC
                LIMIT ?
                """,
                (topic["slug"], sample_per_topic),
            ).fetchall()
            samples[str(topic["name_zh"])] = [dict(row) for row in rows]
    return {
        "total": total,
        "without_abstract": no_abstract,
        "without_custom_topic": no_topics,
        "low_relevance_lt_7": low_relevance,
        "topic_samples": samples,
    }


def global_stats() -> dict[str, Any]:
    init_database()
    with get_connection() as connection:
        totals = connection.execute(
            """
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN is_oa = 1 THEN 1 ELSE 0 END) AS oa,
                   SUM(CASE WHEN pdf_url IS NOT NULL AND pdf_url <> '' THEN 1 ELSE 0 END) AS pdf,
                   SUM(CASE WHEN local_pdf_path IS NOT NULL AND local_pdf_path <> '' THEN 1 ELSE 0 END) AS local_pdf_records
            FROM papers
            """
        ).fetchone()
        years = connection.execute(
            "SELECT publication_year AS year, COUNT(*) AS count FROM papers WHERE publication_year IS NOT NULL GROUP BY publication_year ORDER BY publication_year"
        ).fetchall()
        topics = connection.execute(
            """
            SELECT t.slug, t.name_zh, COUNT(pt.paper_id) AS count
            FROM topics t LEFT JOIN paper_topics pt ON pt.topic_slug = t.slug
            GROUP BY t.slug, t.name_zh ORDER BY count DESC
            """
        ).fetchall()
    return {
        "total": int(totals["total"] or 0),
        "oa": int(totals["oa"] or 0),
        "pdf": int(totals["pdf"] or 0),
        "local_pdf_records": int(totals["local_pdf_records"] or 0),
        "years": [dict(row) for row in years],
        "topics": [dict(row) for row in topics],
    }
