from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = REPO_ROOT / "model_artifacts"
EXPECTED_SHA = "ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658"
EXPECTED_FP = "8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975"


def test_manifest_is_frozen_production_model():
    manifest = json.loads((ARTIFACTS / "model_manifest.json").read_text(encoding="utf-8"))
    model = manifest["model"]
    assert model["checkpoint_sha256"] == EXPECTED_SHA
    assert model["epoch"] == 126
    assert model["num_classes"] == 4
    assert model["architecture_fingerprint"] == EXPECTED_FP
    assert model["total_parameters"] == 56_812_813
    assert model["state_dict_tensor_count"] == 1000
    assert model["class_to_idx"] == {
        "Mild Impairment": 0,
        "Moderate Impairment": 1,
        "No Impairment": 2,
        "Very Mild Impairment": 3,
    }


def test_cv_curve_is_real_five_fold_aligned_epoch_data():
    with (ARTIFACTS / "cv_aligned_epoch_mean.csv").open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 200
    assert set(rows[0]) == {"epoch", "train_loss", "val_loss", "accuracy", "f1", "kappa"}

    best_accuracy = max(rows, key=lambda r: float(r["accuracy"]))
    best_f1 = max(rows, key=lambda r: float(r["f1"]))
    best_kappa = max(rows, key=lambda r: float(r["kappa"]))
    assert int(best_accuracy["epoch"]) == 126
    assert int(best_f1["epoch"]) == 126
    assert int(best_kappa["epoch"]) == 126

    selected = next(r for r in rows if int(r["epoch"]) == 126)
    assert abs(float(selected["accuracy"]) - 0.989453125) < 1e-12
    assert abs(float(selected["f1"]) - 0.9894678729432478) < 1e-12
    assert abs(float(selected["kappa"]) - 0.9859375) < 1e-12


def test_sealed_test_is_kept_separate_from_model_selection():
    perf = json.loads((ARTIFACTS / "model_performance.json").read_text(encoding="utf-8"))
    sealed = perf["sealed_test"]
    assert sealed["images"] == 1279
    assert sealed["correct"] == 1266
    assert sealed["incorrect"] == 13
    assert sealed["train_test_exact_sha256_overlap"] == 0
    assert abs(sealed["accuracy"] - 0.9898358092259578) < 1e-15
    assert "must not be used to retune" in sealed["interpretation_rule"]


def test_checkpoint_hash_file_matches_manifest():
    line = (ARTIFACTS / "checkpoint.sha256.txt").read_text(encoding="utf-8").strip()
    assert line.split()[0] == EXPECTED_SHA


def test_production_module_has_same_immutable_identifiers():
    import sys
    api_root = REPO_ROOT / "apps" / "api"
    sys.path.insert(0, str(api_root))
    from app.ml.dmsa import production

    assert production.EXPECTED_CHECKPOINT_SHA256 == EXPECTED_SHA
    assert production.EXPECTED_ARCHITECTURE_FINGERPRINT == EXPECTED_FP
    assert production.EXPECTED_FINAL_EPOCH == 126
    assert production.EXPECTED_TOTAL_PARAMETERS == 56_812_813
