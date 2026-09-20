# NeuroEvo-AD Phase 4 — Production Model Integration

## Goal

Phase 4 freezes the recovered DMSA-Net model identity and makes production deployment fail closed.

It does **not** retrain the model and it does **not** change the finalized Workspace visual design.

The production chain is now:

```text
final_model_epoch126.pth
        ↓
byte-level SHA-256 + exact size gate
        ↓
checkpoint metadata gate
        ↓
local architecture fingerprint gate
        ↓
load_state_dict(strict=True)
        ↓
parameter-count gate
        ↓
dummy forward + softmax sanity gate
        ↓
READY
        ↓
existing Phase 2/3 FastAPI + /analyze pipeline
```

A failure at any gate prevents the canonical production start command from launching FastAPI.

---

## Frozen production identity

The recovered final checkpoint is expected to be exactly:

```text
filename: final_model_epoch126.pth
size:     228051470 bytes
sha256:   ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658
```

Checkpoint metadata:

```text
checkpoint_type: final-model-for-sealed-test
epoch:           126
num_classes:     4
state_dict keys: 1000
parameters:      56,812,813
```

Architecture fingerprint:

```text
8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975
```

Class order remains frozen:

```text
0 = Mild Impairment
1 = Moderate Impairment
2 = No Impairment
3 = Very Mild Impairment
```

The platform public order remains:

```text
none       <- model index 2
very-mild  <- model index 3
mild       <- model index 0
moderate   <- model index 1
```

---

## Real model-performance artifacts

Phase 4 includes a normalized `model_artifacts/` directory reconstructed from the recovered experimental outputs.

The important distinction is preserved:

### Cross-validation

Five frozen folds, each 200 epochs, are aligned by epoch and averaged.

At epoch 126:

```text
mean train loss: 0.00324361878436064
mean val loss:   0.047506314710176634
mean accuracy:   0.989453125
mean macro F1:   0.9894678729432478
mean kappa:      0.9859375
```

Epoch 126 is the maximum aligned epoch for mean Accuracy, mean F1, and mean Kappa. This is the data source for model-selection/performance curves.

### Final full training

The final model was trained on 10,240 training images for exactly 126 epochs. That run has a training-loss history but no validation split. It must not be presented as though it produced validation Accuracy/F1/Kappa.

### Sealed test

The one-time held-out test has 1,279 images:

```text
Accuracy:  0.9898358092259578
Precision: 0.9932455096409433
Recall:    0.9925765662410215
F1:        0.9929036746576247
Kappa:     0.9832487728998252
Loss:      0.060728755267097714
Correct:   1266 / 1279
```

Exact train/test SHA-256 overlap was 0.

The sealed-test result is reporting evidence only; it must not be used to retune this frozen model.

---

## Files added

```text
model_artifacts/
├── .gitignore
├── README.md
├── checkpoint.sha256.txt
├── model_manifest.json
├── model_performance.json
├── cv_aligned_epoch_mean.csv
├── cv_aligned_epoch_mean_detailed.csv
├── cv_fold_best.json
├── final_train_history.csv
├── final_training_protocol.json
├── class_to_idx.json
├── model_info.json
├── sealed_test_metrics.json
└── sealed_test_confusion_matrix.csv

apps/api/app/ml/dmsa/
├── production.py
├── production_status.py
└── performance.py

apps/api/scripts/
├── verify_production_model.py
├── serve_verified.py
├── verify_model_artifacts.py
└── verify_inference_consistency.py

apps/api/tests/
└── test_phase4_artifacts.py
```

---

## Apply Phase 4

Overlay this patch onto the Phase 2+3 project root.

Then copy the locally recovered checkpoint into:

```text
NeuroEvo-AD/model_artifacts/final_model_epoch126.pth
```

The checkpoint is deliberately not included in this patch and is ignored by the scoped `.gitignore`.

Configure the API with absolute paths. See `apps/api/.env.phase4.example`.

Recommended metrics setting:

```text
NEUROEVO_MODEL_METRICS=/absolute/path/to/NeuroEvo-AD/model_artifacts/cv_aligned_epoch_mean.csv
```

This plugs the real five-fold aligned mean curve into the Phase 1/2/3 metrics endpoint. The frontend still remains locked before a successful MRI analysis, exactly as previously agreed.

---

## Step 1 — local checkpoint verification

This is the only user action required immediately after applying Phase 4.

From `apps/api`:

```bash
python scripts/verify_production_model.py \
  --checkpoint ../../model_artifacts/final_model_epoch126.pth \
  --device cpu \
  --json-out ../../model_artifacts/production_verification.json
```

CPU is sufficient. GPU is not required for this acceptance test.

Expected final line:

```text
READY: True
```

The verifier checks:

- exact file size;
- exact SHA-256;
- checkpoint type;
- epoch 126;
- 4 classes;
- class mapping;
- training manifest hash;
- checkpoint architecture fingerprint;
- 1000 state-dict entries;
- local model architecture fingerprint;
- 56,812,813 parameters;
- `load_state_dict(strict=True)`;
- output shape `(1, 4)`;
- finite logits/probabilities;
- softmax sum approximately 1.

If any check fails, do not deploy that file.

---

## Step 2 — production start gate

On the eventual cloud GPU server, do not use a raw `uvicorn` command as the canonical start command.

Use:

```bash
python scripts/serve_verified.py \
  --checkpoint ../../model_artifacts/final_model_epoch126.pth \
  --device auto
```

The script verifies the frozen model first, then starts `app.main:app`. It refuses to start if verification fails.

Phase 4 intentionally enforces one API worker per model/GPU instance. Multiple independent workers duplicate the ~56.8M-parameter model in memory and complicate explainability hook concurrency.

---

## Step 3 — MRI inference consistency

After the production verifier passes, use 1–3 JPG images from the sealed test set.

Start the API with `serve_verified.py`, then for each image run:

```bash
python scripts/verify_inference_consistency.py \
  --checkpoint ../../model_artifacts/final_model_epoch126.pth \
  --image /path/to/sealed-test-image.jpg \
  --api-url http://127.0.0.1:8000/api/v1/inference/analyze \
  --device cpu
```

The script independently applies the frozen sealed-test preprocessing:

```text
RGB
Resize(224, 224)
ToTensor()
Normalize(mean=(0.5,0.5,0.5), std=(0.5,0.5,0.5))
```

It compares the raw DMSA-Net output with the platform `/analyze` response, including the nontrivial class remapping.

Pass criteria:

- predicted class: exact match;
- all four probabilities: within default `atol=1e-4`, `rtol=1e-4`.

Only after this passes should the project move to cloud deployment.

---

## What is intentionally still not done

- DICOM serving remains disabled until a validated DICOM preprocessing protocol exists.
- No historical patient database is added.
- No uploaded MRI is persisted by Phase 4.
- No new mock result is introduced.
- No workspace redesign is introduced.
- The sealed-test results are not used for model retuning.

