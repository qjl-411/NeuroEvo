from __future__ import annotations

import threading
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any

import torch
from PIL import Image

from app.config import settings
from app.reporting import build_analysis_report

from .constants import (
    EXPECTED_ARCHITECTURE_FINGERPRINT,
    EXPECTED_CHECKPOINT_TYPE,
    FINAL_EPOCHS,
    MODEL_CLASS_TO_INDEX,
    MODEL_INDEX_TO_PUBLIC_ID,
    MODEL_NAME,
    MODEL_TASK,
    NUM_CLASSES,
    PUBLIC_CLASSES,
    PUBLIC_ID_TO_LABEL,
    PUBLIC_ID_TO_MODEL_CLASS,
)
from .explainability import ExplainabilityImage, build_explainability_result
from .model import architecture_fingerprint, create_model
from .preprocessing import preprocess_image_bytes


class ModelNotReadyError(RuntimeError):
    pass


class CheckpointContractError(RuntimeError):
    pass


def _explain_image_payload(image: ExplainabilityImage | None) -> dict[str, Any] | None:
    if image is None:
        return None
    return {
        "heatmap_url": image.heatmap_url,
        "overlay_url": image.overlay_url,
        "width": image.width,
        "height": image.height,
    }


class DMSAInferenceService:
    """Long-lived DMSA-Net inference + explainability service.

    The final checkpoint is loaded once on first use. Prediction and
    explainability are serialized around a shared model because the latter uses
    temporary forward hooks. No upload bytes are persisted by this service.
    """

    def __init__(self) -> None:
        self._model: torch.nn.Module | None = None
        self._device: torch.device | None = None
        self._metadata: dict[str, Any] = {}
        self._load_error: str | None = None
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        """Return whether the shared model is already resident without triggering a load."""
        return self._model is not None

    @property
    def checkpoint_path(self) -> Path | None:
        if not settings.model_checkpoint:
            return None
        return Path(settings.model_checkpoint).expanduser()

    @property
    def configured(self) -> bool:
        path = self.checkpoint_path
        return bool(path and path.is_file())

    @property
    def ready(self) -> bool:
        if self._model is not None:
            return True
        if not self.configured:
            return False
        try:
            self.ensure_loaded()
        except Exception:
            return False
        return self._model is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    @property
    def metadata(self) -> dict[str, Any]:
        return dict(self._metadata)

    def _resolve_device(self) -> torch.device:
        requested = (settings.model_device or "auto").strip().lower()
        if requested == "auto":
            return torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        if requested.startswith("cuda") and not torch.cuda.is_available():
            raise ModelNotReadyError(
                f"NEUROEVO_MODEL_DEVICE={settings.model_device!r}, but CUDA is not available."
            )
        return torch.device(requested)

    def _validate_checkpoint(self, checkpoint: dict[str, Any], model: torch.nn.Module) -> None:
        required = {
            "checkpoint_type",
            "epoch",
            "num_classes",
            "class_to_idx",
            "architecture_fingerprint",
            "model_state_dict",
        }
        missing = sorted(required - set(checkpoint))
        if missing:
            raise CheckpointContractError(f"Checkpoint is missing required keys: {missing}")
        if checkpoint["checkpoint_type"] != EXPECTED_CHECKPOINT_TYPE:
            raise CheckpointContractError(
                f"Unexpected checkpoint_type={checkpoint['checkpoint_type']!r}."
            )
        if int(checkpoint["epoch"]) != FINAL_EPOCHS:
            raise CheckpointContractError(
                f"Expected final epoch {FINAL_EPOCHS}, got {checkpoint['epoch']!r}."
            )
        if int(checkpoint["num_classes"]) != NUM_CLASSES:
            raise CheckpointContractError("Checkpoint num_classes does not match DMSA-Net contract.")
        if dict(checkpoint["class_to_idx"]) != MODEL_CLASS_TO_INDEX:
            raise CheckpointContractError("Checkpoint class_to_idx does not match the frozen class order.")

        actual_fingerprint = architecture_fingerprint(model)
        if actual_fingerprint != EXPECTED_ARCHITECTURE_FINGERPRINT:
            raise CheckpointContractError(
                "Local DMSA-Net architecture fingerprint does not match the frozen training architecture."
            )
        if checkpoint["architecture_fingerprint"] != EXPECTED_ARCHITECTURE_FINGERPRINT:
            raise CheckpointContractError(
                "Checkpoint architecture fingerprint does not match the frozen DMSA-Net architecture."
            )

    def ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is not None:
                return
            path = self.checkpoint_path
            if path is None or not path.is_file():
                self._load_error = "DMSA-Net final checkpoint is not configured."
                raise ModelNotReadyError(self._load_error)

            try:
                device = self._resolve_device()
                model = create_model(NUM_CLASSES)
                checkpoint = torch.load(path, map_location="cpu", weights_only=False)
                if not isinstance(checkpoint, dict):
                    raise CheckpointContractError("Checkpoint root must be a dictionary.")
                self._validate_checkpoint(checkpoint, model)
                model.load_state_dict(checkpoint["model_state_dict"], strict=True)
                model.to(device)
                model.eval()
            except Exception as exc:
                self._load_error = str(exc)
                raise

            self._device = device
            self._model = model
            self._metadata = {
                "name": MODEL_NAME,
                "task": MODEL_TASK,
                "epoch": int(checkpoint["epoch"]),
                "device": str(device),
                "architecture_fingerprint": checkpoint["architecture_fingerprint"],
            }
            self._load_error = None

    def status(self) -> dict[str, Any]:
        if not self.configured:
            return {
                "name": MODEL_NAME,
                "task": MODEL_TASK,
                "ready": False,
                "configured": False,
                "device": None,
                "message": "Final DMSA-Net checkpoint has not been deployed yet.",
            }
        try:
            self.ensure_loaded()
        except Exception as exc:
            return {
                "name": MODEL_NAME,
                "task": MODEL_TASK,
                "ready": False,
                "configured": True,
                "device": None,
                "message": f"Checkpoint configured but failed validation/loading: {exc}",
            }
        return {
            "name": MODEL_NAME,
            "task": MODEL_TASK,
            "ready": True,
            "configured": True,
            "device": str(self._device),
            "message": "Verified final checkpoint loaded.",
        }

    def analyze(self, data: bytes, filename: str, content_type: str | None = None) -> dict[str, Any]:
        self.ensure_loaded()
        assert self._model is not None
        assert self._device is not None

        total_started = time.perf_counter()

        preprocess_started = time.perf_counter()
        prepared = preprocess_image_bytes(data, filename)
        with Image.open(BytesIO(data)) as opened:
            source_rgb = opened.convert("RGB").copy()
        batch = prepared.tensor.to(self._device)
        preprocessing_ms = (time.perf_counter() - preprocess_started) * 1000.0

        # Explainability uses temporary hooks on the shared model, so keep both
        # forward passes under one lock. Prediction itself does not need grads.
        with self._inference_lock:
            inference_started = time.perf_counter()
            with torch.inference_mode():
                logits = self._model(batch)
                probabilities_tensor = torch.softmax(logits, dim=1)[0].detach().cpu()
            inference_ms = (time.perf_counter() - inference_started) * 1000.0

            model_index = int(torch.argmax(probabilities_tensor).item())

            explainability_started = time.perf_counter()
            explanation = build_explainability_result(
                model=self._model,
                batch=batch,
                target_index=model_index,
                source_rgb=source_rgb,
                output_size=(224, 224),
            )
            explainability_ms = (time.perf_counter() - explainability_started) * 1000.0

        public_id = MODEL_INDEX_TO_PUBLIC_ID[model_index]
        confidence = float(probabilities_tensor[model_index].item())
        public_probabilities: dict[str, float] = {}
        for candidate_public_id, model_class, _ in PUBLIC_CLASSES:
            index = MODEL_CLASS_TO_INDEX[model_class]
            public_probabilities[candidate_public_id] = float(probabilities_tensor[index].item())

        analysis_id = str(uuid.uuid4())
        model_payload = {
            "name": MODEL_NAME,
            "epoch": self._metadata.get("epoch"),
            "device": str(self._device),
            "architecture_fingerprint": self._metadata.get("architecture_fingerprint"),
        }
        prediction_payload = {
            "class_id": public_id,
            "model_class": PUBLIC_ID_TO_MODEL_CLASS[public_id],
            "label": PUBLIC_ID_TO_LABEL[public_id],
            "confidence": confidence,
        }
        explainability_payload = {
            "status": explanation.status,
            "attention_map_url": explanation.attention_map_url,
            "gradcam_url": explanation.gradcam_url,
            "message": explanation.message,
            "spatial_attention": _explain_image_payload(explanation.spatial_attention),
            "gradcam": _explain_image_payload(explanation.gradcam),
        }

        total_ms = (time.perf_counter() - total_started) * 1000.0
        runtime_payload = {
            "preprocessing_ms": preprocessing_ms,
            "inference_ms": inference_ms,
            "explainability_ms": explainability_ms,
            "total_ms": total_ms,
        }
        report_payload = build_analysis_report(
            analysis_id=analysis_id,
            image={
                "filename": filename,
                "content_type": content_type,
                "width": prepared.width,
                "height": prepared.height,
                "input_width": 224,
                "input_height": 224,
            },
            model=model_payload,
            prediction=prediction_payload,
            probabilities=public_probabilities,
            explainability=explainability_payload,
            runtime=runtime_payload,
        )

        return {
            "analysis_id": analysis_id,
            "state": "completed",
            "model": model_payload,
            "image": {
                "filename": filename,
                "content_type": content_type,
                "width": prepared.width,
                "height": prepared.height,
                "input_width": 224,
                "input_height": 224,
            },
            "prediction": prediction_payload,
            "probabilities": public_probabilities,
            "explainability": explainability_payload,
            "runtime": runtime_payload,
            "report": report_payload,
            # Kept for Phase-1 frontend/API compatibility.
            "latency_ms": total_ms,
        }


dmsa_service = DMSAInferenceService()
