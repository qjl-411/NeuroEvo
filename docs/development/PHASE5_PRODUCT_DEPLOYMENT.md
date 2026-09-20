# Phase 5 — Product & Deployment Readiness

Phase 5 starts from the locally validated Production Baseline v0.4. It does **not** change the frozen DMSA-Net architecture, checkpoint, preprocessing, class mapping, or probability logic.

## What changed

### Workspace product semantics
- The file picker now accepts JPG/JPEG/PNG only.
- DICOM is explicitly labeled `验证中` rather than claimed as supported.
- Client-side validation rejects unsupported extensions and files over 500 MB before analysis.
- Small files are displayed in B/KB instead of misleading `0.0 MB` values.
- Analysis requests time out after 180 seconds with a clear failed-state message.
- The duplicate explainability image element was removed.
- The printable report now includes input dimensions, analysis ID, architecture fingerprint, and the real selected-epoch five-fold metrics when available.
- Patient name/age/sex remain browser-only and are not persisted by the API.

### API production readiness
- `/api/v1/health` is a lightweight liveness probe and does not force-load the checkpoint.
- `/api/v1/readiness` reports whether the verified DMSA-Net can actually serve requests and returns HTTP 503 when it cannot.
- Every HTTP response gets an `X-Request-ID`; API requests are logged with status and elapsed time.
- Unexpected inference exceptions are logged server-side instead of exposing internal exception details to clients.

### Deployment assets
- `.env.production.example`
- Nginx reverse-proxy/static-site example
- systemd service example using `serve_verified.py`
- Ubuntu/server preflight script

## Frozen model contract

Do not alter these values in Phase 5:
- checkpoint: `final_model_epoch126.pth`
- SHA-256: `ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658`
- epoch: `126`
- architecture fingerprint: `8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975`
- parameter count: `56,812,813`
- input: RGB 224×224
- normalization: mean/std `(0.5, 0.5, 0.5)`

## Production health model

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/readiness`
- Model detail: `GET /api/v1/inference/model`

A process being alive is not equivalent to the model being ready.

## Cloud deployment order

1. Provision Ubuntu + NVIDIA GPU/driver.
2. Copy the code to `/srv/neuroevo`.
3. Create `apps/api/.venv` and install `requirements.txt`.
4. Install frontend dependencies and run `npm run build`.
5. Copy the frozen checkpoint into `model_artifacts/` (do not commit it to Git).
6. Create `/srv/neuroevo/.env.production` from `.env.production.example`.
7. Run `deploy/scripts/server_preflight.sh /srv/neuroevo`.
8. Install/enable the systemd API service.
9. Install the Nginx site config and HTTPS certificate.
10. Check `/healthz`, `/readyz`, then analyze a known JPG/PNG sample.

## Explicitly deferred

- Raw DICOM serving
- Persistent patient/MRI storage
- User accounts/history database

These require separate validation and should not be mixed into the already-verified JPG/PNG model path.
