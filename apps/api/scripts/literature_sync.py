from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.literature.database import init_database  # noqa: E402
from app.literature.repository import global_stats, quality_report  # noqa: E402
from app.literature.pdf_download import download_open_access_pdfs  # noqa: E402
from app.literature.sync import sync_openalex  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="NeuroEvo-AD OpenAlex literature pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init", help="Initialize the SQLite literature database")
    subparsers.add_parser("stats", help="Print database statistics")
    audit = subparsers.add_parser("audit", help="Print a small quality report and topic samples")
    audit.add_argument("--sample-per-topic", type=int, default=3)

    crawl = subparsers.add_parser("crawl", help="Fetch and index works from the configured OpenAlex seed queries")
    crawl.add_argument("--from-year", type=int, default=2018)
    crawl.add_argument("--to-year", type=int, default=date.today().year)
    crawl.add_argument("--max-per-query", type=int, default=200)

    classics = subparsers.add_parser("crawl-classics", help="Collect a smaller, citation-rich 2010-2017 classic literature slice")
    classics.add_argument("--max-per-query", type=int, default=20)

    download = subparsers.add_parser("download-pdfs", help="Download PDFs only from recorded open-access PDF URLs")
    download.add_argument("--limit", type=int, default=100, help="0 means all eligible PDFs")
    download.add_argument("--workers", type=int, default=4)
    download.add_argument("--retries", type=int, default=2)
    download.add_argument("--timeout", type=float, default=60.0)
    download.add_argument("--overwrite", action="store_true")

    sync = subparsers.add_parser("sync", help="Incrementally refresh the recent publication window")
    sync.add_argument("--lookback-years", type=int, default=2)
    sync.add_argument("--max-per-query", type=int, default=100)

    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "init":
        path = init_database()
        print(f"Initialized database: {path}")
        return 0
    if args.command == "stats":
        print(json.dumps(global_stats(), ensure_ascii=False, indent=2))
        return 0
    if args.command == "audit":
        print(json.dumps(quality_report(args.sample_per_topic), ensure_ascii=False, indent=2))
        return 0
    if args.command == "crawl-classics":
        summary = sync_openalex(from_year=2010, to_year=2017, max_per_query=args.max_per_query, sort="cited_by_count:desc")
        print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
        return 0
    if args.command == "download-pdfs":
        summary = download_open_access_pdfs(
            limit=None if args.limit <= 0 else args.limit,
            overwrite=args.overwrite,
            workers=args.workers,
            retries=args.retries,
            timeout=args.timeout,
        )
        print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
        return 0
    if args.command == "crawl":
        summary = sync_openalex(
            from_year=args.from_year,
            to_year=args.to_year,
            max_per_query=args.max_per_query,
        )
        print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
        return 0
    if args.command == "sync":
        current_year = date.today().year
        summary = sync_openalex(
            from_year=max(1900, current_year - max(0, args.lookback_years)),
            to_year=current_year,
            max_per_query=args.max_per_query,
            sort="publication_date:desc",
        )
        print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
