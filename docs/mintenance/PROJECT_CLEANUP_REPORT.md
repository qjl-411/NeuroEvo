# NeuroEvo-AD 项目清理报告（PROJECT_CLEANUP_REPORT）

> 生成时间：2026-09-20
> 清理策略：严格“扫描 → 分析 → 分类 → 候选清单 → 判断依赖 → 分批删除 → 每批验证”
> 项目无 Git 仓库 → 走“清理前清单 + SHA256 备份”的稳妥路径（见 `pre_deletion_manifest.json`，位于本地清理临时目录）
> 本次执行范围（经用户确认）：**Level A 安全垃圾 + 清理 .venv 字节码**；`node_modules` / `dist` / 整个 `.venv` 保留（Level B，待用户后续决定）

---

## 1. 清理前项目大小
**2.0 GB（2,175,329,755 字节 / 27,718 个文件）**

## 2. 清理后项目大小
**1.9 GB（2,009,919,577 字节 / 20,650 个文件）**

## 3. 一共节省
- **165,410,178 字节 ≈ 157.7 MB**
- **占比 7.6%**

## 4. 删除文件数量
- 显式删除文件：**14 个**（2 个孤儿源码 + 12 个已应用历史补丁文档）
- 缓存目录：**808 个** `__pycache__` 目录 + 1 个 `.pytest_cache` 目录（批量删除，完整清单见 manifest）
- 临时文件：若干 `*.log/*.tmp/*.temp/*.part`（均在受保护片段之外）
- **合计删除条目：823 个（808 目录 + 14 文件 + 临时文件）**

## 5. 删除目录数量
**809 个**（808 个 `__pycache__` + 1 个 `.pytest_cache`）

## 6. 删除的主要内容
| 内容 | 体积 | 说明 |
|---|---|---|
| Python 字节码缓存（`__pycache__` / `*.pyc`，含 `.venv` 内） | 157.2 MB | Level A，零运行风险，Python 自动重建 |
| `.pytest_cache` | 2 KB | Level A |
| 临时文件（`*.log/*.tmp/*.temp/*.part`） | 474 KB | Level A |
| 孤儿源码 `PlatformShell.tsx` / `literatureApi.ts` | 4 KB | 全项目 0 引用（已用 ripgrep 确认） |
| 已应用历史补丁 diff / 应用脚本 / 应用记录（12 个） | 192 KB | 已永久写入源码、无运行时引用 |
| **合计** | **≈ 157.7 MB** | — |

## 7. 保留的大文件（业务真实资产，未动）
| 文件 / 目录 | 大小 | 保留理由 |
|---|---|---|
| `apps/api/data/pdfs/`（本地文献库） | 899.4 MB | 用户主动下载的学术 PDF，数据库 `local_pdf_path` 关联 |
| `model_artifacts/final_model_epoch126.pth` | 217.5 MB | 冻结模型权重，生产启动校验 |
| `apps/web/public/assets/models/brain.glb` | 40.9 MB | 首页 3D 脑模型源文件 |
| `apps/api/data/neuroevo_papers.db` | 7.7 MB | 研究中心真实文献库（902 篇） |
| `apps/web/node_modules` | 106.1 MB | Level B，保留（可 `npm install` 重建） |
| `apps/web/dist` | 51.4 MB | Level B，保留（可 `npm run build` 重建，但当前为旧构建） |
| `apps/api/.venv`（清字节码后） | ≈ 578 MB | Level B，保留（可 `pip install -r requirements.txt` 重建） |
| `apps/api/data/pdf_download_failures.json` / `pdf_localization_manifest.csv` | 极小 | 下载日志/清单，保留 |
| `LOCALIZE_LITERATURE_PDFS.bat/.sh` 及 `README*` / `deploy/` / `PHASE*.md` / `INFERENCE_*.md` | 极小 | 用户明确要求保留的脚本与文档 |

## 8. 条件性可继续删除内容（Level B，本次未删，需用户决定）
| 目标 | 当前大小 | 恢复命令 | 删除后影响 |
|---|---|---|---|
| `apps/api/.venv`（整体） | ≈ 578 MB | `python -m venv .venv && pip install -r requirements.txt` | 需联网重装；已清字节码，本次仅省内部缓存 |
| `apps/web/node_modules` | 106.1 MB | `npm install` | 需联网；离线演示机慎用 |
| `apps/web/dist` | 51.4 MB | `npm run build` | 若部署直接依赖 dist，删除后须先 build 再发布；当前 dist 仍含旧“报告中心”文案，重建即更新 |

> 若三项全删，预计再释放约 **0.73 GB**，项目将降至约 **1.15 GB**（其中 ~1.1 GB 全为业务真实数据，符合“不为数字好看而删资产”的原则）。

## 9. 所有代码修改
**无代码修改。** 本次仅做删除，未改动任何保留文件的源码、配置或资源。
- 删除的 2 个源码文件（`PlatformShell.tsx`、`literatureApi.ts`）均为全项目 0 引用的死代码，删除不影响任何导入或功能。
- 研究中心功能保持直连 `neuroevo_papers.db`（真实 DB），无硬编码 `PAPERS` 假数据。

