from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Iterable
import time

import httpx

from app.config import settings
from app.literature.database import get_connection, init_database


ProgressCallback = Callable[[int, int, str, str], None]


@dataclass
class DownloadSummary:
    attempted: int = 0
    downloaded: int = 0
    skipped: int = 0
    failed: int = 0
    bytes_downloaded: int = 0
    failures: list[dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["megabytes_downloaded"] = round(self.bytes_downloaded / (1024 * 1024), 2)
        return payload


@dataclass(frozen=True)
class _DownloadJob:
    paper_id: int
    openalex_id: str
    pdf_url: str
    target: Path


@dataclass(frozen=True)
class _DownloadResult:
    job: _DownloadJob
    status: str
    bytes_written: int = 0
    reason: str = ""


def _api_root() -> Path:
    return Path(__file__).resolve().parents[2]


def pdf_directory() -> Path:
    value = Path(settings.literature_pdf_directory)
    if value.is_absolute():
        return value.resolve()
    return (_api_root() / value).resolve()


def _relative_path_for_database(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(_api_root()).as_posix()
    except ValueError:
        return str(resolved)


def resolve_local_pdf_path(value: str | None) -> Path | None:
    """Resolve a DB local_pdf_path safely and only return an existing PDF file.

    New downloads are stored as paths relative to apps/api so the project can be moved
    between machines. Absolute paths written by older versions remain supported.
    """
    if not value:
        return None
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = _api_root() / candidate
    try:
        resolved = candidate.resolve()
        root = pdf_directory()
        resolved.relative_to(root)
    except (OSError, ValueError):
        return None
    if resolved.suffix.lower() != ".pdf" or not resolved.is_file():
        return None
    return resolved


def _looks_like_pdf_header(chunk: bytes) -> bool:
    return b"%PDF-" in chunk[:1024]


def _sanitize_openalex_id(value: str) -> str:
    safe = "".join(ch for ch in value if ch.isalnum() or ch in {"-", "_"})
    return safe or "paper"


def _download_one(job: _DownloadJob, timeout: float, retries: int, max_bytes: int) -> _DownloadResult:
    partial = job.target.with_suffix(".pdf.part")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/128.0 Safari/537.36 NeuroEvo-AD/1.0"
        ),
        "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5",
    }

    for attempt in range(max(0, retries) + 1):
        try:
            with httpx.Client(
                timeout=httpx.Timeout(timeout, connect=min(timeout, 20.0)),
                follow_redirects=True,
                headers=headers,
            ) as client:
                with client.stream("GET", job.pdf_url) as response:
                    response.raise_for_status()
                    total = 0
                    first_chunk = b""
                    partial.parent.mkdir(parents=True, exist_ok=True)
                    with partial.open("wb") as handle:
                        for chunk in response.iter_bytes(chunk_size=128 * 1024):
                            if not chunk:
                                continue
                            if len(first_chunk) < 1024:
                                first_chunk += chunk[: 1024 - len(first_chunk)]
                            total += len(chunk)
                            if max_bytes > 0 and total > max_bytes:
                                raise ValueError(f"PDF exceeds size limit ({max_bytes // (1024 * 1024)} MB)")
                            handle.write(chunk)

                    if not _looks_like_pdf_header(first_chunk):
                        content_type = response.headers.get("content-type", "unknown")
                        raise ValueError(f"response is not a PDF (content-type={content_type})")
                    if total < 256:
                        raise ValueError("PDF response is unexpectedly small")

                    partial.replace(job.target)
                    return _DownloadResult(job=job, status="downloaded", bytes_written=total)
        except (httpx.HTTPError, OSError, ValueError) as exc:
            try:
                partial.unlink(missing_ok=True)
            except OSError:
                pass
            if attempt >= max(0, retries):
                return _DownloadResult(job=job, status="failed", reason=str(exc))
            time.sleep(min(1.5 * (attempt + 1), 4.0))

    return _DownloadResult(job=job, status="failed", reason="unknown download error")


def _eligible_rows(limit: int | None, overwrite: bool) -> Iterable[object]:
    pending_clause = "" if overwrite else "AND (local_pdf_path IS NULL OR local_pdf_path = '')"
    limit_clause = ""
    params: tuple[object, ...] = ()
    if limit is not None and limit > 0:
        limit_clause = "LIMIT ?"
        params = (limit,)
    with get_connection() as connection:
        return connection.execute(
            f"""
            SELECT id, openalex_id, pdf_url, local_pdf_path
            FROM papers
            WHERE is_oa = 1 AND pdf_url IS NOT NULL AND pdf_url <> ''
            {pending_clause}
            ORDER BY cited_by_count DESC, publication_date DESC
            {limit_clause}
            """,
            params,
        ).fetchall()


def download_open_access_pdfs(
    limit: int | None = 100,
    overwrite: bool = False,
    timeout: float = 60.0,
    workers: int = 4,
    retries: int = 2,
    max_pdf_mb: int = 150,
    progress: ProgressCallback | None = None,
) -> DownloadSummary:
    """Download all recorded OA PDF URLs into apps/api/data/pdfs.

    The function is resumable: successfully localized rows are skipped on later runs.
    Set limit=None (or <=0 from the CLI) to process every eligible paper.
    """
    init_database()
    output_dir = pdf_directory()
    output_dir.mkdir(parents=True, exist_ok=True)
    summary = DownloadSummary()
    rows = list(_eligible_rows(limit, overwrite))

    jobs: list[_DownloadJob] = []
    for row in rows:
        summary.attempted += 1
        target = output_dir / f"{_sanitize_openalex_id(str(row['openalex_id']))}.pdf"
        existing = resolve_local_pdf_path(row["local_pdf_path"])
        if not overwrite and (existing is not None or target.is_file()):
            existing_target = existing or target
            with get_connection() as connection:
                connection.execute(
                    "UPDATE papers SET local_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (_relative_path_for_database(existing_target), row["id"]),
                )
            summary.skipped += 1
            if progress:
                progress(summary.downloaded + summary.skipped + summary.failed, len(rows), str(row["openalex_id"]), "skipped")
            continue
        jobs.append(
            _DownloadJob(
                paper_id=int(row["id"]),
                openalex_id=str(row["openalex_id"]),
                pdf_url=str(row["pdf_url"]),
                target=target,
            )
        )

    max_bytes = max(0, max_pdf_mb) * 1024 * 1024
    worker_count = max(1, min(int(workers), 12))
    completed = summary.skipped

    with ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="neuroevo-pdf") as pool:
        futures = {
            pool.submit(_download_one, job, timeout, retries, max_bytes): job
            for job in jobs
        }
        for future in as_completed(futures):
            result = future.result()
            completed += 1
            if result.status == "downloaded":
                with get_connection() as connection:
                    connection.execute(
                        "UPDATE papers SET local_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (_relative_path_for_database(result.job.target), result.job.paper_id),
                    )
                summary.downloaded += 1
                summary.bytes_downloaded += result.bytes_written
            else:
                summary.failed += 1
                summary.failures.append(
                    {
                        "openalex_id": result.job.openalex_id,
                        "url": result.job.pdf_url,
                        "reason": result.reason,
                    }
                )
            if progress:
                progress(completed, len(rows), result.job.openalex_id, result.status)

    return summary
