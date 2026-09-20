# DMSA-Net Integration Phase 1

这版的目标不是伪造一个“已经训练好”的系统，而是把平台改造成真实数据驱动的状态机，并把 DMSA-Net 正式接入点建立好。

## 工作台状态

当前 MRI 分析统一使用四状态：

- `idle`：尚未上传 MRI / 尚无真实数据。
- `processing`：文件已提交，正在调用后端分析。
- `completed`：真实 `/analyze` 结果已返回，预测结果卡片解除遮罩。
- `failed`：模型未部署、格式不支持或推理异常，显示失败遮罩与真实错误信息。

训练曲线独立从 `/api/v1/inference/model/metrics` 读取。没有真实训练产物时保持 `idle` 遮罩，不生成曲线。

## DMSA-Net 文件结构

```text
apps/api/app/ml/dmsa/
├── constants.py       # 冻结类别顺序、fingerprint、输入尺寸
├── model.py           # 从 final_train.py 抽出的正式 DMSA-Net 架构
├── preprocessing.py   # 与验证/测试阶段一致的 224x224 + RGB + Normalize(0.5)
├── explainability.py  # Spatial Attention / Grad-CAM 下一阶段接口边界
└── service.py         # checkpoint 加载、contract 校验、softmax、类别映射
```

## 正式 checkpoint 到位后的部署方式

将训练完成的 `final_model_epoch126.pth` 放在 Git 仓库外部，然后配置：

```env
NEUROEVO_MODEL_CHECKPOINT=/absolute/path/to/final_model_epoch126.pth
NEUROEVO_MODEL_DEVICE=auto
```

服务首次使用模型时会校验：

- `checkpoint_type == final-model-for-sealed-test`
- `epoch == 126`
- `num_classes == 4`
- 冻结 `class_to_idx`
- architecture fingerprint
- `load_state_dict(strict=True)`

任何一项不一致都拒绝推理，不会静默输出结果。

## 当前 /analyze 行为

没有 `.pth` 时：返回 HTTP 503。

有且通过校验的 `.pth` 时：JPG/JPEG/PNG 会执行真实 DMSA-Net 推理并返回四分类概率、预测类别、图像尺寸和延迟。

Spatial Attention / Grad-CAM 目前仍返回 `pending_integration`，因此前端可解释性卡片不会冒充真实热图。

## DICOM

当前后端主动拒绝 `.dcm/.dicom`。原因是原始 DMSA-Net 冻结训练/测试协议使用 JPG 图像。正式开放 DICOM 前，应先验证：VOI LUT / Window、MONOCHROME1 反相、intensity normalization、位深转换以及与原 JPG 数据分布的一致性。
