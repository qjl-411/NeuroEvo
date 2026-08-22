# 原始前端代码审计与处理结果

原始包共 **21 个文件**。框架判断：**原生 HTML + CSS + JavaScript + Three.js ES Module**；没有 React、Vue、Vite、Webpack 或 npm 工程。

| # | 原文件 | 大小 | 处理 | 判断 |
|---:|---|---:|---|---|
| 1 | `README.md` | 2.2 KB | **替换** | 旧单页说明已失去仓库级意义；整合为新的根 README 与审计文档。 |
| 2 | `assets/brain.glb` | 40.9 MB | **保留并迁移** | 首页 Three.js 实际加载；迁到 `apps/web/public/assets/models/brain.glb`，并配置 Git LFS。 |
| 3 | `index.html` | 37.1 KB | **拆分重构** | 原约 600 行，混合页面、SVG 与脚本入口；仅保留已调好的视觉场景为 `scene.html`，应用入口交给 React。 |
| 4 | `logo.png` | 892.5 KB | **优化替换** | 1254×1254 / 约 0.9 MB；导航实际显示很小，转成 512px WebP（约 83 KB）。 |
| 5 | `main.js` | 10.7 KB | **保留并模块化** | 星空 + Three.js 脑模型是真实生效逻辑；改为 npm `three` 导入和可清理 lifecycle module。 |
| 6 | `pill.html` | 34.5 KB | **删除** | 中间/独立调试页；最终主页面不引用。 |
| 7 | `pill.js` | 12.0 KB | **保留并模块化** | 最终主页面真实使用，用于胶囊内部动态分子。 |
| 8 | `pill.svg` | 77.5 KB | **删除** | 最终活动页面没有引用；胶囊 SVG 已内联到主场景。 |
| 9 | `ring.html` | 34.9 KB | **删除** | 中间/独立调试页；最终主页面不引用。 |
| 10 | `ring.js` | 26.2 KB | **保留并模块化** | 最终主页面真实使用，用于动态能量环。 |
| 11 | `styles.css` | 33.0 KB | **保留并模块化** | 迁到 landing feature 内，避免未来工作台/报告页样式互相污染。 |
| 12 | `vendor/chunk-2BUXAFR3.js` | 1.6 MB | **删除** | 旧 Three.js vendor bundle 依赖碎片；改由 npm + Vite 构建。 |
| 13 | `vendor/chunk-KMSL7I4B.js` | 2.7 KB | **删除** | 旧 Three.js vendor bundle 依赖碎片；改由 npm + Vite 构建。 |
| 14 | `vendor/chunk-NY4Z4LNU.js` | 656 B | **删除** | 旧 Three.js vendor bundle 依赖碎片；改由 npm + Vite 构建。 |
| 15 | `vendor/three.js` | 16.3 KB | **删除** | 手工 vendored Three.js；改用 npm `three`。 |
| 16 | `vendor/three_addons_controls_OrbitControls__js.js` | 31.2 KB | **删除** | 改用 `three/addons/controls/OrbitControls.js`。 |
| 17 | `vendor/three_addons_loaders_GLTFLoader__js.js` | 100.5 KB | **删除** | 改用 `three/addons/loaders/GLTFLoader.js`。 |
| 18 | `vendor/three_addons_postprocessing_EffectComposer__js.js` | 12.2 KB | **删除** | 改用 `three/addons/postprocessing/EffectComposer.js`。 |
| 19 | `vendor/three_addons_postprocessing_OutputPass__js.js` | 5.0 KB | **删除** | 改用 `three/addons/postprocessing/OutputPass.js`。 |
| 20 | `vendor/three_addons_postprocessing_RenderPass__js.js` | 2.9 KB | **删除** | 改用 `three/addons/postprocessing/RenderPass.js`。 |
| 21 | `vendor/three_addons_postprocessing_UnrealBloomPass__js.js` | 14.0 KB | **删除** | 改用 `three/addons/postprocessing/UnrealBloomPass.js`。 |

## 框架升级结论

不建议继续扩展为单个 `index.html + styles.css + main.js`。下一阶段需要 MRI 上传、异步推理、概率图、Grad-CAM、可信度、实验图表、报告、错误状态和后端 API；原生 DOM 状态会迅速失控。

最终采用：

- **React + Vite + TypeScript**：应用路由、页面、组件和业务状态；
- **Three.js scene modules**：保留已经调好的复杂视觉效果，不为了换框架重写图形算法；
- **FastAPI**：模型推理、解释、可信度、报告服务边界；
- **`ml/` 独立工作区**：训练/评估代码与 Web 解耦。

这种方式属于渐进迁移：**旧视觉保住，新业务从此组件化。**
