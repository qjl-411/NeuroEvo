NeuroEvo-AD v10：研究中心真实文献瀑布流 + 本地 PDF + 默认神经影像分析师账号
=======================================================================

一、覆盖方式
将本补丁解压到 NeuroEvo-AD 项目根目录，选择“合并文件夹 / 覆盖同名文件”。
不要删除原 apps 文件夹。本补丁不包含也不会覆盖 neuroevo_papers.db。

二、748 篇开放获取 PDF 的真正本地化
数据库当前有 748 条开放获取 PDF URL。本补丁新增了可恢复、可重跑的批量下载器：

Windows：双击项目根目录的
  LOCALIZE_LITERATURE_PDFS.bat

或命令行：
  python apps/api/scripts/localize_literature_pdfs.py --all --workers 4 --retries 2 --timeout 60

PDF 会保存到：
  apps/api/data/pdfs/

数据库 papers.local_pdf_path 会写入相对路径，例如：
  data/pdfs/W1234567890.pdf

下载中断后直接重跑即可；已经成功下载的 PDF 会自动跳过。
失败项会写入：
  apps/api/data/pdf_download_failures.json

注意：748 表示数据库中已有 748 条开放获取 PDF 地址，不代表所有出版社地址在任意网络环境下一次都能成功下载。
部分出版商可能出现超时、反爬、临时 403 或链接变更。脚本会重试并记录失败项。
建议在正式展示前联网运行一次，并预留数 GB 磁盘空间。

本补丁 ZIP 本身没有塞入 748 个 PDF 文件：当前生成补丁的执行环境无法访问外部出版社域名，因此无法代替你的电脑完成数 GB 的实际网络下载。
但下载器、数据库回写、本地 PDF API、前端优先读取本地 PDF 的完整链路已经实现并做过本地模拟 PDF 的端到端测试。

三、本地 PDF 使用方式
下载完成后：
- 研究中心搜索结果会优先显示“本地 PDF”。
- URL 形式：/api/v1/literature/papers/{paper_id}/pdf
- 后端直接从 apps/api/data/pdfs/ 返回文件，不再跳转出版社。
- 未本地化成功的论文仍保留原外部 PDF 地址作为兜底。

四、研究中心 Papers 瀑布流
原来右侧 Papers 使用的是 10 条写死的演示论文，其中多数与 AD/MRI 无关。
现在已完全移除静态演示数组，页面启动后直接调用本地 SQLite 文献 API：
  /api/v1/literature/papers?q=MRI&topic=deep_learning&sort=citations&page=1&page_size=60

所以瀑布流展示的每一条论文都来自 neuroevo_papers.db。
为避免展示明显问题记录，标题以 RETRACTED 开头的条目会在该展示模块过滤掉。
本地化成功的论文会显示绿色 LOCAL PDF 标签；未本地化的开放获取论文仍显示 PDF。

五、默认账号
全新浏览器 / 全新电脑第一次打开平台时，默认直接进入：
  姓名：研究者
  身份：神经影像分析师
  邮箱：demo@neuroevo.local

该默认账号拥有工作台、研究文献检索、报告导出等完整功能，评委不需要先注册或登录。
登录 / 注册 / 退出 / 游客浏览仍然全部保留。
如果主动退出或选择游客，个人中心里可以点击“进入默认神经影像分析师账号”立即恢复完整权限。

六、验证
- Python compileall：通过
- 后端 pytest：20 passed
- PDF 下载器：使用本地 HTTP PDF 做过真实写盘、DB 回写、恢复清理测试
- /literature/papers/{id}/pdf：FileResponse 本地 PDF 端到端测试通过
- TypeScript/TSX：使用项目的类型检查桩完成源码检查，通过
- npm run build：当前 node_modules 中 @types/react / @types/react-dom 文件不完整，因此完整 Vite build 无法在本环境完成；本补丁未新增 npm 依赖。
