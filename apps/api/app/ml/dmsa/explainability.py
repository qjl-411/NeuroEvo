from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
from typing import Any

import torch
import torch.nn.functional as F
from PIL import Image


@dataclass(frozen=True)
class ExplainabilityImage:
    heatmap_url: str
    overlay_url: str
    width: int
    height: int


@dataclass(frozen=True)
class ExplainabilityResult:
    status: str
    attention_map_url: str | None
    gradcam_url: str | None
    message: str
    spatial_attention: ExplainabilityImage | None = None
    gradcam: ExplainabilityImage | None = None


def _normalize_map(value: torch.Tensor) -> torch.Tensor:
    value = value.detach().float()
    minimum = torch.amin(value)
    maximum = torch.amax(value)
    span = maximum - minimum
    if not torch.isfinite(span) or float(span) <= 1e-12:
        return torch.zeros_like(value)
    return (value - minimum) / span


def _jet_rgb(value: torch.Tensor) -> torch.Tensor:
    """Small dependency-free jet-like colour map for a normalized HxW tensor."""

    value = value.clamp(0.0, 1.0)
    r = (1.5 - torch.abs(4.0 * value - 3.0)).clamp(0.0, 1.0)
    g = (1.5 - torch.abs(4.0 * value - 2.0)).clamp(0.0, 1.0)
    b = (1.5 - torch.abs(4.0 * value - 1.0)).clamp(0.0, 1.0)
    return torch.stack((r, g, b), dim=-1)


def _tensor_rgb_to_image(rgb: torch.Tensor) -> Image.Image:
    array = (rgb.clamp(0, 1) * 255.0).round().to(torch.uint8).cpu().numpy()
    return Image.fromarray(array, mode="RGB")


def _png_data_url(image: Image.Image) -> str:
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _render_map(map_2d: torch.Tensor, source_rgb: Image.Image, size: tuple[int, int]) -> ExplainabilityImage:
    width, height = size
    resized = F.interpolate(
        map_2d[None, None],
        size=(height, width),
        mode="bilinear",
        align_corners=False,
    )[0, 0]
    normalized = _normalize_map(resized)
    heat_rgb = _jet_rgb(normalized)
    heat_image = _tensor_rgb_to_image(heat_rgb)

    base = source_rgb.resize((width, height), Image.Resampling.BILINEAR).convert("RGB")
    overlay = Image.blend(base, heat_image, alpha=0.42)
    return ExplainabilityImage(
        heatmap_url=_png_data_url(heat_image),
        overlay_url=_png_data_url(overlay),
        width=width,
        height=height,
    )


def build_explainability_result(
    *,
    model: torch.nn.Module,
    batch: torch.Tensor,
    target_index: int,
    source_rgb: Image.Image,
    output_size: tuple[int, int] = (224, 224),
) -> ExplainabilityResult:
    """Generate real DMSA-Net Spatial Attention and Grad-CAM maps.

    Prediction itself can remain under ``torch.inference_mode()``. This function
    performs a second serialized forward pass with gradients enabled solely for
    explainability. It never calls an optimizer and never mutates model weights.

    Spatial Attention is captured from the final layer4 bottleneck sigmoid. The
    Grad-CAM target is the final fused feature map (``fusion34``), immediately
    before global average pooling/classification.
    """

    attention_holder: dict[str, torch.Tensor] = {}
    activation_holder: dict[str, torch.Tensor] = {}

    try:
        attention_module = model.layer4[-1].spatial_attention.sigmoid  # type: ignore[attr-defined]
        gradcam_module = model.fusion34  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover - protects future architecture edits
        return ExplainabilityResult(
            status="unavailable",
            attention_map_url=None,
            gradcam_url=None,
            message=f"Explainability target layers are unavailable: {exc}",
        )

    def capture_attention(_module: torch.nn.Module, _inputs: tuple[Any, ...], output: torch.Tensor) -> None:
        attention_holder["value"] = output

    def capture_activation(_module: torch.nn.Module, _inputs: tuple[Any, ...], output: torch.Tensor) -> None:
        activation_holder["value"] = output

    attention_handle = attention_module.register_forward_hook(capture_attention)
    activation_handle = gradcam_module.register_forward_hook(capture_activation)

    try:
        model.zero_grad(set_to_none=True)
        with torch.enable_grad():
            logits = model(batch)
            activation = activation_holder.get("value")
            attention = attention_holder.get("value")
            if activation is None or attention is None:
                raise RuntimeError("Required explainability tensors were not captured.")
            if logits.ndim != 2 or not (0 <= target_index < logits.shape[1]):
                raise RuntimeError("Prediction target index is outside the model output range.")

            score = logits[0, target_index]
            gradient = torch.autograd.grad(
                score,
                activation,
                retain_graph=False,
                create_graph=False,
                allow_unused=False,
            )[0]

        # Last spatial attention map: [B,1,H,W] -> HxW.
        attention_2d = attention.detach()[0, 0]

        # Grad-CAM: global-average gradients over spatial dimensions, weighted sum
        # of the final fused activation channels, then ReLU.
        activations = activation.detach()[0]
        gradients = gradient.detach()[0]
        weights = gradients.mean(dim=(1, 2), keepdim=True)
        gradcam_2d = torch.relu((weights * activations).sum(dim=0))

        attention_image = _render_map(attention_2d, source_rgb, output_size)
        gradcam_image = _render_map(gradcam_2d, source_rgb, output_size)
    except Exception as exc:
        return ExplainabilityResult(
            status="failed",
            attention_map_url=None,
            gradcam_url=None,
            message=f"Explainability generation failed: {exc}",
        )
    finally:
        attention_handle.remove()
        activation_handle.remove()
        model.zero_grad(set_to_none=True)

    return ExplainabilityResult(
        status="completed",
        # Backward-compatible fields consumed by the finalized Workspace.
        attention_map_url=attention_image.overlay_url,
        gradcam_url=gradcam_image.overlay_url,
        message=(
            "Spatial Attention and Grad-CAM were generated from this MRI and the "
            "currently loaded DMSA-Net. Highlighted pixels indicate model response, "
            "not automatic anatomical localization."
        ),
        spatial_attention=attention_image,
        gradcam=gradcam_image,
    )
