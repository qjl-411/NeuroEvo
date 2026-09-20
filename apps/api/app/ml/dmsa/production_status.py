from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from .production import verify_production_checkpoint


def build_production_status(checkpoint_path: str | Path | None, *, device: str = "cpu", run_forward: bool = False) -> Dict[str, Any]:
    """Return a JSON-friendly status object for diagnostics/health endpoints.

    This helper is intentionally additive: Phase 2/3 routes may call it without
    changing the analysis response contract.
    """
    if not checkpoint_path:
        return {
            "ready": False,
            "configured": False,
            "message": "NEUROEVO_MODEL_CHECKPOINT is not configured.",
        }

    report = verify_production_checkpoint(
        checkpoint_path,
        device=device,
        run_forward=run_forward,
    )
    return {
        "ready": report.ready,
        "configured": True,
        "checkpoint_path": report.checkpoint_path,
        "checkpoint_sha256": report.checkpoint_sha256,
        "checkpoint_size_bytes": report.checkpoint_size_bytes,
        "device": report.resolved_device,
        "checks": [
            {"name": c.name, "passed": c.passed, "detail": c.detail}
            for c in report.checks
        ],
        "metadata": report.metadata,
        "message": "DMSA-Net production model READY" if report.ready else "DMSA-Net production model verification failed.",
    }