## 10. 所有删除文件路径
### 10.1 显式删除文件（14 个，含 SHA256 前缀）
- `apps/web/src/components/PlatformShell.tsx`（d67c3f54…）
- `apps/web/src/services/literatureApi.ts`（f73b0db2…）
- `CHANGES_v9.diff`（72e02b44…）
- `CHANGES_v10.diff`（aeb62dc5…）
- `workspace_v4.diff`（8d1ef110…）
- `workspace_v5.diff`（f1e4a1aa…）
- `v6_to_v7_WorkspacePage.diff`（be02384b…）
- `v6_to_v7_workspace_css.diff`（4b66d1ca…）
- `V2_TO_V3_CHANGES.diff`（8f6dcd61…）
- `WORKSPACE_UI_CHANGES.diff`（0fcf9110…）
- `APPLY_FULL_UI_PATCH.py`（6988d2fe…）
- `APPLY_FULL_UI_PATCH.bat`（dd59caf2…）
- `APPLY_PHASE234.txt`（b54cb166…）
- `APPLY_PHASE5.txt`（7b2dbe8e…）

### 10.2 批量删除目录（809 个）
- 808 个 `__pycache__` 目录（分布：`apps/api/app/**`、`apps/api/tests/**`、`apps/api/.venv/Lib/site-packages/**` 等）
- 1 个 `apps/api/.pytest_cache` 目录
- 若干 `*.log / *.tmp / *.temp / *.part` 临时文件
- 完整逐条清单与 SHA256 见清理临时目录 `pre_deletion_manifest.json`（删除前已生成，可用于恢复核对）

## 11. 验证结果
| 验证项 | 结果 |
|---|---|
| Python 虚拟环境导入（fastapi/uvicorn/PIL/numpy） | ✅ OK |
| SQLite `PRAGMA integrity_check` | ✅ `ok` |
| 文献数量 | ✅ **902 篇（未减少）** |
| `python -m compileall apps/api/app` | ✅ PASS |
| 后端 `pytest`（`apps/api/tests`） | ✅ **20 passed** |
| 前端 `npm run build`（`tsc --noEmit && vite build`） | ⚠️ **2 个既有 TS 错误，非本次引入**（见下方说明） |

### 关于 `npm run build` 的 2 个错误（重要、透明说明）
构建在以下两处报 TS 错误，但**均位于本次未触碰的文件**，属**清理前既已存在**的问题，与本次清理无关：
1. `src/auth/session.tsx(119,7)` — `error TS2774`：条件永远为 true（函数已定义）。
2. `src/pages/WorkspacePage.tsx(352,19)` — `error TS2345`：`Uint8Array<ArrayBufferLike>` 与 `BlobPart` 类型不兼容（TypeScript 7 的 lib.dom 严格化所致）。

清理本身**未产生任何新错误**（删除的 2 个文件无任何 `Cannot find module` 报错）。`dist` 为 2026-09-16 的旧构建，本次未重建、未删除，运行不受影响。
**建议**：这两个错误与清理无关，如需让 `npm run build` 完全通过，应作为独立技术债单独修复（不在本次清理范围内，避免误改工作台/登录逻辑）。

## 12. 最终主要目录结构
```
NeuroEvo-AD/
├── apps/
│   ├── web/
│   │   ├── src/                # 前端源码（React/TS），已移除 2 个孤儿文件
│   │   ├── public/assets/      # 静态资源（含 brain.glb 40.9MB，保留）
│   │   ├── dist/               # 构建产物（Level B，保留）
│   │   ├── node_modules/       # 依赖（Level B，保留）
│   │   └── package.json
│   └── api/
│       ├── app/                # 后端源码（FastAPI），pycache 已清
│       ├── data/
│       │   ├── pdfs/           # 本地文献库 899MB（保留，已 gitignore）
│       │   └── neuroevo_papers.db  # 文献 DB 7.7MB（保留）
│       ├── tests/              # pytest（20 passed）
│       └── .venv/              # Python 虚拟环境（字节码已清，保留）
├── model_artifacts/            # 模型权重 217MB（保留）
├── deploy/                     # 部署配置（保留）
├── README.md / PHASE*.md / INFERENCE_*.md  # 文档（保留）
└── .gitignore                  # 已补充临时文件/缓存忽略规则
```

---

## 附：遗留待用户定夺项（非体积问题，未擅自处理）
1. **`scene.html:116` 的 MutationObserver hack**：仍把“报告中心”动态改成“研究中心”。由于 `PlatformShell.tsx`（含旧“报告中心”导航）已确认为孤儿且当前导航已统一，该 hack 大概率可移除，但**移除前必须测试导航栏**，故未动。
2. **`npm run build` 既有 2 个 TS 错误**：建议作为独立技术债修复。
3. **Level B 是否删除**：`.venv` / `node_modules` / `dist` 是否进一步清理，等你确认（恢复命令见第 8 节）。
