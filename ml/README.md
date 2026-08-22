# ML workspace

这里承载 **DMSA-Net 与可复现实验资产**，不要把训练脚本混进 Web 前端。

Future machine-learning training, evaluation and inference code will live here.
Directories (`models/`, `inference/`, `evaluation/`, `explainability/`, `reliability/`, `configs/`) will be introduced when actual implementation is added.

建议接入顺序：

1. `models/`：DMSA-Net 网络定义；
2. `inference/`：统一预处理、checkpoint 加载、predict adapter；
3. `evaluation/`：Accuracy / Macro-F1 / AUC / Kappa / confusion matrix；
4. `explainability/`：Grad-CAM / attention overlay；
5. `reliability/`：calibration / ECE / low-confidence warning；
6. `configs/`：所有比赛冻结实验配置。

**不要在这里提交数据集、患者数据或大 checkpoint。** 模型权重使用 Git LFS 或外部 artifact storage。
