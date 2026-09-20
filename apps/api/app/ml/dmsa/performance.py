from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


class ModelPerformanceArtifactError(RuntimeError):
    pass


def load_model_performance(path: str | Path) -> Dict[str, Any]:
    artifact_path = Path(path).expanduser().resolve()
    if not artifact_path.is_file():
        raise ModelPerformanceArtifactError(f"Model performance artifact not found: {artifact_path}")

    try:
        data = json.loads(artifact_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ModelPerformanceArtifactError(f"Could not parse {artifact_path}: {exc}") from exc

    if data.get("schema_version") != 1:
        raise ModelPerformanceArtifactError("Unsupported model_performance schema_version.")
    if data.get("model_name") != "DMSA-Net":
        raise ModelPerformanceArtifactError("model_performance.json is not for DMSA-Net.")

    provenance = data.get("provenance") or {}
    expected_sha = "ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658"
    if provenance.get("final_model_sha256") != expected_sha:
        raise ModelPerformanceArtifactError("model_performance final_model_sha256 does not match the frozen checkpoint.")

    cv = data.get("cross_validation") or {}
    if int(cv.get("fold_count", 0)) != 5 or int(cv.get("selected_epoch", -1)) != 126:
        raise ModelPerformanceArtifactError("Unexpected cross-validation protocol in model_performance.json.")

    sealed = data.get("sealed_test") or {}
    if int(sealed.get("images", 0)) != 1279:
        raise ModelPerformanceArtifactError("Unexpected sealed-test sample count.")
    if int(sealed.get("train_test_exact_sha256_overlap", -1)) != 0:
        raise ModelPerformanceArtifactError("Train/test exact SHA-256 overlap must be zero.")

    return data
