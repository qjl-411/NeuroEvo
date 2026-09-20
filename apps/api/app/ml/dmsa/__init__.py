"""DMSA-Net inference package.

The package mirrors the frozen architecture in the research training code while
keeping web-service concerns (validation, preprocessing and response contracts)
separate from training.
"""

from .constants import MODEL_NAME
from .service import DMSAInferenceService, dmsa_service

__all__ = ["MODEL_NAME", "DMSAInferenceService", "dmsa_service"]
