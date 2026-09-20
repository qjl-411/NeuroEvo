from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

EXPECTED_CHECKPOINT_FILENAME = "final_model_epoch126.pth"
EXPECTED_CHECKPOINT_SHA256 = "ba96575888e35764e3ff196674e52757d9a5f9c90742a38aa8f1d1f9a8457658"
EXPECTED_CHECKPOINT_SIZE_BYTES = 228_051_470
EXPECTED_CHECKPOINT_TYPE = "final-model-for-sealed-test"
EXPECTED_FINAL_EPOCH = 126
EXPECTED_NUM_CLASSES = 4
EXPECTED_STATE_DICT_TENSORS = 1000
EXPECTED_TOTAL_PARAMETERS = 56_812_813
EXPECTED_TRAIN_MANIFEST_SHA256 = "51f5b251f9e7cce6c557798ae8fa8e263a6baf58c125524be4e1a1df4bd9edfd"
EXPECTED_ARCHITECTURE_FINGERPRINT = "8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975"
EXPECTED_CLASS_TO_INDEX = {
    "Mild Impairment": 0,
    "Moderate Impairment": 1,
    "No Impairment": 2,
    "Very Mild Impairment": 3,
}
EXPECTED_INPUT_SHAPE = (1, 3, 224, 224)


@dataclass
class VerificationCheck:
    name: str
    passed: bool
    detail: str


