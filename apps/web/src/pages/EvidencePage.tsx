import { PlatformShell } from '../components/PlatformShell';

const cards = [
  ['模型对比', 'DMSA-Net 与 ResNeXt50、现代 CNN、轻量网络等公平基线的最终结果。'],
  ['消融实验', 'Dual Path、MDC、SAM、ILF 的逐层证据链。'],
  ['分类性能', 'Confusion Matrix、ROC-AUC、Macro F1、Sensitivity 等。'],
  ['效率指标', 'Parameters、FLOPs / MACs、Latency、Throughput、峰值显存。'],
  ['可信分析', 'Calibration、Reliability Diagram、失败案例与低置信度提示。'],
  ['数据审计', 'Split、重复/近重复样本、patient-level 风险与数据版本追踪。'],
];

export function EvidencePage() {
  return (
    <PlatformShell
      eyebrow="AIC · EVIDENCE LAYER"
      title="模型证据中心"
      description="这一页专门把 AIC 需要的算法可信证据转化为 iCAN 也能复用的产品性能资产。"
    >
      <section className="evidence-grid">
        {cards.map(([title, text], index) => (
          <article className="panel evidence-card" key={title}>
            <div className="panel-label">{String(index + 1).padStart(2, '0')}</div>
            <h2>{title}</h2>
            <p>{text}</p>
            <span className="status-chip">WAITING FOR FINAL EXPERIMENTS</span>
          </article>
        ))}
      </section>
    </PlatformShell>
  );
}
