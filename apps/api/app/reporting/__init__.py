"""Analysis report data builders.

The reporting layer only receives already-computed analysis data. It never
reruns the model and never persists uploaded images or patient identifiers.
"""

from .analysis_report import build_analysis_report

__all__ = ["build_analysis_report"]
