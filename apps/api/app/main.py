from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import health, inference
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="NeuroEvo-AD backend service boundary for inference, explainability and reliability modules.",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(inference.router, prefix=settings.api_prefix)
