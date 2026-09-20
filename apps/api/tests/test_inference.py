from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


client = TestClient(app)


def _tiny_png() -> bytes:
    image = Image.new("RGB", (8, 8), "black")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_model_status_reports_not_ready_without_checkpoint() -> None:
    response = client.get("/api/v1/inference/model")
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "DMSA-Net"
    assert payload["ready"] is False
    assert payload["configured"] is False


def test_metrics_endpoint_never_fabricates_data() -> None:
    response = client.get("/api/v1/inference/model/metrics")
    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is False
    assert payload["series"] == []


def test_analyze_is_unavailable_until_checkpoint_is_deployed() -> None:
    response = client.post(
        "/api/v1/inference/analyze",
        files={"file": ("mri.png", _tiny_png(), "image/png")},
    )
    assert response.status_code == 503
    assert "checkpoint" in response.json()["detail"].lower()


def test_dicom_is_not_claimed_as_supported_without_deployed_model() -> None:
    # Model readiness is checked before image preprocessing, so an undeployed
    # service still fails closed with 503 rather than pretending DICOM support.
    response = client.post(
        "/api/v1/inference/analyze",
        files={"file": ("scan.dcm", b"not-a-real-dicom", "application/dicom")},
    )
    assert response.status_code == 503
