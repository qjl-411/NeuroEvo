#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify the immutable production DMSA-Net checkpoint, then start FastAPI."
    )
    parser.add_argument("--checkpoint", default=os.getenv("NEUROEVO_MODEL_CHECKPOINT"))
    parser.add_argument("--device", default=os.getenv("NEUROEVO_MODEL_DEVICE", "auto"))
    parser.add_argument("--host", default=os.getenv("NEUROEVO_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.getenv("NEUROEVO_PORT", "8000")))
    parser.add_argument("--workers", type=int, default=1)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.checkpoint:
        print("FATAL: checkpoint is not configured. Set NEUROEVO_MODEL_CHECKPOINT or pass --checkpoint.", file=sys.stderr)
        return 2
    if args.workers != 1:
        print(
            "FATAL: Phase 4 production serving uses one API worker per GPU/model instance. "
            "Run multiple isolated instances only when you explicitly provision separate GPU memory.",
            file=sys.stderr,
        )
        return 2

    # Set runtime environment *before* importing any app.ml.dmsa module.
    # Importing app.ml.dmsa executes its package __init__, which imports the
    # inference service and therefore app.config.settings. Pydantic settings are
    # instantiated once at import time, so setting these variables afterwards
    # would leave the API thinking no checkpoint was configured.
    resolved_checkpoint = str(Path(args.checkpoint).expanduser().resolve())
    os.environ["NEUROEVO_MODEL_CHECKPOINT"] = resolved_checkpoint
    os.environ["NEUROEVO_MODEL_DEVICE"] = args.device

    from app.ml.dmsa.production import format_report, verify_production_checkpoint

    report = verify_production_checkpoint(resolved_checkpoint, device=args.device, run_forward=True)
    print(format_report(report), flush=True)
    if not report.ready:
        print("FATAL: refusing to start API because the production model did not pass verification.", file=sys.stderr)
        return 2

    # The same verified path/device are already in the environment before the
    # application settings were imported.
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        workers=1,
        reload=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
