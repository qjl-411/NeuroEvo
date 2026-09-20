from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["environment"]
    assert "model_ready" in payload


def test_readiness_is_503_without_checkpoint() -> None:
    response = client.get("/api/v1/readiness")
    assert response.status_code == 503
    payload = response.json()
    assert payload["ready"] is False
    assert payload["model"]["configured"] is False
