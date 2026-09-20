from __future__ import annotations

MODEL_NAME = "DMSA-Net"
MODEL_TASK = "AD MRI four-stage research classification"
NUM_CLASSES = 4
INPUT_SIZE = (224, 224)
FINAL_EPOCHS = 126
EXPECTED_CHECKPOINT_TYPE = "final-model-for-sealed-test"
EXPECTED_ARCHITECTURE_FINGERPRINT = (
    "8e542321b2886db4db0986dc19d8d8a0984a39c472c086e55ac1fd1db3d76975"
)

# This is the frozen order produced by sorted(class_names) in final_train.py.
MODEL_CLASS_TO_INDEX = {
    "Mild Impairment": 0,
    "Moderate Impairment": 1,
    "No Impairment": 2,
    "Very Mild Impairment": 3,
}

# Public API order intentionally follows the finalized Workspace UI, not logits order.
PUBLIC_CLASSES = (
    ("none", "No Impairment", "无障碍"),
    ("very-mild", "Very Mild Impairment", "非常轻度障碍"),
    ("mild", "Mild Impairment", "轻度障碍"),
    ("moderate", "Moderate Impairment", "中度障碍"),
)

MODEL_INDEX_TO_PUBLIC_ID = {
    MODEL_CLASS_TO_INDEX[model_name]: public_id
    for public_id, model_name, _ in PUBLIC_CLASSES
}
PUBLIC_ID_TO_LABEL = {public_id: label for public_id, _, label in PUBLIC_CLASSES}
PUBLIC_ID_TO_MODEL_CLASS = {public_id: model_name for public_id, model_name, _ in PUBLIC_CLASSES}

SUPPORTED_RASTER_SUFFIXES = {".jpg", ".jpeg", ".png"}
DICOM_SUFFIXES = {".dcm", ".dicom"}
