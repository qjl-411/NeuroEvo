# NeuroEvo-AD

当前代码包含原有 MRI 推理后端骨架，以及新增的 AD/MCI/MRI 文献研究站。

## 1. 后端安装

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

复制 `.env.example` 为 `.env`。建议在 OpenAlex 注册免费 API Key，并设置：

```env
NEUROEVO_OPENALEX_API_KEY=你的Key
```

API Key 不是最小测试的强制要求，但批量同步建议配置。

## 2. 初始化文献数据库

```bash
cd apps/api
python scripts/literature_sync.py init
```

## 3. 先做小样本抓取

建议第一次不要直接抓几千篇：

```bash
python scripts/literature_sync.py crawl --from-year 2024 --to-year 2026 --max-per-query 10
python scripts/literature_sync.py stats
python scripts/literature_sync.py audit --sample-per-topic 3
```

确认结果质量后，再扩大到核心库，并补一小部分 2010–2017 的高相关经典文献：

```bash
python scripts/literature_sync.py crawl --from-year 2018 --to-year 2026 --max-per-query 200
python scripts/literature_sync.py crawl-classics --max-per-query 20
```

采集流程会按 OpenAlex ID 去重，并进行 AD/MCI + MRI/AI 相关性过滤和 NeuroEvo 11 Topic 多标签分类。

## 4. 增量刷新

免费 API 无法使用 OpenAlex 的 premium `from_updated_date` 同步过滤器，因此本项目默认采用“最近年份窗口重新查询 + 本地 upsert”的免费方案：

```bash
python scripts/literature_sync.py sync --lookback-years 2 --max-per-query 100
```

可以通过 Windows Task Scheduler 或 cron 定期执行该命令。

## 5. OA PDF（可选）

只下载 OpenAlex 已记录的开放获取 PDF URL，不绕过登录、验证码或付费墙：

```bash
python scripts/literature_sync.py download-pdfs --limit 100
```

PDF 默认保存到 `apps/api/data/pdfs/`，并把本地路径写回数据库。

## 6. 启动 FastAPI

```bash
cd apps/api
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

主要文献接口：

- `GET /api/v1/literature/papers`
- `GET /api/v1/literature/papers/{id}`
- `GET /api/v1/literature/topics`
- `GET /api/v1/literature/stats/years`
- `GET /api/v1/literature/stats/topics`

`/papers` 支持 `q`、`year`、`year_from`、`year_to`、`topic`、`oa`、`sort`、`page`、`page_size`。

## 7. 前端

```bash
cd apps/web
npm install
npm run dev
```

Vite 已把 `/api` 代理到 `http://127.0.0.1:8000`。

研究中心 `/reports` 当前实现：

- 关键词搜索
- 年份柱状图 hover 数量 / 点击筛选
- Topic 动态统计 / 点击筛选
- 搜索 + 年份 + Topic 联动
- 相关性 / 引用量 / 最新 / 最早排序
- 分页
- OA PDF / DOI / 来源跳转

## 8. 测试

```bash
cd apps/api
pytest -q
```

前端完整 typecheck/build 需要先执行 `npm install`，因为交付压缩包不包含 `node_modules`。
