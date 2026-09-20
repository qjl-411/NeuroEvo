#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/srv/neuroevo}"
API="$ROOT/apps/api"
MODEL="$ROOT/model_artifacts/final_model_epoch126.pth"
METRICS="$ROOT/model_artifacts/cv_aligned_epoch_mean.csv"
PYTHON="$API/.venv/bin/python"

fail() { echo "[FAIL] $*" >&2; exit 1; }
pass() { echo "[PASS] $*"; }

[[ -d "$ROOT" ]] || fail "project root missing: $ROOT"
[[ -x "$PYTHON" ]] || fail "venv python missing: $PYTHON"
[[ -f "$MODEL" ]] || fail "checkpoint missing: $MODEL"
[[ -f "$METRICS" ]] || fail "metrics missing: $METRICS"
pass "required files exist"

if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
  pass "NVIDIA driver visible"
else
  echo "[WARN] nvidia-smi not found; CPU serving is possible but production GPU is expected."
fi

cd "$API"
"$PYTHON" scripts/verify_model_artifacts.py --artifact-dir "$ROOT/model_artifacts"
"$PYTHON" scripts/verify_production_model.py --checkpoint "$MODEL" --device auto --json-out "$ROOT/model_artifacts/production_verification.json"
pass "NeuroEvo-AD production preflight complete"
