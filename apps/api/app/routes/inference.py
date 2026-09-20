from __future__ import annotations

import csv
import json
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.ml.dmsa.preprocessing import ImagePreprocessingError, UnsupportedImageFormat
from app.ml.dmsa.service import (
    CheckpointContractError,
    ModelNotReadyError,
    dmsa_service,
)
from app.schemas import AnalyzeResponse, ModelMetricsResponse, ModelStatusResponse, TrainingMetricPoint

router = APIRouter(prefix="/inference", tags=["inference"])
logger = logging.getLogger("neuroevo.inference")


@router.get("/model", response_model=ModelStatusResponse)
def model_status() -> ModelStatusResponse:
    return ModelStatusResponse(**dmsa_service.status())


@router.get("/model/metrics", response_model=ModelMetricsResponse)
def model_metrics() -> ModelMetricsResponse:
    """Return persisted real training metrics when an artifact is configured.

    No synthetic curve is generated. Until a real training artifact exists, the
    Workspace keeps the training card locked/blurred.
    """

    if not settings.model_metrics:
        return ModelMetricsResponse(
            available=False,
            message="Real DMSA-Net training metrics have not been deployed yet.",
        )

    path = Path(settings.model_metrics).expanduser()
    if not path.is_file():
        return ModelMetricsResponse(
            available=False,
            message=f"Configured metrics artifact does not exist: {path}",
        )

    try:
        if path.suffix.lower() == ".csv":
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.DictReader(handle))
        elif path.suffix.lower() == ".json":
            payload = json.loads(path.read_text(encoding="utf-8"))
            rows = payload.get("series", payload) if isinstance(payload, dict) else payload
            if not isinstance(rows, list):
                raise ValueError("JSON metrics must be a list or contain a 'series' list.")
        else:
            raise ValueError("Metrics artifact must be CSV or JSON.")

        def optional_float(row: dict, *names: str) -> float | None:
            for name in names:
                value = row.get(name)
                if value not in (None, ""):
                    return float(value)
            return None

        series = [
            TrainingMetricPoint(
                epoch=int(row["epoch"]),
                train_loss=optional_float(row, "train_loss", "trainLoss"),
                val_loss=optional_float(row, "val_loss", "valLoss"),
                accuracy=optional_float(row, "accuracy"),
                f1=optional_float(row, "f1", "f1_score"),
                kappa=optional_float(row, "kappa"),
            )
            for row in rows
            if isinstance(row, dict) and row.get("epoch") not in (None, "")
        ]
    except Exception as exc:
        return ModelMetricsResponse(
            available=False,
            message=f"Metrics artifact could not be parsed: {exc}",
        )

    if not series:
        return ModelMetricsResponse(available=False, message="Metrics artifact contains no epoch rows.")
    return ModelMetricsResponse(
        available=True,
        message="Real training metrics loaded.",
        series=series,
    )


async def _read_upload(file: UploadFile) -> bytes:
    # Read one byte beyond the limit so oversized files are rejected deterministically.
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.",
        )
    return data


async def _analyze_upload(file: UploadFile) -> AnalyzeResponse:
    data = await _read_upload(file)
    try:
        payload = await run_in_threadpool(
            dmsa_service.analyze,
            data,
            file.filename or "upload",
            file.content_type,
        )
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CheckpointContractError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except UnsupportedImageFormat as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
    except ImagePreprocessingError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected DMSA-Net analysis failure for filename=%r", file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MRI analysis failed unexpectedly. Check the API logs for details.",
        ) from exc
    finally:
        await file.close()
    return AnalyzeResponse(**payload)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)) -> AnalyzeResponse:
    """Analyze one MRI image with the deployed frozen DMSA-Net checkpoint."""

    return await _analyze_upload(file)


@router.post("/predict", response_model=AnalyzeResponse)
async def predict(file: UploadFile = File(...)) -> AnalyzeResponse:
    """Compatibility alias. New Workspace clients should use /analyze."""

    return await _analyze_upload(file)


@router.post("/explain", response_model=AnalyzeResponse)
async def explain(file: UploadFile = File(...)) -> AnalyzeResponse:
    """Compatibility alias. /analyze now returns prediction and real explainability maps."""

    return await _analyze_upload(file)
