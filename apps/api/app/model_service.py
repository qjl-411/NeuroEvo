"""Backward-compatible import surface for the DMSA-Net inference service."""

from app.ml.dmsa.service import dmsa_service

model_service = dmsa_service
