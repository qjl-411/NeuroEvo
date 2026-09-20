from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from torchvision import transforms

from .constants import DICOM_SUFFIXES, INPUT_SIZE, SUPPORTED_RASTER_SUFFIXES


class ImagePreprocessingError(ValueError):
    pass


class UnsupportedImageFormat(ImagePreprocessingError):
    pass


@dataclass(frozen=True)
class PreprocessedImage:
    tensor: object
    width: int
    height: int
    mode: str


_VAL_TRANSFORM = transforms.Compose(
    [
        transforms.Resize(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
    ]
)


def preprocess_image_bytes(data: bytes, filename: str) -> PreprocessedImage:
    """Apply the exact deterministic validation preprocessing from final_train.py.

    Raw DICOM is intentionally not converted here yet. The frozen training and
    sealed-test manifests contain rasterized JPG images, so a DICOM conversion
    pipeline must be validated separately before it can be claimed equivalent.
    """

    suffix = Path(filename or "upload").suffix.lower()
    if suffix in DICOM_SUFFIXES:
        raise UnsupportedImageFormat(
            "DICOM preprocessing is not enabled yet. The frozen DMSA-Net protocol "
            "was trained/tested on rasterized MRI JPG images; validate DICOM windowing "
            "and intensity conversion before enabling .dcm inference."
        )
    if suffix not in SUPPORTED_RASTER_SUFFIXES:
        raise UnsupportedImageFormat("Only JPG/JPEG/PNG are enabled for DMSA-Net inference right now.")
    if not data:
        raise ImagePreprocessingError("The uploaded file is empty.")

    try:
        with Image.open(BytesIO(data)) as opened:
            width, height = opened.size
            image = opened.convert("RGB")
            tensor = _VAL_TRANSFORM(image).unsqueeze(0)
    except (UnidentifiedImageError, OSError) as exc:
        raise ImagePreprocessingError("The uploaded file could not be decoded as an image.") from exc

    return PreprocessedImage(tensor=tensor, width=width, height=height, mode="RGB")
