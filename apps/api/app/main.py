from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.routes import health, inference, literature
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("neuroevo.api")

app = FastAPI(
    title=settings.app_name,
    version="0.5.0",
    description="NeuroEvo-AD backend service for verified DMSA-Net MRI research analysis.",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get(settings.request_id_header) or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.exception(
            "request_failed request_id=%s method=%s path=%s elapsed_ms=%.1f",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers[settings.request_id_header] = request_id
    logger.info(
        "request request_id=%s method=%s path=%s status=%s elapsed_ms=%.1f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(inference.router, prefix=settings.api_prefix)
app.include_router(literature.router, prefix=settings.api_prefix)
