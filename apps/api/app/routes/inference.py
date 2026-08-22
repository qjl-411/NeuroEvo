from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas import ModelStatusResponse
from app.model_service import model_service

router = APIRouter(prefix="/inference", tags=["inference"])


@router.get("/model", response_model=ModelStatusResponse)
def model_status() -> ModelStatusResponse:
    return ModelStatusResponse(
        name="DMSA-Net",
        task="AD MRI four-stage research classification",
        ready=model_service.ready,
        message="Verified checkpoint loaded." if model_service.ready else "Model checkpoint is not configured yet.",
    )


@router.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, str]:
    if not model_service.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DMSA-Net is not configured. Integrate the verified competition checkpoint before enabling prediction.",
        )
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Inference adapter pending integration.")


@router.post("/explain")
async def explain(file: UploadFile = File(...)) -> dict[str, str]:
    if not model_service.ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="DMSA-Net is not configured.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Grad-CAM adapter pending integration.")
