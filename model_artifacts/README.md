# DMSA-Net production artifacts

This directory contains the **small, versionable provenance and performance artifacts** for the frozen NeuroEvo-AD production model.

The actual checkpoint is deliberately **not included in Git or in this patch**. Copy your locally recovered file here as:

```text
model_artifacts/final_model_epoch126.pth
```

The production checkpoint must satisfy all of the following immutable identifiers:

- SHA-256: `ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658`
- Size: `228051470` bytes
- Epoch: `126`
- Checkpoint type: `final-model-for-sealed-test`
- Architecture fingerprint: `8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975`
- Parameters: `56,812,813`
- Classes: 4
- `model_state_dict` entries: 1000

## Files

`model_manifest.json` is the immutable deployment manifest.

`model_performance.json` separates three different evidence sources instead of mixing them:

1. five-fold cross-validation used for epoch selection;
2. final 126-epoch full training run;
3. the one-time held-out sealed test.

`cv_aligned_epoch_mean.csv` is intentionally formatted for the existing Phase 1/2/3 `/model/metrics` loader. Point `NEUROEVO_MODEL_METRICS` at this file. Its validation metrics are the mean of the five frozen folds at the same epoch.

`final_train_history.csv` contains only the final full-training loss/LR history. It must **not** be presented as validation performance.

`sealed_test_metrics.json` and `sealed_test_confusion_matrix.csv` are reporting artifacts. The held-out test result is final evaluation evidence and must not be used to retune the current model.

## Production check

From `apps/api`:

```bash
python scripts/verify_production_model.py \
  --checkpoint ../../model_artifacts/final_model_epoch126.pth \
  --device cpu
```

The API should be started in production through the verification gate:

```bash
python scripts/serve_verified.py \
  --checkpoint ../../model_artifacts/final_model_epoch126.pth \
  --device auto
```

The server will refuse to start if the checkpoint byte identity, metadata, architecture, strict state-dict load, or sanity forward pass fails.
