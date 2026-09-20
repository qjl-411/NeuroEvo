from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.literature.database import get_connection, init_database  # noqa: E402
from app.literature.pdf_download import download_open_access_pdfs, pdf_directory, resolve_local_pdf_path  # noqa: E402


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Download NeuroEvo-AD open-access literature PDFs into local storage."
    )
    result.add_argument("--all", action="store_true", help="Process all recorded OA PDF URLs")
    result.add_argument("--limit", type=int, default=100, help="Maximum papers when --all is not set")
    result.add_argument("--workers", type=int, default=4, help="Concurrent downloads (recommended: 3-6)")
    result.add_argument("--retries", type=int, default=2)
    result.add_argument("--timeout", type=float, default=60.0)
    result.add_argument("--max-pdf-mb", type=int, default=150)
    result.add_argument("--overwrite", action="store_true")
    return result


def count_status() -> tuple[int, int]:
    init_database()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT local_pdf_path
            FROM papers
            WHERE is_oa = 1 AND pdf_url IS NOT NULL AND pdf_url <> ''
            """
        ).fetchall()
    return len(rows), sum(1 for row in rows if resolve_local_pdf_path(row["local_pdf_path"]) is not None)


def main() -> int:
    args = parser().parse_args()
    eligible, already_local = count_status()
    print(f"[NeuroEvo] OA PDF URLs in database: {eligible}")
    print(f"[NeuroEvo] Already localized: {already_local}")
    print(f"[NeuroEvo] Target directory: {pdf_directory()}")

    def progress(done: int, total: int, openalex_id: str, status: str) -> None:
        print(f"[{done:>3}/{total:<3}] {status:<10} {openalex_id}", flush=True)

    summary = download_open_access_pdfs(
        limit=None if args.all else max(1, args.limit),
        overwrite=args.overwrite,
        workers=args.workers,
        retries=args.retries,
        timeout=args.timeout,
        max_pdf_mb=args.max_pdf_mb,
        progress=progress,
    )
    print("\n=== Localization summary ===")
    print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
    remaining_eligible, localized = count_status()
    print(f"\n[NeuroEvo] Local PDFs now available: {localized}/{remaining_eligible}")
    if summary.failed:
        report = API_ROOT / "data" / "pdf_download_failures.json"
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(json.dumps(summary.failures, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[NeuroEvo] Failure report: {report}")
        print("Re-run the same command later; successful PDFs are skipped automatically.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