@dataclass
class ProductionVerificationReport:
    ready: bool
    checkpoint_path: str
    checkpoint_sha256: Optional[str] = None
    checkpoint_size_bytes: Optional[int] = None
    resolved_device: Optional[str] = None
    checks: list[VerificationCheck] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["checks"] = [asdict(c) for c in self.checks]
        return data

    def to_json(self, *, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    def failed_checks(self) -> list[VerificationCheck]:
        return [c for c in self.checks if not c.passed]


class ProductionCheckpointError(RuntimeError):
    pass


def sha256_file(path: Path, chunk_size: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _add(report: ProductionVerificationReport, name: str, passed: bool, detail: str) -> None:
    report.checks.append(VerificationCheck(name=name, passed=bool(passed), detail=str(detail)))


def _resolve_device(requested: str):
    import torch

    value = (requested or "cpu").strip().lower()
    if value == "auto":
        return torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    device = torch.device(value)
    if device.type == "cuda" and not torch.cuda.is_available():
        raise ProductionCheckpointError(
            f"CUDA device {requested!r} was requested but torch.cuda.is_available() is False."
        )
    return device


def _load_checkpoint(path: Path):
    import torch

    # The production checkpoint is a trusted project artifact. Explicitly keep
    # weights_only=False because it contains metadata in addition to tensors.
    try:
        return torch.load(path, map_location="cpu", weights_only=False)
    except TypeError:
        # Compatibility with older PyTorch versions that do not expose the
        # weights_only keyword.
        return torch.load(path, map_location="cpu")


def _safe_int(value: Any, default: int = -1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def verify_production_checkpoint(
    checkpoint_path: str | Path,
    *,
    device: str = "cpu",
    run_forward: bool = True,
    expected_sha256: str = EXPECTED_CHECKPOINT_SHA256,
    expected_size_bytes: int = EXPECTED_CHECKPOINT_SIZE_BYTES,
) -> ProductionVerificationReport:
    """Verify the frozen DMSA-Net checkpoint before serving it.

    This verifier is deliberately stricter than a normal ``torch.load``. It
    checks the recovered production checkpoint against the immutable metadata
    recorded by the original final-training and sealed-test runs.
    """

    path = Path(checkpoint_path).expanduser().resolve()
    report = ProductionVerificationReport(ready=False, checkpoint_path=str(path))

    if not path.is_file():
        _add(report, "checkpoint_exists", False, f"File not found: {path}")
        return report
    _add(report, "checkpoint_exists", True, str(path))

    size_bytes = path.stat().st_size
    report.checkpoint_size_bytes = size_bytes
    _add(
        report,
        "checkpoint_size",
        size_bytes == expected_size_bytes,
        f"actual={size_bytes}, expected={expected_size_bytes}",
    )

    actual_sha256 = sha256_file(path)
    report.checkpoint_sha256 = actual_sha256
    _add(
        report,
        "checkpoint_sha256",
        actual_sha256 == expected_sha256,
        f"actual={actual_sha256}, expected={expected_sha256}",
    )

    # Do not unpickle a file that already failed the immutable byte-level
    # identity checks. This prevents accidentally validating a different model.
    if size_bytes != expected_size_bytes or actual_sha256 != expected_sha256:
        return report

    try:
        checkpoint = _load_checkpoint(path)
    except Exception as exc:  # pragma: no cover - environment-specific torch errors
        _add(report, "torch_load", False, f"{type(exc).__name__}: {exc}")
        return report
    _add(report, "torch_load", True, "Checkpoint deserialized on CPU.")

    if not isinstance(checkpoint, dict):
        _add(report, "checkpoint_mapping", False, f"Expected dict, got {type(checkpoint).__name__}")
        return report
    _add(report, "checkpoint_mapping", True, "Top-level checkpoint is a dict.")

    checkpoint_type = checkpoint.get("checkpoint_type")
    epoch = _safe_int(checkpoint.get("epoch"))
    num_classes = _safe_int(checkpoint.get("num_classes"))
    class_to_idx = checkpoint.get("class_to_idx")
    architecture_fp = checkpoint.get("architecture_fingerprint")
    train_manifest_sha = checkpoint.get("manifest_sha256")
    state_dict = checkpoint.get("model_state_dict")

    _add(
        report,
        "checkpoint_type",
        checkpoint_type == EXPECTED_CHECKPOINT_TYPE,
        f"actual={checkpoint_type!r}, expected={EXPECTED_CHECKPOINT_TYPE!r}",
    )
    _add(report, "epoch", epoch == EXPECTED_FINAL_EPOCH, f"actual={epoch}, expected={EXPECTED_FINAL_EPOCH}")
    _add(
        report,
        "num_classes",
        num_classes == EXPECTED_NUM_CLASSES,
        f"actual={num_classes}, expected={EXPECTED_NUM_CLASSES}",
    )
    _add(
        report,
        "class_to_idx",
        class_to_idx == EXPECTED_CLASS_TO_INDEX,
        f"actual={class_to_idx!r}",
    )
    _add(
        report,
        "architecture_fingerprint_metadata",
        architecture_fp == EXPECTED_ARCHITECTURE_FINGERPRINT,
        f"actual={architecture_fp!r}, expected={EXPECTED_ARCHITECTURE_FINGERPRINT}",
    )
    _add(
        report,
        "train_manifest_sha256",
        train_manifest_sha == EXPECTED_TRAIN_MANIFEST_SHA256,
        f"actual={train_manifest_sha!r}, expected={EXPECTED_TRAIN_MANIFEST_SHA256}",
    )

    if not isinstance(state_dict, dict):
        _add(report, "model_state_dict", False, "model_state_dict is missing or is not a dict.")
        return report
    _add(report, "model_state_dict", True, f"tensor_entries={len(state_dict)}")
    _add(
        report,
        "state_dict_tensor_count",
        len(state_dict) == EXPECTED_STATE_DICT_TENSORS,
        f"actual={len(state_dict)}, expected={EXPECTED_STATE_DICT_TENSORS}",
    )

    # Import the exact Phase 2/3 frozen architecture only after immutable
    # checkpoint identity has passed.
    try:
        from .model import architecture_fingerprint, create_model
    except Exception as exc:
        _add(report, "model_module_import", False, f"{type(exc).__name__}: {exc}")
        return report
    _add(report, "model_module_import", True, "Imported app.ml.dmsa.model.")

    try:
        model = create_model(num_classes=EXPECTED_NUM_CLASSES)
    except Exception as exc:
        _add(report, "model_create", False, f"{type(exc).__name__}: {exc}")
        return report
    _add(report, "model_create", True, "Created local DMSA-Net architecture.")

    local_fp = architecture_fingerprint(model)
    _add(
        report,
        "architecture_fingerprint_local",
        local_fp == EXPECTED_ARCHITECTURE_FINGERPRINT,
        f"actual={local_fp}, expected={EXPECTED_ARCHITECTURE_FINGERPRINT}",
    )

    total_parameters = sum(p.numel() for p in model.parameters())
    _add(
        report,
        "parameter_count",
        total_parameters == EXPECTED_TOTAL_PARAMETERS,
        f"actual={total_parameters}, expected={EXPECTED_TOTAL_PARAMETERS}",
    )

    try:
        model.load_state_dict(state_dict, strict=True)
    except Exception as exc:
        _add(report, "strict_state_dict_load", False, f"{type(exc).__name__}: {exc}")
        return report
    _add(report, "strict_state_dict_load", True, "load_state_dict(strict=True) succeeded.")

    import torch

    try:
        resolved_device = _resolve_device(device)
    except Exception as exc:
        _add(report, "device", False, f"{type(exc).__name__}: {exc}")
        return report
    report.resolved_device = str(resolved_device)
    _add(report, "device", True, str(resolved_device))

    if run_forward:
        try:
            model = model.to(resolved_device)
            model.eval()
            x = torch.zeros(EXPECTED_INPUT_SHAPE, dtype=torch.float32, device=resolved_device)
            with torch.inference_mode():
                logits = model(x)
                probabilities = torch.softmax(logits, dim=1)
            shape_ok = tuple(logits.shape) == (1, EXPECTED_NUM_CLASSES)
            finite_ok = bool(torch.isfinite(logits).all().item()) and bool(torch.isfinite(probabilities).all().item())
            sum_value = float(probabilities.sum(dim=1).item())
            prob_ok = abs(sum_value - 1.0) <= 1e-5
            _add(report, "forward_shape", shape_ok, f"actual={tuple(logits.shape)}, expected={(1, EXPECTED_NUM_CLASSES)}")
            _add(report, "forward_finite", finite_ok, "Logits/probabilities are finite.")
            _add(report, "probability_sum", prob_ok, f"sum={sum_value:.10f}")
        except Exception as exc:  # pragma: no cover - hardware-specific failures
            _add(report, "forward_pass", False, f"{type(exc).__name__}: {exc}")
    else:
        _add(report, "forward_pass", True, "Skipped by caller (--no-forward).")

    report.metadata = {
        "checkpoint_type": checkpoint_type,
        "epoch": epoch,
        "num_classes": num_classes,
        "class_to_idx": class_to_idx,
        "architecture_fingerprint": architecture_fp,
        "manifest_sha256": train_manifest_sha,
        "state_dict_tensor_count": len(state_dict),
        "total_parameters": total_parameters,
    }
    report.ready = all(c.passed for c in report.checks)
    return report


def verify_or_raise(
    checkpoint_path: str | Path,
    *,
    device: str = "cpu",
    run_forward: bool = True,
) -> ProductionVerificationReport:
    report = verify_production_checkpoint(
        checkpoint_path,
        device=device,
        run_forward=run_forward,
    )
    if not report.ready:
        failures = "; ".join(f"{c.name}: {c.detail}" for c in report.failed_checks())
        raise ProductionCheckpointError(f"DMSA-Net production checkpoint verification failed: {failures}")
    return report


def format_report(report: ProductionVerificationReport) -> str:
    lines = ["=" * 78, "DMSA-Net Production Model Verification", "=" * 78]
    for check in report.checks:
        prefix = "PASS" if check.passed else "FAIL"
        lines.append(f"[{prefix}] {check.name}: {check.detail}")
    lines.append("-" * 78)
    lines.append(f"READY: {report.ready}")
    if report.checkpoint_sha256:
        lines.append(f"SHA256: {report.checkpoint_sha256}")
    if report.resolved_device:
        lines.append(f"DEVICE: {report.resolved_device}")
    lines.append("=" * 78)
    return "\n".join(lines)
