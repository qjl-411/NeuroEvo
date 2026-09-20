from fastapi import APIRouter, Response, status

from app.config import settings
from app.schemas import HealthResponse, ReadinessResponse
from app.model_service import model_service

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Lightweight liveness probe. Does not trigger a checkpoint load."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
        model_ready=model_service.loaded,
    )


@router.get(
    "/readiness",
    response_model=ReadinessResponse,
    responses={503: {"model": ReadinessResponse}},
)
def readiness(response: Response) -> ReadinessResponse:
    """Readiness probe: verifies that the configured DMSA-Net model can serve requests."""
    model = model_service.status()
    ready = bool(model.get("ready"))
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(
        ready=ready,
        service=settings.app_name,
        environment=settings.environment,
        model=model,
    )
