from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    model_ready: bool


class ModelStatusResponse(BaseModel):
    name: str
    task: str
    ready: bool
    message: str
