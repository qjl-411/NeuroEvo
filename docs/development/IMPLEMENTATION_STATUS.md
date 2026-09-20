# NeuroEvo-AD 文献研究站实现状态

## 已完成

- SQLite 文献数据库、11 个 NeuroEvo Topic、论文多标签关系表。
- SQLite FTS5 标题/摘要/作者/期刊检索。
- OpenAlex Works 客户端：API Key、cursor 分页、100/page、429/5xx 退避、摘要重建、OA 信息解析。
- AD/MCI + MRI/AI 相关性过滤与 Topic 规则分类。
- 初始抓取、2010–2017 经典文献补充、最近年份窗口增量刷新。
- `stats` 与 `audit` 数据质量检查命令。
- OA PDF 下载器（仅使用已经记录的开放 PDF URL）。
- FastAPI 文献接口：论文、详情、Topic、年份统计、Topic 统计。
- React 研究中心真实数据改造：关键词、年份柱状图、Topic、排序、分页、PDF/DOI/来源。
- 后端自动测试和模拟 OpenAlex 端到端同步测试。

## 当前验证结果

- `pytest`: 6 passed。
- Python `compileall`: 通过。
- 文献 API 使用测试数据库做了搜索 + 年份 + Topic 联动验证。
- 前端新增的非 React 数据层 TypeScript 类型检查通过。
- 全前端 `npm run typecheck/build` 在当前执行环境无法完整运行，因为用户提供的精简包没有完整 `node_modules`，且执行环境无法访问 npm 网络。源文件 TS/TSX 已做语法级检查，无语法错误。

## 外部网络限制

当前执行容器无法解析 `api.openalex.org`，因此不能在这里真正下载 OpenAlex 小样本。OpenAlex 参数已按 2026 年官方文档核对；真实数据质量的最后一步应在有网络的本地环境执行：

```bash
cd apps/api
python scripts/literature_sync.py init
python scripts/literature_sync.py crawl --from-year 2024 --to-year 2026 --max-per-query 10
python scripts/literature_sync.py stats
python scripts/literature_sync.py audit --sample-per-topic 3
```

确认小样本后再扩大规模。

## DMSA-Net 后端接入 Phase 1（本次更新）

- 工作台预测结果、训练曲线、可解释性区域已移除演示数值，统一使用 `idle / processing / completed / failed` 状态。
- `idle / processing / failed` 状态使用灰色半透明模糊遮罩；只有真实 API 数据到达后才解除对应卡片遮罩。
- 上传 JPG/PNG 后前端自动调用 `POST /api/v1/inference/analyze`。
- 新增 `GET /api/v1/inference/model` 与 `GET /api/v1/inference/model/metrics` 状态/真实训练指标接口。
- 新增 `app/ml/dmsa/` 推理模块：冻结架构、预处理、checkpoint contract、服务层、可解释性扩展边界。
- 已验证服务端 DMSA-Net 架构 fingerprint 与训练代码一致：`8e542321...d76975`，参数量 `56,812,813`。
- 当前未提供正式 `.pth`，因此 `/analyze` 会明确返回 `503`，不会生成伪预测。
- Spatial Attention / Grad-CAM 图像导出仍处于下一阶段；当前接口明确返回 `pending_integration`，前端对应区域继续保持遮罩。
- DICOM 目前保留前端入口，但后端尚未启用原始 DICOM 推理，原因是冻结训练/测试协议使用的是 rasterized JPG；需先验证 DICOM windowing/intensity pipeline。
- 后端自动测试更新为：`9 passed`。

## DMSA-Net Phase 2 + Phase 3

- Spatial Attention 已改为从模型最后一个 Layer-4 spatial-attention sigmoid 真实捕获。
- Grad-CAM 已接入 `fusion34` 最终融合特征，使用当前预测类别 score 的真实梯度生成。
- `/analyze` 现在统一返回预测、四分类概率、可解释性 PNG data URL、分阶段 runtime 与结构化 report 数据。
- Report Builder 不保存患者身份信息；姓名/年龄/性别仅由浏览器本地合并用于打印/PDF。
- 工作台只有在当前 MRI `completed` 后才请求模型性能指标，上传前所有分析/性能结果继续锁定。
- DICOM 仍保持未启用状态，等待单独的 DICOM intensity/windowing 验证。
- 后端测试：13 passed（Phase 1 的 9 项 + Phase 2/3 新增 4 项）。

## Phase 5 — Product & Deployment Readiness (2026-09-15)

- Production Baseline v0.4 preserved; frozen DMSA-Net inference contract unchanged.
- Workspace now claims JPG/JPEG/PNG only; DICOM is explicitly marked as validation-pending.
- Added client-side file validation, readable small-file sizes, and a 180-second analysis timeout.
- Printable report now includes image metadata, analysis/model identity, and real epoch-126 five-fold metrics when available.
- Added lightweight `/api/v1/health` and model-aware `/api/v1/readiness` probes.
- Added request IDs and structured request timing logs; unexpected inference errors are logged server-side.
- Added production deployment examples for Nginx, systemd, environment variables, and server preflight.
- Backend test suite: 20 passed in the Phase 5 build environment.
- DICOM, persistent patient/MRI storage, and user/history databases remain explicitly deferred.
