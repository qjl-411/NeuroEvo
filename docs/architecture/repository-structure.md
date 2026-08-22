# Repository structure

```text
NeuroEvo/
├── apps/
│   ├── web/                     # React + Vite + TypeScript
│   │   ├── public/assets/       # 品牌与公开演示静态资产（含 brain.glb，走 Git LFS）
│   │   └── src/
│   │       ├── components/      # 通用 UI（PlatformShell）
│   │       ├── landing/         # 首页 Landing 场景（Three.js 模块 + scene.html + 样式）
│   │       ├── pages/           # 页面级组合
│   │       ├── styles/          # 全局样式
│   │       ├── App.tsx          # 路由定义
│   │       └── main.tsx         # 应用入口
│   └── api/                     # FastAPI
│       └── app/
│           ├── routes/          # HTTP API（health / inference）
│           ├── main.py
│           ├── config.py
│           ├── schemas.py
│           └── model_service.py
├── ml/                          # DMSA / explainability / reliability / evaluation（接入真实代码时再建子目录）
├── competition/                 # AIC / iCAN 比赛专属材料（有实际材料时再建子目录）
├── data/                        # 数据政策说明（不放真实数据）
├── docs/                        # 架构、产品、审计
├── .github/workflows/           # CI
├── .gitignore
├── .gitattributes               # 大型模型/GLB Git LFS
└── README.md
```

## 边界原则

- Web 不直接加载 PyTorch checkpoint；只通过 `/api/v1/...` 调后端。
- API 不承载训练代码；训练/评估在 `ml/`。
- AIC/iCAN 只保存比赛专属材料，不复制算法和前后端源码。
- Agent 以后如果加入，优先放独立 service 或 `ml/`；当前不提前制造空模块。
