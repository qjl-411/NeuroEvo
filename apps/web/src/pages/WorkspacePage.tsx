import { PlatformShell } from '../components/PlatformShell';

export function WorkspacePage() {
  return (
    <PlatformShell
      eyebrow="P0 · CORE WORKFLOW"
      title="MRI 分析工作台"
      description="当前先搭建前端结构；DMSA-Net 推理、Grad-CAM 与可信度接口将通过 FastAPI 接入。"
    >
      <section className="workspace-grid">
        <article className="panel upload-panel">
          <div className="panel-label">01 / INPUT</div>
          <h2>病例输入</h2>
          <div className="dropzone">
            <strong>上传演示 MRI</strong>
            <span>未来接入文件校验、公开演示病例库与上传进度</span>
            <button disabled>后端接入后启用</button>
          </div>
        </article>
        <article className="panel result-panel">
          <div className="panel-label">02 / DMSA-NET</div>
          <h2>模型结果</h2>
          <div className="empty-state">等待真实模型服务返回四分类概率与预测阶段，不展示伪造示例结果。</div>
        </article>
        <article className="panel explain-panel">
          <div className="panel-label">03 / EXPLAINABILITY</div>
          <h2>可解释分析</h2>
          <div className="empty-state">Grad-CAM / Attention Overlay 接口预留区。</div>
        </article>
        <article className="panel reliability-panel">
          <div className="panel-label">04 / RELIABILITY</div>
          <h2>可信度评估</h2>
          <div className="empty-state">Calibration、confidence 与 low-confidence warning 接口预留区。</div>
        </article>
      </section>
      <p className="medical-boundary">本系统为科研、教学与辅助分析原型，不构成临床诊断或治疗建议。</p>
    </PlatformShell>
  );
}
