from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import json
import time
from typing import Any, Iterator

import httpx

from app.config import settings


OPENALEX_WORKS_URL = "https://api.openalex.org/works"
DEFAULT_SEED_QUERIES: tuple[str, ...] = (
    "Alzheimer disease MRI",
    "Alzheimer structural MRI",
    "Alzheimer MRI deep learning",
    "Alzheimer MRI machine learning",
    "Alzheimer MRI Transformer",
    "mild cognitive impairment MRI Alzheimer",
    "MCI conversion Alzheimer MRI",
    "Alzheimer disease progression prediction MRI",
    "Alzheimer explainable AI MRI",
    "Alzheimer MRI saliency Grad-CAM",
    "Alzheimer multimodal MRI PET",
    "Alzheimer hippocampal atrophy MRI",
    "ADNI Alzheimer MRI",
    "OASIS Alzheimer MRI",
)

SELECT_FIELDS = ",".join(
    (
        "id",
        "doi",
        "title",
        "abstract_inverted_index",
        "publication_year",
        "publication_date",
        "type",
        "authorships",
        "primary_location",
        "best_oa_location",
        "open_access",
        "topics",
        "primary_topic",
        "cited_by_count",
    )
)


class OpenAlexError(RuntimeError):
    pass


@dataclass(frozen=True)
class OpenAlexPage:
    results: list[dict[str, Any]]
    next_cursor: str | None
    total_count: int


def reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str:
    if not inverted_index:
        return ""
    positions: list[tuple[int, str]] = []
    for token, indexes in inverted_index.items():
        for index in indexes:
            positions.append((int(index), token))
    positions.sort(key=lambda item: item[0])
    return " ".join(token for _, token in positions)


def normalize_openalex_id(value: str | None) -> str:
    if not value:
        return ""
    return value.rsplit("/", 1)[-1]


def normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    doi = value.strip()
    for prefix in ("https://doi.org/", "http://doi.org/", "doi:"):
        if doi.lower().startswith(prefix):
            doi = doi[len(prefix) :]
            break
    return doi.lower() or None


def extract_authors(work: dict[str, Any], max_authors: int = 12) -> str:
    names: list[str] = []
    for authorship in work.get("authorships") or []:
        author = authorship.get("author") or {}
        name = author.get("display_name")
        if name:
            names.append(str(name))
        if len(names) >= max_authors:
            break
    if not names:
        return ""
    if len(work.get("authorships") or []) > max_authors:
        names.append("et al.")
    return ", ".join(names)


def extract_journal(work: dict[str, Any]) -> str:
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    return str(source.get("display_name") or "")


def extract_open_access(work: dict[str, Any]) -> tuple[bool, str | None, str | None, str | None]:
    open_access = work.get("open_access") or {}
    best_oa = work.get("best_oa_location") or {}
    primary = work.get("primary_location") or {}

    is_oa = bool(open_access.get("is_oa"))
    oa_status = open_access.get("oa_status")
    pdf_url = best_oa.get("pdf_url") or None
    landing_page_url = (
        best_oa.get("landing_page_url")
        or primary.get("landing_page_url")
        or open_access.get("oa_url")
        or None
    )
    return is_oa, oa_status, pdf_url, landing_page_url


def work_to_record(work: dict[str, Any]) -> dict[str, Any]:
    is_oa, oa_status, pdf_url, landing_page_url = extract_open_access(work)
    topics = work.get("topics") or []
    primary_topic = work.get("primary_topic")
    if primary_topic and not any(topic.get("id") == primary_topic.get("id") for topic in topics if isinstance(topic, dict)):
        topics = [primary_topic, *topics]

    return {
        "openalex_id": normalize_openalex_id(work.get("id")),
        "doi": normalize_doi(work.get("doi")),
        "title": (work.get("title") or "").strip(),
        "abstract": reconstruct_abstract(work.get("abstract_inverted_index")),
        "publication_year": work.get("publication_year"),
        "publication_date": work.get("publication_date"),
        "work_type": work.get("type"),
        "authors": extract_authors(work),
        "journal": extract_journal(work),
        "cited_by_count": int(work.get("cited_by_count") or 0),
        "is_oa": is_oa,
        "oa_status": oa_status,
        "pdf_url": pdf_url,
        "landing_page_url": landing_page_url,
        "openalex_topics": topics,
        "openalex_topics_json": json.dumps(topics, ensure_ascii=False),
    }


class OpenAlexClient:
    def __init__(self, api_key: str | None = None, timeout: float = 30.0) -> None:
        self.api_key = api_key or settings.openalex_api_key
        self.timeout = timeout
        self._client = httpx.Client(
            timeout=httpx.Timeout(timeout),
            headers={"User-Agent": "NeuroEvo-AD/0.1 literature-indexer"},
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "OpenAlexClient":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()

    def _request(self, params: dict[str, Any], retries: int = 5) -> dict[str, Any]:
        params = dict(params)
        if self.api_key:
            params["api_key"] = self.api_key

        last_error: Exception | None = None
        for attempt in range(retries):
            try:
                response = self._client.get(OPENALEX_WORKS_URL, params=params)
                if response.status_code == 429 or 500 <= response.status_code < 600:
                    delay = min(2**attempt, 16)
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        delay = max(delay, int(retry_after))
                    time.sleep(delay)
                    continue
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                if attempt == retries - 1:
                    break
                time.sleep(min(2**attempt, 16))
        raise OpenAlexError(f"OpenAlex request failed after {retries} attempts: {last_error}")

    def page(
        self,
        query: str,
        from_year: int,
        to_year: int,
        cursor: str = "*",
        per_page: int = 100,
        sort: str = "relevance_score:desc,cited_by_count:desc",
    ) -> OpenAlexPage:
        if per_page < 1 or per_page > 100:
            raise ValueError("OpenAlex per_page must be between 1 and 100.")
        if from_year > to_year:
            raise ValueError("from_year cannot be greater than to_year.")

        params = {
            "search": query,
            "filter": f"from_publication_date:{from_year}-01-01,to_publication_date:{to_year}-12-31",
            "sort": sort,
            "per_page": per_page,
            "cursor": cursor,
            "select": SELECT_FIELDS,
        }
        payload = self._request(params)
        meta = payload.get("meta") or {}
        return OpenAlexPage(
            results=list(payload.get("results") or []),
            next_cursor=meta.get("next_cursor"),
            total_count=int(meta.get("count") or 0),
        )

    def iter_works(
        self,
        query: str,
        from_year: int,
        to_year: int,
        max_results: int | None = None,
        per_page: int = 100,
        sort: str = "relevance_score:desc,cited_by_count:desc",
    ) -> Iterator[dict[str, Any]]:
        cursor = "*"
        yielded = 0
        while cursor:
            page_size = per_page
            if max_results is not None:
                remaining = max_results - yielded
                if remaining <= 0:
                    return
                page_size = min(page_size, remaining)

            page = self.page(query, from_year, to_year, cursor=cursor, per_page=page_size, sort=sort)
            if not page.results:
                return
            for work in page.results:
                yield work
                yielded += 1
                if max_results is not None and yielded >= max_results:
                    return
            if not page.next_cursor or page.next_cursor == cursor:
                return
            cursor = page.next_cursor

    @staticmethod
    def default_to_year() -> int:
        return date.today().year
