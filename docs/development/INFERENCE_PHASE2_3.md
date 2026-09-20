# DMSA-Net Integration — Phase 2 + Phase 3

本阶段建立在 Phase 1 的真实数据状态机之上，不改变已经定稿的 Workspace 视觉。

## 完成内容

- DMSA-Net 最后一组 `SpatialAttentionModule` 的真实 Spatial Attention 捕获。
- 以最终融合特征 `fusion34` 为目标层的真实 Grad-CAM。
- Prediction 仍使用 `torch.inference_mode()`；Explainability 使用独立的梯度 forward，不执行 optimizer、不改变权重。
- 共享模型上的 hook/解释性计算使用锁串行化，避免并发请求互相污染 hook 数据。
- Heatmap 与 MRI overlay 以 PNG data URL 返回，不在服务器持久化上传图像。
- `/api/v1/inference/analyze` 统一返回 prediction、四分类概率、Spatial Attention、Grad-CAM、runtime 与结构化 report data。
- 报告中的姓名/年龄/性别不发送给后端；仅在浏览器本地合并并打印/保存为 PDF。
- Workspace 在 `idle / processing / failed` 时继续保持灰色模糊遮罩；只有真实分析 `completed` 后才展示结果。
- 模型性能指标只有在当前 MRI 分析成功后才请求；没有真实 artifact 时继续锁定，不生成模拟曲线。

## Explainability 目标

### Spatial Attention

捕获最后一个 Layer-4 bottleneck：

```text
model.layer4[-1].spatial_attention.sigmoid
```

得到模型 forward 中真实的 `[B, 1, H, W]` attention map。

### Grad-CAM

目标特征层：

```text
model.fusion34
```

流程：预测类别 score → `autograd.grad()` → spatial global-average gradient → channel weighting → ReLU → normalize → resize → overlay。

这些图表示模型响应/贡献较高的像素区域，不自动等价为某个解剖脑区。

## `/analyze` 数据来源

上传一张 MRI 后动态产生：prediction、四分类 probability、Spatial Attention、Grad-CAM、runtime、report data。

训练/验证曲线属于当前部署模型的实验表现，不是对当前 MRI 重新训练产生的数据。

## DICOM

仍不直接开放原始 DICOM 推理。冻结训练与 sealed-test 协议使用 rasterized JPG；DICOM 需要单独验证 VOI LUT/windowing、MONOCHROME1、位深及强度归一化后再启用。
