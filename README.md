# NeuroEvo

**NeuroEvo-AD：面向阿尔茨海默病 MRI 的可解释可信 AI 辅助分析平台。**

当前仓库是 2026 AIC + iCAN 共用工程底座：

- **AIC**：DMSA-Net 是算法主角，Web 负责应用价值与可运行验证；
- **iCAN**：NeuroEvo-AD 是产品主角，DMSA-Net 是底层自主 AI 引擎；
- **长期科研**：比赛后从当前 2D DMSA 版本切入 3D MRI + Clinical 的 MCI progression 路线。

## 当前技术栈

- Web：React + Vite + TypeScript
- 3D：Three.js
- API：FastAPI
- ML：PyTorch/DMSA-Net（待接入已验证代码与 checkpoint）

## Project Structure

```text
NeuroEvo_V8/
├── apps/
│   ├── web/                  # React + Vite + TypeScript 前端
│   │   ├── public/assets/    # 品牌、Landing 图片与 3D 模型（brain.glb 走 Git LFS）
│   │   └── src/
│   │       ├── components/   # 通用组件（PlatformShell）
│   │       ├── landing/      # 首页 Landing 场景（Three.js + scene.html + 样式）
│   │       ├── pages/        # 路由页面
│   │       ├── styles/       # 全局样式
│   │       ├── App.tsx       # 路由定义
│   │       └── main.tsx      # 应用入口
│   └── api/                  # FastAPI 后端
│       ├── app/
│       │   ├── routes/       # HTTP API（health / inference）
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── schemas.py
│       │   └── model_service.py
│       └── tests/
├── ml/                       # DMSA-Net 训练/评估/推理工作区（占位，接入代码时再建目录）
├── competition/              # AIC / iCAN 比赛专属材料（占位）
├── data/                     # 数据来源与许可说明（不放真实数据）
├── docs/                     # 架构、产品、审计文档
└── .github/workflows/        # CI
```

## 快速启动

### 1. 前端

```bash
npm install
npm run web:dev
```

访问 `http://localhost:5173`。

### 2. 后端

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API 文档：`http://localhost:8000/docs`。

## 当前页面

- `/`：保留并模块化原始科技视觉首页；
- `/workspace`：MRI 分析主流程骨架；
- `/evidence`：模型对比/消融/效率/可信证据页骨架；
- `/reports`：报告中心骨架。

## 当前刻意没有做的事情

- 不伪造 DMSA 预测结果；
- 不把 checkpoint 塞进 Web；
- 不提前做 Agent / RAG / 登录 / 数据库；
- 不在比赛前为了“先进”重写已经调好的 Three.js 视觉算法。

详见：

- `docs/code-audit.md`：原压缩包逐文件去留；
- `docs/architecture/repository-structure.md`：仓库边界和后续扩展位置。

- `docs/product/competition-page-map.md`：AIC / iCAN 评分逻辑如何落到页面与代码目录。
