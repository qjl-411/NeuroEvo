#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify the frozen Phase 4 model-performance artifacts.")
    parser.add_argument(
        "--artifact-dir",
        default=str(Path(__file__).resolve().parents[3] / "model_artifacts"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.artifact_dir).expanduser().resolve()
    errors = []

    manifest = json.loads((root / "model_manifest.json").read_text(encoding="utf-8"))
    perf = json.loads((root / "model_performance.json").read_text(encoding="utf-8"))
    with (root / "cv_aligned_epoch_mean.csv").open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if manifest["model"]["checkpoint_sha256"] != "ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658":
        errors.append("Unexpected model SHA256 in model_manifest.json")
    if manifest["model"]["architecture_fingerprint"] != "8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975":
        errors.append("Unexpected architecture fingerprint")
    if len(rows) != 200:
        errors.append(f"CV mean curve should contain 200 epochs, got {len(rows)}")

    epoch126 = next((r for r in rows if int(r["epoch"]) == 126), None)
    if epoch126 is None:
        errors.append("Epoch 126 is missing from CV curve")
    else:
        acc126 = float(epoch126["accuracy"])
        f1126 = float(epoch126["f1"])
        kappa126 = float(epoch126["kappa"])
        max_acc_epoch = max(rows, key=lambda r: float(r["accuracy"]))["epoch"]
        max_f1_epoch = max(rows, key=lambda r: float(r["f1"]))["epoch"]
        max_kappa_epoch = max(rows, key=lambda r: float(r["kappa"]))["epoch"]
        if (int(max_acc_epoch), int(max_f1_epoch), int(max_kappa_epoch)) != (126, 126, 126):
            errors.append("Epoch 126 is not the aligned-epoch maximum for accuracy/F1/kappa")
        print(f"Epoch 126 mean accuracy: {acc126:.9f}")
        print(f"Epoch 126 mean F1:       {f1126:.9f}")
        print(f"Epoch 126 mean kappa:    {kappa126:.9f}")

    sealed = perf["sealed_test"]
    if int(sealed["images"]) != 1279 or int(sealed["correct"]) != 1266 or int(sealed["incorrect"]) != 13:
        errors.append("Sealed-test counts do not match the frozen evaluation")
    if int(sealed["train_test_exact_sha256_overlap"]) != 0:
        errors.append("Train/test exact SHA256 overlap is not zero")

    if errors:
        print("MODEL ARTIFACT VERIFICATION FAILED", file=sys.stderr)
        for e in errors:
            print(f"- {e}", file=sys.stderr)
        return 1

    print("[PASS] model_manifest.json")
    print("[PASS] 5-fold aligned 200-epoch curve")
    print("[PASS] selected epoch 126 provenance")
    print("[PASS] sealed-test metrics and integrity metadata")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
