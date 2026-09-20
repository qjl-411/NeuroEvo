# NeuroEvo-AD deployment assets

This directory contains examples for the validated JPG/PNG DMSA-Net serving path.

- `nginx/neuroevo.conf.example`: serves the Vite build and proxies `/api/` to FastAPI.
- `systemd/neuroevo-api.service.example`: one verified API/model process per GPU instance.
- `scripts/server_preflight.sh`: verifies required artifacts and the production checkpoint before service enablement.

The frozen checkpoint is intentionally not included in Git or deployment patches. Copy `final_model_epoch126.pth` to `model_artifacts/` on the server and verify its SHA-256 before starting the service.

DICOM is not production-enabled in this phase. The validated inference path remains JPG/JPEG/PNG.
