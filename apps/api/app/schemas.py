from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    model_ready: bool


class ReadinessResponse(BaseModel):
    ready: bool
    service: str
    environment: str
    model: dict[str, Any]


class ModelStatusResponse(BaseModel):
    name: str
    task: str
    ready: bool
    configured: bool = False
    device: str | None = None
    message: str


class AnalyzeModelInfo(BaseModel):
    name: str
    epoch: int | None = None
    device: str
    architecture_fingerprint: str | None = None


class AnalyzeImageInfo(BaseModel):
    filename: str
    content_type: str | None = None
    width: int
    height: int
    input_width: int = 224
    input_height: int = 224


class AnalyzePrediction(BaseModel):
    class_id: Literal["none", "very-mild", "mild", "moderate"]
    model_class: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)


class ExplainabilityImagePayload(BaseModel):
    heatmap_url: str
    overlay_url: str
    width: int
    height: int


class ExplainabilityPayload(BaseModel):
    status: str
    attention_map_url: str | None = None
    gradcam_url: str | None = None
    message: str
    spatial_attention: ExplainabilityImagePayload | None = None
    gradcam: ExplainabilityImagePayload | None = None


class AnalyzeRuntime(BaseModel):
    preprocessing_ms: float
    inference_ms: float
    explainability_ms: float
    total_ms: float


class AnalyzeReport(BaseModel):
    report_id: str
    analysis_id: str
    generated_at: str
    input: dict[str, Any]
    model: dict[str, Any]
    prediction: dict[str, Any]
    probabilities: dict[str, float]
    explainability: dict[str, Any]
    runtime: dict[str, float]
    disclaimer: str


class AnalyzeResponse(BaseModel):
    analysis_id: str
    state: Literal["completed"]
    model: AnalyzeModelInfo
    image: AnalyzeImageInfo
    prediction: AnalyzePrediction
    probabilities: dict[str, float]
    explainability: ExplainabilityPayload
    runtime: AnalyzeRuntime
    report: AnalyzeReport
    latency_ms: float


class TrainingMetricPoint(BaseModel):
    epoch: int
    train_loss: float | None = None
    val_loss: float | None = None
    accuracy: float | None = None
    f1: float | None = None
    kappa: float | None = None


class ModelMetricsResponse(BaseModel):
    available: bool
    message: str
    series: list[TrainingMetricPoint] = Field(default_factory=list)
