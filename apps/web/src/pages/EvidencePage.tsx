import { useEffect } from 'react';
import { BrandBar } from '../components/BrandBar';
import { initNeuralBackground } from '../landing/neuralBackground.js';
import '../landing/landing-scene.css';

const cards = [
  ['模型对比', 'DMSA-Net 与 ResNeXt50、现代 CNN、轻量网络等公平基线的最终结果。'],
  ['消融实验', 'Dual Path、MDC、SAM、ILF 的逐层证据链。'],
  ['分类性能', 'Confusion Matrix、ROC-AUC、Macro F1、Sensitivity 等。'],
  ['效率指标', 'Parameters、FLOPs / MACs、Latency、Throughput、峰值显存。'],
  ['可信分析', 'Calibration、Reliability Diagram、失败案例与低置信度提示。'],
  ['数据审计', 'Split、重复/近重复样本、patient-level 风险与数据版本追踪。'],
];

const cardColors = [
  ['#6ea0ff', '#1a2b47'],
  ['#4fd2d0', '#102f38'],
  ['#8d81ff', '#1c1e47'],
  ['#ffb16b', '#3a2315'],
  ['#f58cbb', '#3a1533'],
  ['#26e0a3', '#0f3326'],
];

export function EvidencePage() {
  useEffect(() => initNeuralBackground(), []);

  const cardShell: React.CSSProperties = {
    minWidth: 0,
    minHeight: 0,
    borderRadius: 'clamp(18px, 1.15vw, 24px)',
    border: '1px solid rgba(145, 181, 238, 0.14)',
    background:
      'linear-gradient(145deg, rgba(15, 27, 49, 0.47), rgba(7, 15, 30, 0.34))',
    boxShadow:
      'inset 0 1px 0 rgba(255, 255, 255, 0.055), inset 0 -1px 0 rgba(89, 130, 197, 0.035), 0 18px 46px rgba(0, 0, 0, 0.18), 0 0 28px rgba(68, 118, 207, 0.025)',
    backdropFilter: 'blur(19px) saturate(125%)',
    WebkitBackdropFilter: 'blur(19px) saturate(125%)',
    padding: 'clamp(16px, 1.3vw, 24px) clamp(20px, 1.6vw, 30px)',
  };

  return (
    <main id="scene" className="workspace-scene" aria-label="NeuroEvo-AD 模型证据中心">
      <canvas id="neural-background" aria-hidden="true" />
      <BrandBar />

      <div className="evidence-layout"
        style={{
          position: 'absolute',
          zIndex: 5,
          top: 'var(--workspace-top)',
          right: 'var(--workspace-edge-x)',
          bottom: 'var(--workspace-bottom)',
          left: 'var(--workspace-edge-x)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          gap: 'var(--workspace-gap)',
          pointerEvents: 'none',
        }}
      >
        <section style={{ ...cardShell, pointerEvents: 'auto' }}>
          <p
            style={{
              margin: 0,
              color: '#2dd1cc',
              fontSize: 'clamp(10px, 0.7vw, 12px)',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            AIC · EVIDENCE LAYER
          </p>
          <h1
            style={{
              margin: '8px 0 0',
              color: '#eff6ff',
              fontSize: 'clamp(24px, 2.1vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
            }}
          >
            模型证据中心
          </h1>
          <p
            style={{
              margin: '10px 0 0',
              color: '#8ea3c1',
              fontSize: 'clamp(12px, 0.82vw, 14px)',
              lineHeight: 1.65,
              maxWidth: '900px',
            }}
          >
            这一页专门把 AIC 需要的算法可信证据转化为 iCAN 也能复用的产品性能资产。
          </p>
        </section>

        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRadius: 'clamp(18px, 1.15vw, 24px)',
            border: '1px solid rgba(145, 181, 238, 0.14)',
            background:
              'linear-gradient(145deg, rgba(15, 27, 49, 0.47), rgba(7, 15, 30, 0.34))',
            boxShadow:
              'inset 0 1px 0 rgba(255, 255, 255, 0.055), inset 0 -1px 0 rgba(89, 130, 197, 0.035), 0 18px 46px rgba(0, 0, 0, 0.18), 0 0 28px rgba(68, 118, 207, 0.025)',
            backdropFilter: 'blur(19px) saturate(125%)',
            WebkitBackdropFilter: 'blur(19px) saturate(125%)',
            padding: 'clamp(14px, 1vw, 18px)',
            pointerEvents: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(120, 170, 230, .28) transparent',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'clamp(10px, 0.8vw, 14px)',
              gridAutoRows: 'minmax(0, 1fr)',
              minHeight: '100%',
            }}
          >
            {cards.map(([title, text], index) => {
              const [accent, soft] = cardColors[index % cardColors.length];
              return (
                <article
                  key={title}
                  style={{
                    minWidth: 0,
                    minHeight: 0,
                    padding: '16px 18px 14px',
                    borderRadius: '14px',
                    border: `1px solid color-mix(in srgb, ${accent} 28%, rgba(115, 151, 202, 0.14) 72%)`,
                    background: `linear-gradient(160deg, rgba(15, 29, 50, .78), rgba(8, 18, 34, .72))`,
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,.035), 0 5px 13px rgba(0,0,0,.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      display: 'grid',
                      placeItems: 'center',
                      color: accent,
                      background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 18%, transparent 82%), color-mix(in srgb, ${accent} 6%, transparent 94%))`,
                      border: `1px solid color-mix(in srgb, ${accent} 22%, transparent 78%)`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      fontSize: '14px',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      color: '#eff6ff',
                      fontSize: 'clamp(16px, 1.1vw, 20px)',
                      lineHeight: 1.2,
                      fontWeight: 800,
                    }}
                  >
                    {title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: '#b7c8dd',
                      fontSize: 'clamp(12px, 0.8vw, 14px)',
                      lineHeight: 1.7,
                    }}
                  >
                    {text}
                  </p>
                  <span
                    style={{
                      marginTop: 'auto',
                      alignSelf: 'flex-start',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: `1px solid color-mix(in srgb, ${accent} 22%, transparent 78%)`,
                      color: accent,
                      background: `color-mix(in srgb, ${accent} 8%, transparent 92%)`,
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    WAITING FOR FINAL EXPERIMENTS
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
