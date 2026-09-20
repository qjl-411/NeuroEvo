from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def build_analysis_report(
    *,
    analysis_id: str,
    model: dict[str, Any],
    prediction: dict[str, Any],
    probabilities: dict[str, float],
    explainability: dict[str, Any],
    runtime: dict[str, float],
    image: dict[str, Any] | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
    """Build the structured report payload for one completed MRI analysis.

    Patient identifiers intentionally do not enter this backend object. Optional
    name/age/sex fields used by the Workspace report UI stay in the browser and
    are merged only when the user explicitly exports/prints a report.
    """

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    input_payload = dict(image or {})
    if filename and "filename" not in input_payload:
        input_payload["filename"] = filename
    return {
        "report_id": f"report-{analysis_id}",
        "analysis_id": analysis_id,
        "generated_at": now,
        "input": input_payload,
        "model": {
            "name": model.get("name"),
            "epoch": model.get("epoch"),
            "device": model.get("device"),
            "architecture_fingerprint": model.get("architecture_fingerprint"),
        },
        "prediction": dict(prediction),
        "probabilities": dict(probabilities),
        "explainability": {
            "status": explainability.get("status", "unavailable"),
            "spatial_attention_available": bool(
                explainability.get("attention_map_url")
                or (explainability.get("spatial_attention") or {}).get("overlay_url")
            ),
            "gradcam_available": bool(
                explainability.get("gradcam_url")
                or (explainability.get("gradcam") or {}).get("overlay_url")
            ),
        },
        "runtime": dict(runtime),
        "disclaimer": (
            "Research-use output. The model result and explainability maps are not a "
            "standalone clinical diagnosis and require qualified clinical interpretation."
        ),
    }
