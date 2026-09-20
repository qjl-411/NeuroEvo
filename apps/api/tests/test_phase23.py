from __future__ import annotations

from io import BytesIO

import torch
import torch.nn as nn
from PIL import Image

from app.ml.dmsa.explainability import _normalize_map, build_explainability_result
from app.reporting.analysis_report import build_analysis_report


class _TinySpatial(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        spatial = self.sigmoid(x.mean(dim=1, keepdim=True))
        return x * spatial


class _TinyBlock(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.spatial_attention = _TinySpatial()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.spatial_attention(x)


class _TinyDMSALike(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.stem = nn.Conv2d(3, 4, kernel_size=1, bias=False)
        self.layer4 = nn.Sequential(_TinyBlock())
        self.fusion34 = nn.Conv2d(4, 4, kernel_size=1, bias=False)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(4, 4)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.layer4(x)
        x = self.fusion34(x)
        x = self.pool(x).flatten(1)
        return self.fc(x)


def _source_image() -> Image.Image:
    return Image.new("RGB", (16, 16), color=(90, 90, 90))


def test_normalize_map_constant_is_safe() -> None:
    result = _normalize_map(torch.ones(4, 4))
    assert torch.count_nonzero(result).item() == 0


def test_real_explainability_pipeline_returns_png_data_urls() -> None:
    torch.manual_seed(7)
    model = _TinyDMSALike().eval()
    batch = torch.randn(1, 3, 16, 16)
    with torch.inference_mode():
        target = int(model(batch).argmax(dim=1).item())

    result = build_explainability_result(
        model=model,
        batch=batch,
        target_index=target,
        source_rgb=_source_image(),
        output_size=(16, 16),
    )

    assert result.status == "completed"
    assert result.attention_map_url is not None
    assert result.gradcam_url is not None
    assert result.attention_map_url.startswith("data:image/png;base64,")
    assert result.gradcam_url.startswith("data:image/png;base64,")
    assert result.spatial_attention is not None
    assert result.gradcam is not None


def test_explainability_does_not_change_model_weights() -> None:
    torch.manual_seed(11)
    model = _TinyDMSALike().eval()
    before = {name: value.detach().clone() for name, value in model.state_dict().items()}
    _ = build_explainability_result(
        model=model,
        batch=torch.randn(1, 3, 16, 16),
        target_index=0,
        source_rgb=_source_image(),
        output_size=(16, 16),
    )
    after = model.state_dict()
    for name, value in before.items():
        assert torch.equal(value, after[name])


def test_report_builder_is_structured_and_contains_no_patient_fields() -> None:
    report = build_analysis_report(
        analysis_id="analysis-1",
        filename="mri.jpg",
        model={"name": "DMSA-Net", "epoch": 126, "device": "cpu"},
        prediction={"class_id": "none", "label": "无障碍", "confidence": 0.9},
        probabilities={"none": 0.9, "very-mild": 0.05, "mild": 0.04, "moderate": 0.01},
        explainability={"status": "completed", "attention_map_url": "data:a", "gradcam_url": "data:b"},
        runtime={"preprocessing_ms": 1.0, "inference_ms": 2.0, "explainability_ms": 3.0, "total_ms": 6.0},
    )

    assert report["analysis_id"] == "analysis-1"
    assert report["input"]["filename"] == "mri.jpg"
    assert report["explainability"]["spatial_attention_available"] is True
    assert report["explainability"]["gradcam_available"] is True
    serialized = str(report).lower()
    assert "patient" not in serialized
    assert "name /" not in serialized
