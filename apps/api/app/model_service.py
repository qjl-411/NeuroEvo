from pathlib import Path

from app.config import settings


class ModelService:
    """DMSA-Net service boundary.

    The repository skeleton intentionally does not fabricate predictions.
    Load the verified competition checkpoint here after experiment results are frozen.
    """

    @property
    def ready(self) -> bool:
        return bool(settings.model_checkpoint and Path(settings.model_checkpoint).is_file())


model_service = ModelService()
