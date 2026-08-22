import { PlatformShell } from '../components/PlatformShell';

export function ReportsPage() {
  return (
    <PlatformShell
      eyebrow="STRUCTURED OUTPUT"
      title="报告中心"
      description="预留研究报告生成、历史演示记录和结果导出；比赛前优先保证核心分析流程稳定。"
    >
      <section className="panel report-empty">
        <div className="panel-label">REPORT SERVICE</div>
        <h2>报告模块尚未接入</h2>
        <p>后续由后端根据真实推理、解释与可信度结构化结果生成研究报告，避免前端硬编码医学结论。</p>
      </section>
    </PlatformShell>
  );
}
