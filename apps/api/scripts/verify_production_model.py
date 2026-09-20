#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Strictly verify the frozen DMSA-Net final_model_epoch126.pth before deployment."
    )
    parser.add_argument("--checkpoint", required=True, help="Path to final_model_epoch126.pth")
    parser.add_argument(
        "--device",
        default="cpu",
        help="Device for the sanity forward pass. Use cpu on a laptop; use auto or cuda:0 on the server.",
    )
    parser.add_argument("--no-forward", action="store_true", help="Skip the dummy forward pass.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON instead of the text report.")
    parser.add_argument("--json-out", help="Optional path to also save the verification report as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    from app.ml.dmsa.production import format_report, verify_production_checkpoint

    report = verify_production_checkpoint(
        args.checkpoint,
        device=args.device,
        run_forward=not args.no_forward,
    )

    if args.json:
        print(report.to_json())
    else:
        print(format_report(report))

    if args.json_out:
        out = Path(args.json_out).expanduser().resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report.to_json() + "\n", encoding="utf-8")
        print(f"Verification JSON written to: {out}")

    return 0 if report.ready else 2


if __name__ == "__main__":
    raise SystemExit(main())
