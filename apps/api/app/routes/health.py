from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse
from app.model_service import model_service

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, model_ready=model_service.ready)
