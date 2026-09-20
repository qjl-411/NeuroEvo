from __future__ import annotations

from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
import json
from typing import Iterable

from app.literature.database import init_database
from app.literature.openalex import DEFAULT_SEED_QUERIES, OpenAlexClient, work_to_record
from app.literature.repository import set_sync_state, upsert_paper
from app.literature.topics import classify_topics, is_relevant_work, relevance_score


@dataclass
class SyncSummary:
    candidate_count: int = 0
    unique_count: int = 0
    relevant_count: int = 0
    inserted_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def sync_openalex(
    *,
    from_year: int,
    to_year: int,
    max_per_query: int = 200,
    queries: Iterable[str] | None = None,
    client: OpenAlexClient | None = None,
    sort: str = "relevance_score:desc,cited_by_count:desc",
) -> SyncSummary:
    init_database()
    summary = SyncSummary()
    seen_openalex_ids: set[str] = set()
    owns_client = client is None
    openalex = client or OpenAlexClient()

    started_at = datetime.now(timezone.utc).isoformat()
    set_sync_state("last_sync_started_at", started_at)
    set_sync_state("last_sync_status", "running")

    try:
        for query in queries or DEFAULT_SEED_QUERIES:
            try:
                works = openalex.iter_works(
                    query=query,
                    from_year=from_year,
                    to_year=to_year,
                    max_results=max_per_query,
                    per_page=100,
                    sort=sort,
                )
                for work in works:
                    summary.candidate_count += 1
                    record = work_to_record(work)
                    openalex_id = record["openalex_id"]
                    if not openalex_id or openalex_id in seen_openalex_ids:
                        continue
                    seen_openalex_ids.add(openalex_id)
                    summary.unique_count += 1

                    title = record.get("title") or ""
                    if not title:
                        summary.skipped_count += 1
                        continue
                    abstract = record.get("abstract") or ""
                    openalex_topics = record.get("openalex_topics") or []
                    if not is_relevant_work(title, abstract, openalex_topics):
                        summary.skipped_count += 1
                        continue

                    summary.relevant_count += 1
                    topic_scores = classify_topics(title, abstract, openalex_topics)
                    score = relevance_score(title, abstract, openalex_topics)
                    _, inserted = upsert_paper(record, topic_scores, score)
                    if inserted:
                        summary.inserted_count += 1
                    else:
                        summary.updated_count += 1
            except Exception as exc:
                summary.error_count += 1
                summary.errors.append(f"{query}: {exc}")

        completed_at = datetime.now(timezone.utc).isoformat()
        set_sync_state("last_sync_completed_at", completed_at)
        set_sync_state("last_sync_status", "completed" if summary.error_count == 0 else "completed_with_errors")
        set_sync_state("last_sync_summary", json.dumps(summary.to_dict(), ensure_ascii=False))
        set_sync_state("last_sync_from_year", str(from_year))
        set_sync_state("last_sync_to_year", str(to_year))
        return summary
    except Exception:
        set_sync_state("last_sync_status", "failed")
        raise
    finally:
        if owns_client:
            openalex.close()
