# 双赛评分 → 页面/工程模块映射

本仓库不是为了“做一个漂亮首页”而拆目录，而是让同一套工程分别服务两种评分逻辑。

## AIC（算法成果叙事）

AIC 内部路线按：创新性 20、技术实现难度 20、实验验证 20、方案完整性 20、应用价值 15、总结与展望 5 来组织。

对应工程：

- `ml/models/`：DMSA-Net 核心算法；
- `ml/evaluation/` + `/evidence`：baseline、消融、指标、效率；
- `ml/explainability/` + `ml/reliability/`：可信证据；
- `/workspace`：应用价值和可运行验证；
- `competition/AIC/`：技术方案、答辩图表、最终证据。

## iCAN（产品应用叙事）

iCAN 路线按：创新性 30、技术实现 30、实用价值 20、用户体验 10、展示效果 10 来组织。

对应工程：

- `/`：品牌、定位、展示效果；
- `/workspace`：核心用户流程（上传 → 真实推理 → 解释 → 可信度）；
- `/evidence`：证明自主算法与结果可信，不让产品退化成“普通 AI 网页”；
- `/reports`：后续结构化结果/研究报告；
- `apps/api/`：真实模型服务和异常处理；
- `competition/iCAN/`：应用方案、视频、演示素材。

## 当前优先级

1. 首页保留现有效果，但停止继续堆视觉功能；
2. 先打通 `/workspace` 与 `/api/v1/inference/*`；
3. 再接 Grad-CAM / calibration；
4. 最终实验冻结后填充 `/evidence`；
5. Agent / RAG / 用户系统暂不进入 P0。
