#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import sys
from pathlib import Path
from typing import Dict

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

MODEL_INDEX_TO_PUBLIC_ID = {
    0: "mild",
    1: "moderate",
    2: "none",
    3: "very-mild",
}
MODEL_INDEX_TO_NAME = {
    0: "Mild Impairment",
    1: "Moderate Impairment",
    2: "No Impairment",
    3: "Very Mild Impairment",
}
PUBLIC_ORDER = ("none", "very-mild", "mild", "moderate")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compare the original frozen inference protocol with NeuroEvo-AD /analyze "
            "for the exact same JPG/PNG."
        )
    )
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000/api/v1/inference/analyze")
    parser.add_argument("--device", default="cpu", help="Reference inference device. cpu is preferred for verification.")
    parser.add_argument("--atol", type=float, default=1e-4)
    parser.add_argument("--rtol", type=float, default=1e-4)
    parser.add_argument("--reference-only", action="store_true", help="Do not call the API; print frozen-reference output only.")
    return parser.parse_args()


def _reference_predict(checkpoint_path: Path, image_path: Path, device_name: str) -> dict:
    import torch
    from PIL import Image
    from torchvision import transforms

    from app.ml.dmsa.model import create_model
    from app.ml.dmsa.production import verify_or_raise

    # Verify byte identity + metadata + local architecture before using weights.
    verify_or_raise(checkpoint_path, device="cpu", run_forward=False)

    try:
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    except TypeError:
        checkpoint = torch.load(checkpoint_path, map_location="cpu")

    device = torch.device(device_name if device_name != "auto" else ("cuda:0" if torch.cuda.is_available() else "cpu"))
    model = create_model(num_classes=4)
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model = model.to(device).eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
    ])

    # torchvision default_loader used by the original sealed-test pipeline
    # ultimately converts PIL images to RGB. Do it explicitly here.
    with Image.open(image_path) as img:
        rgb = img.convert("RGB")
        tensor = transform(rgb).unsqueeze(0).to(device)

    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0].detach().cpu().tolist()

    pred_idx = int(max(range(4), key=lambda i: probs[i]))
    public_probs = {MODEL_INDEX_TO_PUBLIC_ID[i]: float(probs[i]) for i in range(4)}
    return {
        "model_index": pred_idx,
        "model_class": MODEL_INDEX_TO_NAME[pred_idx],
        "class_id": MODEL_INDEX_TO_PUBLIC_ID[pred_idx],
        "probabilities_model_order": [float(x) for x in probs],
        "probabilities_public": {key: public_probs[key] for key in PUBLIC_ORDER},
    }


def _call_api(url: str, image_path: Path) -> dict:
    try:
        import httpx
    except ImportError as exc:
        raise RuntimeError("httpx is required for API comparison. Install the normal API requirements first.") from exc

    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    with image_path.open("rb") as handle:
        response = httpx.post(
            url,
            files={"file": (image_path.name, handle, content_type)},
            timeout=180.0,
        )
    response.raise_for_status()
    return response.json()


def main() -> int:
    args = parse_args()
    checkpoint = Path(args.checkpoint).expanduser().resolve()
    image = Path(args.image).expanduser().resolve()
    if not image.is_file():
        print(f"Image not found: {image}", file=sys.stderr)
        return 2
    if image.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        print("Consistency verification currently accepts JPG/JPEG/PNG only.", file=sys.stderr)
        return 2

    reference = _reference_predict(checkpoint, image, args.device)
    print("Frozen reference output:")
    print(json.dumps(reference, indent=2, ensure_ascii=False))

    if args.reference_only:
        return 0

    try:
        api = _call_api(args.api_url, image)
    except Exception as exc:
        print(f"API call failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2

    if api.get("state") != "completed":
        print(f"FAIL: API state is {api.get('state')!r}, expected 'completed'.", file=sys.stderr)
        return 1

    api_prediction = api.get("prediction") or {}
    api_probs: Dict[str, float] = api.get("probabilities") or {}
    failures = []

    if api_prediction.get("class_id") != reference["class_id"]:
        failures.append(
            f"class_id mismatch: api={api_prediction.get('class_id')!r}, reference={reference['class_id']!r}"
        )
    if api_prediction.get("model_class") != reference["model_class"]:
        failures.append(
            f"model_class mismatch: api={api_prediction.get('model_class')!r}, reference={reference['model_class']!r}"
        )

    import math

    rows = []
    for key in PUBLIC_ORDER:
        if key not in api_probs:
            failures.append(f"API probabilities missing key {key!r}")
            continue
        ref_value = float(reference["probabilities_public"][key])
        api_value = float(api_probs[key])
        abs_diff = abs(api_value - ref_value)
        allowed = args.atol + args.rtol * abs(ref_value)
        passed = abs_diff <= allowed and math.isfinite(api_value)
        rows.append((key, ref_value, api_value, abs_diff, allowed, passed))
        if not passed:
            failures.append(
                f"probability mismatch for {key}: api={api_value:.10f}, reference={ref_value:.10f}, "
                f"abs_diff={abs_diff:.3e}, allowed={allowed:.3e}"
            )

    print("\nProbability comparison:")
    print(f"{'class':<12} {'reference':>12} {'api':>12} {'abs_diff':>12} {'allowed':>12}  result")
    for key, ref_value, api_value, abs_diff, allowed, passed in rows:
        print(
            f"{key:<12} {ref_value:>12.8f} {api_value:>12.8f} {abs_diff:>12.3e} {allowed:>12.3e}  "
            f"{'PASS' if passed else 'FAIL'}"
        )

    if failures:
        print("\nCONSISTENCY VERIFICATION FAILED", file=sys.stderr)
        for item in failures:
            print(f"- {item}", file=sys.stderr)
        return 1

    print("\n[PASS] predicted class matches exactly")
    print("[PASS] all four probabilities match within tolerance")
    print("NeuroEvo-AD inference is consistent with the frozen DMSA-Net reference protocol for this image.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
