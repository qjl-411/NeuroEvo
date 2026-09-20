import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../auth/session';
import { NavLink } from 'react-router-dom';
import { initNeuralBackground } from '../landing/neuralBackground.js';
import '../landing/landing-scene.css';
import './workspace.css';


function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg className="brand-user-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.8v5.6" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M5 14.5v4.2A1.3 1.3 0 0 0 6.3 20h11.4a1.3 1.3 0 0 0 1.3-1.3v-4.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4.8h6V7" />
      <path d="m6.5 7 .8 13h9.4l.8-13" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5.5 5.7v5.6c0 4.4 2.6 7.6 6.5 9.7 3.9-2.1 6.5-5.3 6.5-9.7V5.7L12 3Z" />
      <path d="m9.4 12 1.7 1.7 3.6-3.8" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5h8l4 4V20.5H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 12h6" />
      <path d="M9 15.5h6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.3" />
      <circle cx="9" cy="9.2" r="1.5" />
      <path d="m5.8 17 4.2-4.1 3 2.8 2.4-2.1 2.8 3.4" />
    </svg>
  );
}

function CloudGlyph() {
  return (
    <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.2 18.5H6.7a4.2 4.2 0 0 1-.7-8.3A7 7 0 0 1 19 8.4a5.1 5.1 0 0 1 1.6 10.1H8.2Z" />
    </svg>
  );
}


type AnalysisState = 'idle' | 'processing' | 'completed' | 'failed';
type PredictionCategoryId = 'none' | 'very-mild' | 'mild' | 'moderate';

type PredictionCategory = {
  id: PredictionCategoryId;
  label: string;
  probability: number;
  color: string;
  softColor: string;
  selected?: boolean;
};

type ExplainabilityImagePayload = {
  heatmap_url: string;
  overlay_url: string;
  width: number;
  height: number;
};

type AnalyzeResponse = {
  analysis_id: string;
  state: 'completed';
  model: {
    name: string;
    epoch: number | null;
    device: string;
    architecture_fingerprint: string | null;
  };
  image: {
    filename: string;
    content_type: string | null;
    width: number;
    height: number;
    input_width: number;
    input_height: number;
  };
  prediction: {
    class_id: PredictionCategoryId;
    model_class: string;
    label: string;
    confidence: number;
  };
  probabilities: Record<PredictionCategoryId, number>;
  explainability: {
    status: string;
    attention_map_url: string | null;
    gradcam_url: string | null;
    message: string;
    spatial_attention: ExplainabilityImagePayload | null;
    gradcam: ExplainabilityImagePayload | null;
  };
  runtime: {
    preprocessing_ms: number;
    inference_ms: number;
    explainability_ms: number;
    total_ms: number;
  };
  report: {
    report_id: string;
    analysis_id: string;
    generated_at: string;
    disclaimer: string;
  } & Record<string, unknown>;
  latency_ms: number;
};

type TrainingMetricPoint = {
  epoch: number;
  train_loss: number | null;
  val_loss: number | null;
  accuracy: number | null;
  f1: number | null;
  kappa: number | null;
};

type ModelMetricsResponse = {
  available: boolean;
  message: string;
  series: TrainingMetricPoint[];
};

const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 180_000;
// Keep the analysis state visible long enough for the interface to communicate that
// preprocessing / inference / explainability are actually being performed. This only
// delays presentation; it never changes backend latency measurements or model output.
const MIN_ANALYSIS_PRESENTATION_MS = 10_000;
const RESULT_GAUGE_ANIMATION_MS = 1_850;
const RESULT_GAUGE_SWITCH_MS = 720;
const TRAINING_CURVE_ANIMATION_MS = 10_000;

const PREDICTION_CATEGORY_META: Omit<PredictionCategory, 'probability' | 'selected'>[] = [
  { id: 'none', label: '无障碍', color: '#6ea0ff', softColor: '#dfeaff' },
  { id: 'very-mild', label: '非常轻度障碍', color: '#13b8ba', softColor: '#def8f6' },
  { id: 'mild', label: '轻度障碍', color: '#f2a64b', softColor: '#fff1dd' },
  { id: 'moderate', label: '中度障碍', color: '#9b74e8', softColor: '#efe4ff' },
];

function buildPredictionCategories(result: AnalyzeResponse | null): PredictionCategory[] {
  return PREDICTION_CATEGORY_META.map((item) => ({
    ...item,
    probability: result ? (result.probabilities[item.id] ?? 0) * 100 : 0,
    selected: result?.prediction.class_id === item.id,
  }));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] ?? char));
}

function downloadDataUrl(url: string | null, filename: string) {
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

type ReportPatientInfo = { name: string; age: string; sex: string };

type RasterPdfPage = {
  jpeg: Uint8Array;
  width: number;
  height: number;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function safeFilenamePart(value: string) {
  return value.trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
}

function buildRasterPdf(pages: RasterPdfPage[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let byteOffset = 0;

  const push = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    byteOffset += bytes.byteLength;
  };

  push('%PDF-1.4\n% NeuroEvo-AD generated report\n');
  const objectCount = 2 + pages.length * 3;

  const beginObject = (id: number) => {
    offsets[id] = byteOffset;
    push(`${id} 0 obj\n`);
  };
  const endObject = () => push('endobj\n');

  beginObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  beginObject(2);
  const kids = pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ');
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`);
  endObject();

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    beginObject(pageId);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    endObject();

    beginObject(imageId);
    push(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.byteLength} >>\nstream\n`);
    push(page.jpeg);
    push('\nendstream\n');
    endObject();

    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
    const contentBytes = encoder.encode(content);
    beginObject(contentId);
    push(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
    push(contentBytes);
    push('endstream\n');
    endObject();
  });

  const xrefOffset = byteOffset;
  push(`xref\n0 ${objectCount + 1}\n`);
  push('0000000000 65535 f \n');
  for (let id = 1; id <= objectCount; id += 1) {
    push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: 'application/pdf' });
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('无法将报告页面转换为图像。'));
    }, 'image/jpeg', 0.92);
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function loadReportImage(url: string | null) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const image = new Image();
    if (/^https?:/i.test(url)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawReportImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = '#07111f';
  ctx.fillRect(x, y, width, height);
  if (!image) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('图像不可用', x + width / 2, y + height / 2);
    ctx.restore();
    return;
  }
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function wrapReportText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (char === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const candidate = line + char;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawReportWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color = '#334155',
) {
  ctx.fillStyle = color;
  const lines = wrapReportText(ctx, text, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + Math.max(1, lines.length) * lineHeight;
}

function reportSexLabel(value: string) {
  if (value === 'male') return '男';
  if (value === 'female') return '女';
  if (value === 'other') return '其他 / 不填';
  return '—';
}

function buildJointInterpretation(result: AnalyzeResponse) {
  return `空间注意力图用于反映模型在输入影像中主动关注的区域，Grad-CAM 用于反映对“${result.prediction.label}”这一预测类别贡献较高的区域。两类高亮若在空间上出现重叠，可作为模型决策关注一致性的辅助线索；但这些高响应像素并不等同于经过人工标注验证的解剖病灶，也不能自动推断具体脑区或替代影像科医师判读。`;
}

function buildMedicalGuidance(result: AnalyzeResponse) {
  const categoryGuidance: Record<PredictionCategoryId, string> = {
    none: '本次模型输出未提示明显认知障碍分类特征，但单次二维影像分类不能排除早期或非典型改变；如存在持续认知主诉，仍建议按临床路径进一步评估。',
    'very-mild': '本次模型输出倾向非常轻度障碍类别。建议结合近期认知变化、日常功能以及标准化认知量表结果判断其临床意义。',
    mild: '本次模型输出倾向轻度障碍类别。建议由神经内科/记忆门诊结合完整 MRI 序列、认知量表及相关实验室检查进行进一步评估。',
    moderate: '本次模型输出倾向中度障碍类别。若临床同时存在明显记忆、执行或日常功能下降，建议尽快进行规范的神经专科评估与完整影像学判读。',
  };
  return [
    categoryGuidance[result.prediction.class_id],
    '建议由影像科或神经科专业人员结合完整 MRI 序列、病史、神经系统查体以及 MMSE/MoCA 等认知评估综合判断。',
    '如模型结果与正式影像学报告或临床表现不一致，应以专业临床评估和正式影像学结论为准。',
    '本报告不用于自行确诊、用药调整或替代医生诊疗；如症状近期快速进展或伴随新的神经系统症状，应及时就医。',
  ];
}

function createReportCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法创建 PDF 绘图上下文。');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function drawReportHeader(ctx: CanvasRenderingContext2D, pageNumber: number, title: string) {
  ctx.fillStyle = '#0b1728';
  ctx.fillRect(0, 0, 1240, 150);
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(0, 0, 12, 150);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 42px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText('NeuroEvo-AD', 72, 68);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 24px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(title, 72, 111);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px Arial, sans-serif';
  ctx.fillText(`PAGE ${pageNumber}`, 1168, 83);
  ctx.textAlign = 'left';
}

function drawReportSectionTitle(ctx: CanvasRenderingContext2D, title: string, y: number) {
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(title, 72, y);
  ctx.fillStyle = '#22b8bd';
  ctx.fillRect(72, y + 16, 96, 5);
  return y + 52;
}

function drawReportCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  valueColor = '#0f172a',
) {
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#dbe5ef';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 108, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(label, x + 22, y + 36);
  ctx.fillStyle = valueColor;
  ctx.font = '700 28px "Microsoft YaHei", "PingFang SC", sans-serif';
  const display = value.length > 22 ? `${value.slice(0, 21)}…` : value;
  ctx.fillText(display, x + 22, y + 79);
}

function drawReportFooter(ctx: CanvasRenderingContext2D, result: AnalyzeResponse) {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 1688);
  ctx.lineTo(1168, 1688);
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 16px Arial, "Microsoft YaHei", sans-serif';
  ctx.fillText(`Analysis ID: ${result.analysis_id}`, 72, 1723);
  ctx.textAlign = 'right';
  ctx.fillText('Research-use / 辅助分析输出', 1168, 1723);
  ctx.textAlign = 'left';
}

async function exportAnalysisPdf(
  result: AnalyzeResponse,
  sourceImageUrl: string | null,
  patient: ReportPatientInfo,
  metrics: ModelMetricsResponse | null,
) {
  const [sourceImage, attentionImage, gradcamImage] = await Promise.all([
    loadReportImage(sourceImageUrl),
    loadReportImage(result.explainability.attention_map_url),
    loadReportImage(result.explainability.gradcam_url),
  ]);
  const pages: RasterPdfPage[] = [];
  const pushPage = async (canvas: HTMLCanvasElement) => {
    pages.push({ jpeg: await canvasToJpegBytes(canvas), width: canvas.width, height: canvas.height });
  };
  const generatedAt = (() => {
    const parsed = new Date(result.report.generated_at);
    return Number.isNaN(parsed.getTime()) ? result.report.generated_at : parsed.toLocaleString('zh-CN', { hour12: false });
  })();
  const predictionMeta = PREDICTION_CATEGORY_META.find((item) => item.id === result.prediction.class_id);
  const predictionColor = predictionMeta?.color ?? '#2563eb';

  // Page 1 - patient, prediction, probabilities and original MRI.
  {
    const { canvas, ctx } = createReportCanvas();
    drawReportHeader(ctx, 1, 'MRI 智能分析检测报告');
    ctx.fillStyle = '#64748b';
    ctx.font = '500 19px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(`报告编号：${result.report.report_id}`, 72, 190);
    ctx.textAlign = 'right';
    ctx.fillText(`生成时间：${generatedAt}`, 1168, 190);
    ctx.textAlign = 'left';

    let y = drawReportSectionTitle(ctx, '受检者信息', 246);
    drawReportCard(ctx, 72, y, 342, '姓名 / 病例编号', patient.name || '—');
    drawReportCard(ctx, 449, y, 342, '年龄', patient.age ? `${patient.age} 岁` : '—');
    drawReportCard(ctx, 826, y, 342, '性别', reportSexLabel(patient.sex));

    y = drawReportSectionTitle(ctx, '模型预测结果', y + 174);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#dbe5ef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(72, y, 1096, 150, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('预测类别', 98, y + 43);
    ctx.fillText('模型置信度', 98, y + 111);
    ctx.fillStyle = predictionColor;
    ctx.font = '700 36px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(result.prediction.label, 250, y + 46);
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText(`${(result.prediction.confidence * 100).toFixed(2)}%`, 250, y + 113);
    ctx.fillStyle = '#475569';
    ctx.font = '500 19px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(`模型：${result.model.name} · Epoch ${result.model.epoch ?? '—'}`, 745, y + 48);
    ctx.fillText(`本次分析总耗时：${result.runtime.total_ms.toFixed(1)} ms`, 745, y + 86);
    ctx.fillText(`输入尺寸：${result.image.input_width} × ${result.image.input_height}`, 745, y + 124);

    y = drawReportSectionTitle(ctx, '四分类概率', y + 220);
    PREDICTION_CATEGORY_META.forEach((item, index) => {
      const value = Math.max(0, Math.min(1, result.probabilities[item.id] ?? 0));
      const rowY = y + index * 58;
      ctx.fillStyle = '#334155';
      ctx.font = '600 21px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.fillText(item.label, 72, rowY + 25);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(300, rowY + 5, 700, 22, 11);
      ctx.fill();
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(300, rowY + 5, Math.max(4, 700 * value), 22, 11);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'right';
      ctx.font = '700 21px Arial, sans-serif';
      ctx.fillText(`${(value * 100).toFixed(2)}%`, 1168, rowY + 25);
      ctx.textAlign = 'left';
    });

    y = drawReportSectionTitle(ctx, '上传 MRI 影像', y + 278);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 18px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(`${result.image.filename} · 原始尺寸 ${result.image.width} × ${result.image.height}`, 72, y + 6);
    drawReportImage(ctx, sourceImage, 360, y + 34, 520, 390);
    ctx.strokeStyle = '#dbe5ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(360, y + 34, 520, 390);
    drawReportFooter(ctx, result);
    await pushPage(canvas);
  }

  // Page 2 - explainability.
  {
    const { canvas, ctx } = createReportCanvas();
    drawReportHeader(ctx, 2, '模型可解释性与联合解读');
    let y = drawReportSectionTitle(ctx, '模型可解释性图像', 230);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 18px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('下列高亮表示模型响应强度，不代表自动解剖定位或病灶分割。', 72, y);

    const imageY = y + 48;
    drawReportImage(ctx, attentionImage, 72, imageY, 520, 500);
    drawReportImage(ctx, gradcamImage, 648, imageY, 520, 500);
    ctx.strokeStyle = '#dbe5ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, imageY, 520, 500);
    ctx.strokeRect(648, imageY, 520, 500);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2. Spatial Attention Map', 332, imageY + 538);
    ctx.fillText(`3. Grad-CAM（${result.prediction.label}）`, 908, imageY + 538);
    ctx.textAlign = 'left';

    y = drawReportSectionTitle(ctx, '联合解读', imageY + 620);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#dbe5ef';
    ctx.beginPath();
    ctx.roundRect(72, y, 1096, 250, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.font = '500 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawReportWrappedText(ctx, buildJointInterpretation(result), 102, y + 48, 1036, 39);

    y = drawReportSectionTitle(ctx, '解释性注意事项', y + 322);
    const notes = [
      'Spatial Attention 反映模型主动关注区域；Grad-CAM 反映对当前预测类别的贡献区域。',
      '热力图受网络结构、输入预处理与当前模型参数共同影响，不应被解释为定量脑区测量结果。',
      '对可疑区域的临床意义判断需要结合完整 MRI 序列和专业影像学阅片。',
    ];
    ctx.font = '500 22px "Microsoft YaHei", "PingFang SC", sans-serif';
    notes.forEach((note, index) => {
      const rowY = y + index * 78;
      ctx.fillStyle = '#22a6aa';
      ctx.beginPath();
      ctx.arc(86, rowY + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      drawReportWrappedText(ctx, note, 112, rowY + 18, 1035, 34);
    });
    drawReportFooter(ctx, result);
    await pushPage(canvas);
  }

  // Page 3 - clinical-use guidance, model/runtime information, disclaimer.
  {
    const { canvas, ctx } = createReportCanvas();
    drawReportHeader(ctx, 3, '建议、模型信息与使用说明');
    let y = drawReportSectionTitle(ctx, '医学与随访建议', 230);
    ctx.font = '500 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    buildMedicalGuidance(result).forEach((guidance, index) => {
      const startY = y + index * 150;
      ctx.fillStyle = '#ecfeff';
      ctx.strokeStyle = '#b7e7e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(72, startY, 1096, 126, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f8b8d';
      ctx.font = '700 22px Arial, sans-serif';
      ctx.fillText(String(index + 1).padStart(2, '0'), 98, startY + 42);
      ctx.font = '500 22px "Microsoft YaHei", "PingFang SC", sans-serif';
      drawReportWrappedText(ctx, guidance, 154, startY + 38, 980, 35, '#334155');
    });

    y = drawReportSectionTitle(ctx, '模型与运行信息', y + 645);
    const bestPoint = metrics?.series
      .filter((point) => typeof point.accuracy === 'number')
      .reduce<TrainingMetricPoint | null>((best, point) => (!best || Number(point.accuracy) > Number(best.accuracy) ? point : best), null) ?? null;
    const infoRows = [
      ['模型名称', result.model.name],
      ['模型 Epoch', String(result.model.epoch ?? '—')],
      ['最佳训练曲线 Accuracy', bestPoint?.accuracy == null ? '—' : `${(bestPoint.accuracy * 100).toFixed(2)}%（Epoch ${bestPoint.epoch}）`],
      ['预处理耗时', `${result.runtime.preprocessing_ms.toFixed(1)} ms`],
      ['推理耗时', `${result.runtime.inference_ms.toFixed(1)} ms`],
      ['可解释性耗时', `${result.runtime.explainability_ms.toFixed(1)} ms`],
      ['总耗时', `${result.runtime.total_ms.toFixed(1)} ms`],
      ['Architecture fingerprint', result.model.architecture_fingerprint ?? '—'],
    ];
    infoRows.forEach(([label, value], index) => {
      const rowY = y + index * 52;
      if (index % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(72, rowY - 26, 1096, 48);
      }
      ctx.fillStyle = '#64748b';
      ctx.font = '500 19px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.fillText(label, 88, rowY + 4);
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 19px Arial, "Microsoft YaHei", sans-serif';
      const max = label === 'Architecture fingerprint' ? 78 : 62;
      ctx.fillText(value.length > max ? `${value.slice(0, max)}…` : value, 420, rowY + 4);
    });

    y += infoRows.length * 52 + 24;
    ctx.fillStyle = '#fff7ed';
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(72, y, 1096, 170, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9a3412';
    ctx.font = '700 23px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('重要说明', 98, y + 42);
    ctx.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif';
    drawReportWrappedText(
      ctx,
      '本报告为科研与辅助分析输出。模型预测、概率和可解释性图像均不能作为独立临床诊断依据，不能替代医生对完整影像、病史和检查结果的综合判断。',
      98,
      y + 82,
      1035,
      33,
      '#7c2d12',
    );
    drawReportFooter(ctx, result);
    await pushPage(canvas);
  }

  const pdf = buildRasterPdf(pages);
  const identity = safeFilenamePart(patient.name) || result.analysis_id.slice(0, 8);
  const day = new Date().toISOString().slice(0, 10);
  downloadBlob(pdf, `NeuroEvo-AD_MRI_Report_${identity}_${day}.pdf`);
}

function StateCover({
  state,
  idleText,
  processingText,
  error,
}: {
  state: AnalysisState;
  idleText: string;
  processingText: string;
  error?: string | null;
}) {
  if (state === 'completed') return null;

  return (
    <div className={`workspace-state-cover is-${state}`} role="status" aria-live="polite">
      <span className="workspace-state-cover-icon" aria-hidden="true">
        {state === 'processing' ? <span className="workspace-state-spinner" /> : <ShieldIcon />}
      </span>
      <strong>
        {state === 'idle' ? '等待真实数据' : state === 'processing' ? '正在分析 MRI' : '分析未完成'}
      </strong>
      <p>
        {state === 'idle' ? idleText : state === 'processing' ? processingText : (error || '请检查模型服务后重新上传图像。')}
      </p>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="m18.5 16 .8 2 .8-2 2-.8-2-.8-.8-2-.8 2-2 .8 2 .8Z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 7.2v1.6" />
      <path d="M12 15.2v1.6" />
      <path d="M7.2 12h1.6" />
      <path d="M15.2 12h1.6" />
    </svg>
  );
}

function BrainClassIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.7 6.2c-2.3 0-4.1 1.8-4.1 4v.3a3.4 3.4 0 0 0-1.9 3.1c0 1.4.8 2.7 2 3.3 0 2.6 2 4.7 4.5 4.7 1.4 0 2.6-.6 3.4-1.7.8 1.1 2 1.7 3.4 1.7 2.5 0 4.5-2.1 4.5-4.7 1.2-.6 2-1.9 2-3.3 0-1.4-.7-2.6-1.9-3.1v-.3c0-2.2-1.8-4-4.1-4-1.4 0-2.6.7-3.3 1.8-.7-1.1-1.9-1.8-3.3-1.8Z" />
      <path d="M14 8.3v11.1" />
      <path d="M10.4 10.3c.8.2 1.5.7 1.9 1.4" />
      <path d="M17.6 10.3c-.8.2-1.5.7-1.9 1.4" />
      <path d="M9.2 14.2h2.7" />
      <path d="M16.1 14.2h2.7" />
      <path d="M10.7 18.4c.6-.2 1.1-.6 1.5-1.1" />
      <path d="M17.3 18.4c-.6-.2-1.1-.6-1.5-1.1" />
    </svg>
  );
}

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="m8 12.2 2.5 2.5 5.4-5.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function upperArcPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = (Math.PI / 180) * angleDeg;
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

function describeUpperArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = upperArcPoint(cx, cy, r, startAngle);
  const end = upperArcPoint(cx, cy, r, endAngle);
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 0 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function ResultGauge({ categories, result }: { categories: PredictionCategory[]; result: AnalyzeResponse | null }) {
  const primary = categories.find((item) => item.selected) ?? null;
  const targetProbability = Math.max(0, Math.min(100, primary?.probability ?? 0));
  const [displayProbability, setDisplayProbability] = useState(0);
  const [isGaugeAnimating, setIsGaugeAnimating] = useState(false);
  const displayedProbabilityRef = useRef(0);
  const lastAnalysisIdRef = useRef<string | null>(null);
  const gaugeAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    displayedProbabilityRef.current = displayProbability;
  }, [displayProbability]);

  useEffect(() => {
    if (gaugeAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(gaugeAnimationFrameRef.current);
      gaugeAnimationFrameRef.current = null;
    }

    if (!result || !primary) {
      lastAnalysisIdRef.current = null;
      displayedProbabilityRef.current = 0;
      setDisplayProbability(0);
      setIsGaugeAnimating(false);
      return undefined;
    }

    const isNewAnalysis = lastAnalysisIdRef.current !== result.analysis_id;
    lastAnalysisIdRef.current = result.analysis_id;
    const startValue = isNewAnalysis ? 0 : displayedProbabilityRef.current;
    const duration = isNewAnalysis ? RESULT_GAUGE_ANIMATION_MS : RESULT_GAUGE_SWITCH_MS;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (reduceMotion || Math.abs(targetProbability - startValue) < 0.01) {
      displayedProbabilityRef.current = targetProbability;
      setDisplayProbability(targetProbability);
      setIsGaugeAnimating(false);
      return undefined;
    }

    displayedProbabilityRef.current = startValue;
    setDisplayProbability(startValue);
    setIsGaugeAnimating(true);
    const startedAt = performance.now();

    const animateGauge = (now: number) => {
      const rawProgress = Math.max(0, Math.min(1, (now - startedAt) / duration));
      // A mostly smooth rise with a tiny damped oscillation gives the gauge a subtle
      // "analysis settling" feel without changing the real target probability.
      const eased = 1 - Math.pow(1 - rawProgress, 2.8);
      const wobble = Math.sin(rawProgress * Math.PI * 5.2)
        * Math.pow(1 - rawProgress, 1.65)
        * (isNewAnalysis ? 0.018 : 0.009);
      const animatedProgress = Math.max(0, Math.min(1, eased + wobble));
      const nextValue = startValue + (targetProbability - startValue) * animatedProgress;
      displayedProbabilityRef.current = nextValue;
      setDisplayProbability(nextValue);

      if (rawProgress < 1) {
        gaugeAnimationFrameRef.current = window.requestAnimationFrame(animateGauge);
      } else {
        displayedProbabilityRef.current = targetProbability;
        setDisplayProbability(targetProbability);
        setIsGaugeAnimating(false);
        gaugeAnimationFrameRef.current = null;
      }
    };

    gaugeAnimationFrameRef.current = window.requestAnimationFrame(animateGauge);
    return () => {
      if (gaugeAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(gaugeAnimationFrameRef.current);
        gaugeAnimationFrameRef.current = null;
      }
    };
  }, [result?.analysis_id, primary?.id, targetProbability]);

  const probability = Math.max(0, Math.min(100, displayProbability));
  const markerAngle = 180 - probability * 1.8;
  const marker = upperArcPoint(200, 184, 148, markerAngle);
  const isViewingPrediction = Boolean(result && primary?.id === result.prediction.class_id);

  return (
    <div
      className={`result-gauge-card${isGaugeAnimating ? ' is-animating' : ''}`}
      style={{ '--result-gauge-accent': primary?.color ?? '#6ea0ff' } as CSSProperties}
    >
      <div className="result-gauge-visual">
        <svg className="result-gauge-svg" viewBox="0 0 400 205" fill="none" aria-hidden="true">
          <path className="result-gauge-track" d={describeUpperArc(200, 184, 148, 180, 0)} />
          {result && primary ? (
            <>
              <path
                className="result-gauge-progress"
                d={describeUpperArc(200, 184, 148, 180, 0)}
                pathLength={100}
                stroke={primary.color}
                strokeDasharray={`${probability} 100`}
              />
              <circle
                className="result-gauge-marker"
                cx={marker.x}
                cy={marker.y}
                r="5.5"
                fill={primary.color}
              />
            </>
          ) : null}
        </svg>

        <div className="result-gauge-center">
          <div className="result-gauge-score">{primary && result ? `${probability.toFixed(1)}%` : '—'}</div>
          <div className="result-gauge-label">{primary && result ? primary.label : '等待分析'}</div>
          <div className="result-gauge-divider" aria-hidden="true"><span /></div>
          <p>
            {result
              ? (isViewingPrediction ? '模型预测概率最高的类别' : '当前查看该类别的模型概率')
              : '上传 MRI 后显示真实结果'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  state,
  result,
  error,
}: {
  state: AnalysisState;
  result: AnalyzeResponse | null;
  error: string | null;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<PredictionCategoryId | null>(null);

  useEffect(() => {
    setSelectedCategoryId(result?.prediction.class_id ?? null);
  }, [result?.analysis_id, result?.prediction.class_id]);

  const activeCategoryId = result ? (selectedCategoryId ?? result.prediction.class_id) : null;
  const categories = buildPredictionCategories(result).map((item) => ({
    ...item,
    selected: item.id === activeCategoryId,
  }));

  return (
    <article className="workspace-glass-card workspace-card-result result-panel workspace-state-card" aria-label="预测结果模块">
      <div className="result-panel-shell">
        <header className="result-panel-header">
          <div className="result-panel-title-row">
            <h2>预测结果</h2>
            <span className="result-info-icon" title="展示当前病例的预测类别与四分类概率分布"><InfoIcon /></span>
          </div>
          <p>Prediction Result</p>
          <span className="result-panel-header-line" aria-hidden="true" />
        </header>

        <ResultGauge categories={categories} result={result} />

        <section className="result-prob-section" aria-label="各类别概率">
          <div className="result-prob-head">
            <h3>各类别概率</h3>
            <span className="result-info-icon" title="点击任一类别可在上方查看对应概率；不会改变模型真实预测结果"><InfoIcon /></span>
          </div>

          <div className="result-prob-grid">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`result-prob-card${item.selected ? ' is-active' : ''}`}
                style={{
                  '--result-card-accent': item.color,
                  '--result-card-soft': item.softColor,
                } as CSSProperties}
                aria-pressed={Boolean(item.selected)}
                aria-label={`查看${item.label}概率 ${result ? `${item.probability.toFixed(1)}%` : ''}`}
                disabled={!result}
                onClick={() => setSelectedCategoryId(item.id)}
              >
                {item.selected ? <span className="result-prob-check"><CheckBadgeIcon /></span> : null}
                <span className="result-prob-icon"><BrainClassIcon /></span>
                <h4>{item.label}</h4>
                <strong>{result ? `${item.probability.toFixed(1)}%` : '—'}</strong>
              </button>
            ))}
          </div>

          <p className="result-prob-note">
            {result
              ? `本次分析耗时 ${Math.round(result.latency_ms)} ms；点击类别仅切换概率查看，不改变模型真实预测。`
              : '未分析时不展示示例概率，避免将演示数据误认为真实模型输出。'}
          </p>
        </section>
      </div>
      <StateCover
        state={state}
        error={error}
        idleText="上传一张 MRI 图像后，这里才会展示真实四分类概率。"
        processingText="正在执行图像预处理、DMSA-Net 推理与可解释性分析，并整理结果，请稍候。"
      />
    </article>
  );
}


type TrainingMetricKey = 'overview' | 'trainLoss' | 'valLoss' | 'accuracy' | 'f1' | 'kappa';

type TrainingMetricConfig = {
  key: TrainingMetricKey;
  label: string;
  color: string;
  icon: 'overview' | 'train' | 'val' | 'accuracy' | 'f1' | 'kappa';
};

type TrainingSeries = {
  epoch: number;
  trainLoss: number | null;
  valLoss: number | null;
  accuracy: number | null;
  f1: number | null;
  kappa: number | null;
};

const TRAINING_METRICS: TrainingMetricConfig[] = [
  { key: 'overview', label: '总览', color: '#4fd2d0', icon: 'overview' },
  { key: 'trainLoss', label: '训练损失', color: '#31c3c8', icon: 'train' },
  { key: 'valLoss', label: '验证损失', color: '#8d62ff', icon: 'val' },
  { key: 'accuracy', label: '准确率', color: '#ff8c2a', icon: 'accuracy' },
  { key: 'f1', label: 'F1', color: '#4b8dff', icon: 'f1' },
  { key: 'kappa', label: 'Kappa', color: '#2dd1cc', icon: 'kappa' },
];

function normalizeTrainingSeries(points: TrainingMetricPoint[]): TrainingSeries[] {
  return points.map((point) => ({
    epoch: point.epoch,
    trainLoss: point.train_loss,
    valLoss: point.val_loss,
    accuracy: point.accuracy,
    f1: point.f1,
    kappa: point.kappa,
  }));
}

function buildTrainingExportPayload(metrics: ModelMetricsResponse | null, series: TrainingSeries[]) {
  const accuracyRows = series.filter((row) => typeof row.accuracy === 'number');
  const best = accuracyRows.length
    ? accuracyRows.reduce((current, row) => Number(row.accuracy) > Number(current.accuracy) ? row : current)
    : null;
  return {
    schema_version: 1,
    model: 'DMSA-Net',
    export_type: 'training_curve_data',
    exported_at: new Date().toISOString(),
    source_message: metrics?.message ?? '',
    epochs: series.length,
    summary: {
      best_epoch_by_accuracy: best?.epoch ?? null,
      best_accuracy: best?.accuracy ?? null,
      best_f1: best?.f1 ?? null,
      best_kappa: best?.kappa ?? null,
    },
    series: series.map((row) => ({
      epoch: row.epoch,
      train_loss: row.trainLoss,
      val_loss: row.valLoss,
      accuracy: row.accuracy,
      f1: row.f1,
      kappa: row.kappa,
    })),
  };
}

function formatTrainingValue(value: number | null, digits = 4) {
  return value == null ? '—' : value.toFixed(digits);
}

function TrainingOverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 18.5h16" />
      <path d="M6 16V7.8" />
      <path d="m6 14.4 3.2-3.7 3 2.3 4.8-5.3 1.9 1.8" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 7 5 5 4-4 5 8" />
      <path d="M18 16h3v-3" />
    </svg>
  );
}

function TrendDownRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 6 5 6 4-2.8 5 8" />
      <path d="M18 16h3v-3" />
    </svg>
  );
}

function AccuracyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 4.5v2.2" />
      <path d="M19.5 12h-2.2" />
      <path d="m16.9 7.1-1.6 1.6" />
      <path d="m12 12 4-4" />
    </svg>
  );
}

function F1Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M8 15V9h4" />
      <path d="M8 12h3" />
      <path d="M14.2 9h2.6v6" />
    </svg>
  );
}

function MetricTabIcon({ type }: { type: TrainingMetricConfig['icon'] }) {
  switch (type) {
    case 'overview':
      return <TrainingOverviewIcon />;
    case 'train':
      return <TrendDownIcon />;
    case 'val':
      return <TrendDownRightIcon />;
    case 'accuracy':
      return <AccuracyIcon />;
    case 'f1':
      return <F1Icon />;
    case 'kappa':
      return <ShieldIcon />;
    default:
      return <TrainingOverviewIcon />;
  }
}

function TrainingHeaderIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.5 22h17" />
      <path d="M8 18.7 12 14l4.1 3.1 5-6.2" />
      <path d="M19.8 11h2.3v2.3" />
    </svg>
  );
}

function TrainingChart({
  state,
  metrics,
  error,
}: {
  state: AnalysisState;
  metrics: ModelMetricsResponse | null;
  error: string | null;
}) {
  const [activeMetric, setActiveMetric] = useState<TrainingMetricKey>('overview');
  const [scrollRatio, setScrollRatio] = useState(0);
  const [scrollThumbWidth, setScrollThumbWidth] = useState(100);
  const [canScrollChart, setCanScrollChart] = useState(false);
  const [showTrainingLog, setShowTrainingLog] = useState(false);
  const [trainingActionMessage, setTrainingActionMessage] = useState('');
  const [curveReveal, setCurveReveal] = useState(0);
  const chartViewportRef = useRef<HTMLDivElement>(null);
  const curveAnimationFrameRef = useRef<number | null>(null);
  const autoScrollCurveRef = useRef(true);
  const trainingData = normalizeTrainingSeries(metrics?.series ?? []);
  const trainingActionsEnabled = state === 'completed' && trainingData.length > 0;
  const curveAnimationComplete = curveReveal >= 0.999;
  const visibleTrainingPointCount = trainingData.length
    ? Math.max(1, Math.min(trainingData.length, Math.ceil(trainingData.length * curveReveal)))
    : 0;
  const visibleTrainingData = trainingData.slice(0, visibleTrainingPointCount);

  const maxEpoch = Math.max(1, ...trainingData.map((row) => row.epoch));
  const chartWidth = Math.max(1160, Math.round(136 + Math.max(900, Math.max(0, maxEpoch - 1) * 7.6)));
  const height = 220;
  // Keep the first visible epoch anchored close to the viewport's left edge.
  // The SVG is horizontally scrollable, so the initial view should not waste space
  // before the Y axis / Epoch 1.
  const margin = { top: 27, right: 58, bottom: 43, left: 46 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const lossValues = trainingData
    .flatMap((row) => [row.trainLoss, row.valLoss])
    .filter((value): value is number => value !== null);
  const leftMax = Math.max(1, ...lossValues) * 1.05;
  const leftTicks = [0, .25, .5, .75, 1].map((ratio) => leftMax * ratio);
  const rightTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTickStep = maxEpoch <= 140 ? 20 : maxEpoch <= 240 ? 25 : 50;
  const xTicks = trainingData.length
    ? Array.from(new Set([
        1,
        ...Array.from({ length: Math.floor(maxEpoch / xTickStep) }, (_, index) => (index + 1) * xTickStep),
        maxEpoch,
      ].filter((tick) => tick >= 1 && tick <= maxEpoch))).sort((a, b) => a - b)
    : [];

  const xForEpoch = (epoch: number) => margin.left + ((epoch - 1) / Math.max(1, maxEpoch - 1)) * plotWidth;
  const yLeft = (value: number) => margin.top + plotHeight - (value / leftMax) * plotHeight;
  const yRight = (value: number) => margin.top + plotHeight - value * plotHeight;

  const linePath = (key: keyof Omit<TrainingSeries, 'epoch'>, scale: 'left' | 'right') => {
    let drawing = false;
    return visibleTrainingData.map((row) => {
      const value = row[key];
      if (typeof value !== 'number') {
        drawing = false;
        return '';
      }
      const x = xForEpoch(row.epoch);
      const y = scale === 'left' ? yLeft(value) : yRight(value);
      const command = drawing ? 'L' : 'M';
      drawing = true;
      return `${command} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).filter(Boolean).join(' ');
  };

  const seriesMeta = [
    { key: 'trainLoss' as const, label: '训练损失', color: '#31c3c8', scale: 'left' as const },
    { key: 'valLoss' as const, label: '验证损失', color: '#8d62ff', scale: 'left' as const },
    { key: 'accuracy' as const, label: '准确率', color: '#ff8c2a', scale: 'right' as const },
    { key: 'f1' as const, label: 'F1', color: '#4b8dff', scale: 'right' as const },
    { key: 'kappa' as const, label: 'Kappa', color: '#2dd1cc', scale: 'right' as const },
  ];

  const isOverview = activeMetric === 'overview';
  const accuracyPoints = trainingData.filter((row) => typeof row.accuracy === 'number');
  const bestPoint = accuracyPoints.length
    ? accuracyPoints.reduce((best, row) => (Number(row.accuracy) > Number(best.accuracy) ? row : best))
    : null;
  const bestX = bestPoint ? xForEpoch(bestPoint.epoch) : null;
  const bestY = bestPoint?.accuracy !== null && bestPoint?.accuracy !== undefined
    ? yRight(bestPoint.accuracy)
    : null;
  const revealHeadRow = visibleTrainingData.length ? visibleTrainingData[visibleTrainingData.length - 1] : null;
  const revealHeadX = revealHeadRow ? xForEpoch(revealHeadRow.epoch) : null;

  const syncChartScroll = () => {
    const viewport = chartViewportRef.current;
    if (!viewport) return;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    setCanScrollChart(maxScroll > 1);
    setScrollThumbWidth(viewport.scrollWidth > 0
      ? Math.min(100, Math.max(16, (viewport.clientWidth / viewport.scrollWidth) * 100))
      : 100);
    setScrollRatio(maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0);
  };

  useEffect(() => {
    const viewport = chartViewportRef.current;
    if (!viewport) return undefined;

    const update = () => syncChartScroll();
    update();
    window.addEventListener('resize', update);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resizeObserver?.observe(viewport);

    return () => {
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [chartWidth, metrics?.series.length]);

  const setChartScrollRatio = (nextRatio: number) => {
    const viewport = chartViewportRef.current;
    if (!viewport) return;
    autoScrollCurveRef.current = false;
    const clamped = Math.max(0, Math.min(1, nextRatio));
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = maxScroll * clamped;
    setScrollRatio(clamped);
  };

  const scrollChartByPage = (direction: -1 | 1) => {
    const viewport = chartViewportRef.current;
    if (!viewport) return;
    autoScrollCurveRef.current = false;
    viewport.scrollBy({ left: direction * viewport.clientWidth * 0.72, behavior: 'smooth' });
  };

  useEffect(() => {
    if (curveAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(curveAnimationFrameRef.current);
      curveAnimationFrameRef.current = null;
    }

    const viewport = chartViewportRef.current;
    if (state !== 'completed' || !metrics?.available || !metrics.series.length) {
      setCurveReveal(0);
      if (viewport) viewport.scrollLeft = 0;
      return undefined;
    }

    autoScrollCurveRef.current = true;
    setCurveReveal(0);
    if (viewport) viewport.scrollLeft = 0;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) {
      setCurveReveal(1);
      window.requestAnimationFrame(() => {
        const currentViewport = chartViewportRef.current;
        if (!currentViewport) return;
        currentViewport.scrollLeft = Math.max(0, currentViewport.scrollWidth - currentViewport.clientWidth);
      });
      return undefined;
    }

    const startedAt = performance.now();
    const animateCurve = (now: number) => {
      const rawProgress = Math.max(0, Math.min(1, (now - startedAt) / TRAINING_CURVE_ANIMATION_MS));
      const easedProgress = 0.5 - Math.cos(Math.PI * rawProgress) / 2;
      setCurveReveal(easedProgress);

      const currentViewport = chartViewportRef.current;
      if (currentViewport && autoScrollCurveRef.current) {
        const maxScroll = Math.max(0, currentViewport.scrollWidth - currentViewport.clientWidth);
        if (maxScroll > 0) {
          const headX = margin.left + easedProgress * plotWidth;
          const desiredLeft = rawProgress >= 0.999
            ? maxScroll
            : Math.max(0, Math.min(maxScroll, headX - currentViewport.clientWidth * 0.78));
          currentViewport.scrollLeft = desiredLeft;
        }
      }

      if (rawProgress < 1) {
        curveAnimationFrameRef.current = window.requestAnimationFrame(animateCurve);
      } else {
        setCurveReveal(1);
        curveAnimationFrameRef.current = null;
      }
    };

    curveAnimationFrameRef.current = window.requestAnimationFrame(animateCurve);
    return () => {
      if (curveAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(curveAnimationFrameRef.current);
        curveAnimationFrameRef.current = null;
      }
    };
  }, [state, metrics]);

  const scrollThumbLeft = scrollRatio * Math.max(0, 100 - scrollThumbWidth);

  const exportTrainingCurve = () => {
    if (!trainingActionsEnabled) return;
    const payload = buildTrainingExportPayload(metrics, trainingData);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `DMSA-Net_training_curve_${new Date().toISOString().slice(0, 10)}.json`);
    setTrainingActionMessage(`已导出 ${trainingData.length} 个 Epoch 的真实训练指标（JSON）`);
  };

  useEffect(() => {
    if (!showTrainingLog) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTrainingLog(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTrainingLog]);

  useEffect(() => {
    if (!trainingActionsEnabled) {
      setShowTrainingLog(false);
      setTrainingActionMessage('');
    }
  }, [trainingActionsEnabled]);

  return (
    <section className="training-panel" aria-label="DMSA-Net 模型性能模块">
      <header className="training-panel-header">
        <span className="training-panel-header-icon"><TrainingHeaderIcon /></span>
        <div className="training-panel-header-text">
          <div className="training-title-row">
            <h2>DMSA-Net 模型性能</h2>
            <span className="training-info-icon" title="这里只展示正式训练产物中的真实指标"><InfoIcon /></span>
          </div>
          <p>仅展示真实训练记录，不生成演示曲线</p>
        </div>
      </header>

      <div className="training-tab-row" role="tablist" aria-label="训练指标切换">
        {TRAINING_METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={activeMetric === item.key}
            className={`training-tab${activeMetric === item.key ? ' is-active' : ''}`}
            onClick={() => setActiveMetric(item.key)}
            style={{ '--training-accent': item.color } as CSSProperties}
            disabled={state !== 'completed'}
          >
            <span className="training-tab-icon"><MetricTabIcon type={item.icon} /></span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="training-chart-card">
        <div className="training-chart-legend">
          {seriesMeta.map((series) => {
            const highlighted = isOverview || activeMetric === series.key;
            const available = trainingData.some((row) => typeof row[series.key] === 'number');
            return (
              <span key={series.key} className={`training-legend-item${highlighted && available ? ' is-active' : ''}`}>
                <i style={{ background: series.color }} />
                <span>{series.label}</span>
              </span>
            );
          })}
        </div>

        <div className="training-chart-wrap">
          <div
            className="training-chart-viewport"
            ref={chartViewportRef}
            onScroll={syncChartScroll}
            onPointerDown={() => { autoScrollCurveRef.current = false; }}
            onWheel={() => { autoScrollCurveRef.current = false; }}
            aria-label="可横向滚动的训练曲线"
          >
            <div className="training-chart-stage" style={{ width: `${chartWidth}px` }}>
              <svg
                className="training-chart-svg"
                width={chartWidth}
                height={height}
                viewBox={`0 0 ${chartWidth} ${height}`}
                preserveAspectRatio="xMinYMid meet"
                fill="none"
                aria-hidden="true"
              >
                {leftTicks.map((tick, index) => {
                  const y = yLeft(tick);
                  return (
                    <g key={`left-${index}`}>
                      <line x1={margin.left} y1={y} x2={chartWidth - margin.right} y2={y} className="training-grid-line" />
                      {trainingData.length ? (
                        <>
                          <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} className="training-axis-tick" />
                          <text x={margin.left - 11} y={y + 4} className="training-axis-text training-axis-text--left">{tick.toFixed(2)}</text>
                        </>
                      ) : null}
                    </g>
                  );
                })}

                {trainingData.length ? rightTicks.map((tick) => {
                  const y = yRight(tick);
                  return (
                    <g key={`right-${tick}`}>
                      <line x1={chartWidth - margin.right} y1={y} x2={chartWidth - margin.right + 5} y2={y} className="training-axis-tick" />
                      <text x={chartWidth - margin.right + 11} y={y + 4} className="training-axis-text training-axis-text--right">{Math.round(tick * 100)}%</text>
                    </g>
                  );
                }) : null}

                {xTicks.map((tick) => {
                  const x = xForEpoch(tick);
                  return (
                    <g key={`x-${tick}`}>
                      <line x1={x} y1={margin.top + plotHeight} x2={x} y2={margin.top + plotHeight + 5} className="training-axis-tick" />
                      <text x={x} y={height - 18} textAnchor="middle" className="training-axis-text">{tick}</text>
                    </g>
                  );
                })}

                {trainingData.length ? (
                  <>
                    <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} className="training-axis-line" />
                    <line x1={chartWidth - margin.right} y1={margin.top} x2={chartWidth - margin.right} y2={margin.top + plotHeight} className="training-axis-line training-axis-line--right" />
                    <line x1={margin.left} y1={margin.top + plotHeight} x2={chartWidth - margin.right} y2={margin.top + plotHeight} className="training-axis-line" />
                  </>
                ) : null}

                <text x={margin.left} y={16} className="training-axis-title">损失</text>
                <text x={chartWidth - margin.right} y={16} className="training-axis-title training-axis-title--right">指标值</text>
                <text x={chartWidth / 2} y={height - 2} textAnchor="middle" className="training-axis-label">Epoch</text>

                {seriesMeta.map((series) => {
                  const path = linePath(series.key, series.scale);
                  const highlighted = isOverview || activeMetric === series.key;
                  if (!path) return null;
                  return (
                    <path
                      key={series.key}
                      d={path}
                      className={`training-series-line${highlighted ? ' is-highlighted' : ' is-faded'}`}
                      style={{ '--series-color': series.color } as CSSProperties}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

                {!curveAnimationComplete && revealHeadRow && revealHeadX !== null ? (
                  <>
                    <line
                      x1={revealHeadX}
                      y1={margin.top}
                      x2={revealHeadX}
                      y2={margin.top + plotHeight}
                      className="training-reveal-head-line"
                    />
                    {seriesMeta.map((series) => {
                      const value = revealHeadRow[series.key];
                      if (typeof value !== 'number') return null;
                      const y = series.scale === 'left' ? yLeft(value) : yRight(value);
                      const highlighted = isOverview || activeMetric === series.key;
                      if (!highlighted) return null;
                      return (
                        <circle
                          key={`reveal-head-${series.key}`}
                          cx={revealHeadX}
                          cy={y}
                          r="3.6"
                          className="training-reveal-head-point"
                          style={{ '--series-color': series.color } as CSSProperties}
                        />
                      );
                    })}
                  </>
                ) : null}

                {curveAnimationComplete && bestPoint && bestX !== null ? (
                  <line x1={bestX} y1={margin.top} x2={bestX} y2={margin.top + plotHeight} className="training-best-line" />
                ) : null}
                {curveAnimationComplete && bestPoint && bestX !== null && bestY !== null ? (
                  <circle cx={bestX} cy={bestY} r="4.5" className="training-best-point" />
                ) : null}
              </svg>
            </div>
          </div>

          {curveAnimationComplete && bestPoint ? (
            <div className="training-best-callout">
              <strong>最佳 Epoch: {bestPoint.epoch}</strong>
              <span>Accuracy: <b>{bestPoint.accuracy !== null ? `${(bestPoint.accuracy * 100).toFixed(1)}%` : '—'}</b></span>
              <span>F1: {bestPoint.f1 !== null ? bestPoint.f1.toFixed(3) : '—'}</span>
              <span>Kappa: {bestPoint.kappa !== null ? bestPoint.kappa.toFixed(3) : '—'}</span>
            </div>
          ) : null}
        </div>

        <div className={`training-chart-scrollbar${canScrollChart ? ' is-enabled' : ''}`}>
          <button
            type="button"
            aria-label="向左浏览训练曲线"
            disabled={!canScrollChart || scrollRatio <= 0.001}
            onClick={() => scrollChartByPage(-1)}
          >‹</button>
          <span className="training-scroll-track">
            <span
              className="training-scroll-thumb"
              style={{ width: `${scrollThumbWidth}%`, left: `${scrollThumbLeft}%` }}
            />
            <input
              className="training-scroll-range"
              type="range"
              min="0"
              max="1000"
              step="1"
              value={Math.round(scrollRatio * 1000)}
              aria-label="横向浏览训练曲线"
              disabled={!canScrollChart}
              onChange={(event) => setChartScrollRatio(Number(event.target.value) / 1000)}
            />
          </span>
          <button
            type="button"
            aria-label="向右浏览训练曲线"
            disabled={!canScrollChart || scrollRatio >= 0.999}
            onClick={() => scrollChartByPage(1)}
          >›</button>
        </div>
      </div>

      <div className="training-actions">
        <button
          type="button"
          className="training-action-btn training-action-btn--primary"
          disabled={!trainingActionsEnabled}
          onClick={exportTrainingCurve}
          title="导出当前真实训练曲线的逐 Epoch JSON 数据"
        >
          <span><DownloadIcon /></span>
          <span>导出训练曲线</span>
        </button>
        <button
          type="button"
          className="training-action-btn"
          disabled={!trainingActionsEnabled}
          onClick={() => setShowTrainingLog(true)}
          title="查看当前训练指标文件中的逐 Epoch 结构化记录"
        >
          <span><FileTextIcon /></span>
          <span>查看详细日志</span>
        </button>
      </div>

      {trainingActionMessage ? <div className="training-action-message" role="status">{trainingActionMessage}</div> : null}

      {showTrainingLog && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="training-log-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setShowTrainingLog(false);
              }}
            >
              <section
                className="training-log-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="training-log-title"
              >
                <header className="training-log-header">
                  <div>
                    <span className="training-log-kicker">REAL TRAINING METRICS</span>
                    <h3 id="training-log-title">DMSA-Net 详细训练日志</h3>
                    <p>这里展示的是当前 `/model/metrics` 返回的真实逐 Epoch 结构化指标，不是模拟日志。</p>
                  </div>
                  <button
                    type="button"
                    className="training-log-close"
                    aria-label="关闭详细训练日志并返回曲线"
                    title="关闭并返回曲线"
                    onClick={() => setShowTrainingLog(false)}
                  >
                    ×
                  </button>
                </header>

                <div className="training-log-summary">
                  <span><b>{trainingData.length}</b> 个 Epoch</span>
                  <span>数据状态：<b>{metrics?.available ? '已加载' : '不可用'}</b></span>
                  <span className="training-log-source" title={metrics?.message ?? ''}>{metrics?.message || 'Real training metrics loaded.'}</span>
                </div>

                <div className="training-log-table-wrap">
                  <table className="training-log-table">
                    <thead>
                      <tr>
                        <th>Epoch</th>
                        <th>训练损失</th>
                        <th>验证损失</th>
                        <th>Accuracy</th>
                        <th>F1</th>
                        <th>Kappa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingData.map((row) => (
                        <tr key={row.epoch}>
                          <td>{row.epoch}</td>
                          <td>{formatTrainingValue(row.trainLoss, 6)}</td>
                          <td>{formatTrainingValue(row.valLoss, 6)}</td>
                          <td>{row.accuracy == null ? '—' : `${(row.accuracy * 100).toFixed(3)}%`}</td>
                          <td>{formatTrainingValue(row.f1, 5)}</td>
                          <td>{formatTrainingValue(row.kappa, 5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <footer className="training-log-footer">
                  <span>提示：按 Esc、点击弹窗外区域，或点击“关闭并返回曲线”都可以退出日志。</span>
                  <div className="training-log-footer-actions">
                    <button type="button" className="training-log-return" onClick={() => setShowTrainingLog(false)}>
                      <span>关闭并返回曲线</span>
                    </button>
                    <button type="button" onClick={exportTrainingCurve}><DownloadIcon /><span>导出 JSON</span></button>
                  </div>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      <div className="training-footer-note">
        <span className="training-footer-note-icon"><InfoIcon /></span>
        <span>此模块读取正式训练产物；未部署训练记录时保持锁定，不使用模拟数据。</span>
      </div>

      <StateCover
        state={state}
        error={error}
        idleText="正式训练指标尚未生成或尚未部署，曲线区域保持锁定。"
        processingText="正在读取真实训练指标文件。"
      />
    </section>
  );
}


function UploadIllustration() {
  return (
    <div className="upload-illustration" aria-hidden="true">
      <div className="upload-hero">
        <span className="upload-hero-glow" />
        <span className="upload-hero-ring upload-hero-ring--one" />
        <span className="upload-hero-ring upload-hero-ring--two" />
        <span className="upload-hero-arc upload-hero-arc--left" />
        <span className="upload-hero-arc upload-hero-arc--right" />

        <div className="upload-scan-node upload-scan-node--left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 4H5a1 1 0 0 0-1 1v3" />
            <path d="M16 4h3a1 1 0 0 1 1 1v3" />
            <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
            <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
            <circle cx="12" cy="12" r="3.25" />
            <path d="M12 8.75v6.5M8.75 12h6.5" />
          </svg>
        </div>
        <span className="upload-scan-connector upload-scan-connector--left" />

        <div className="upload-mri-card">
          <div className="upload-mri-card-bar">
            <span className="upload-window-dots"><i /><i /><i /></span>
            <span className="upload-mri-tag">MRI</span>
          </div>

          <div className="upload-mri-viewport">
            <img
              className="upload-hero-mri"
              src="/assets/landing/ad-burden-mri-cutout.png"
              alt=""
              draggable="false"
            />
            <span className="upload-mri-vignette" />
            <span className="upload-mri-grid" />
            <span className="upload-mri-scanline" />
            <span className="upload-mri-corner upload-mri-corner--tl" />
            <span className="upload-mri-corner upload-mri-corner--tr" />
            <span className="upload-mri-corner upload-mri-corner--bl" />
            <span className="upload-mri-corner upload-mri-corner--br" />
          </div>
        </div>

        <span className="upload-scan-connector upload-scan-connector--right" />
        <div className="upload-scan-readout">
          <span className="upload-scan-readout-index">MRI / 01</span>
          <strong>影像预览</strong>
          <span className="upload-scan-readout-line">
            <i /><i /><i /><i /><i /><i />
          </span>
        </div>

        <div className="upload-hero-caption">
          <span className="upload-hero-caption-dot" />
          <span>NEUROEVO · MRI IMAGE</span>
          <i />
        </div>
      </div>
    </div>
  );
}

type RecentUpload = {
  name: string;
  details: string;
  time: string;
  previewUrl?: string;
};


function formatSize(bytes: number) {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  const mb = bytes / 1024 / 1024;
  return `${mb < 10 ? mb.toFixed(1) : mb.toFixed(0)} MB`;
}

function UploadPanel({
  analysisState,
  analysisResult,
  sourceImageUrl,
  trainingMetrics,
  onAnalyze,
}: {
  analysisState: AnalysisState;
  analysisResult: AnalyzeResponse | null;
  sourceImageUrl: string | null;
  trainingMetrics: ModelMetricsResponse | null;
  onAnalyze: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recent, setRecent] = useState<RecentUpload | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportAge, setReportAge] = useState('');
  const [reportSex, setReportSex] = useState('');
  const [reportExporting, setReportExporting] = useState(false);
  const [reportExportMessage, setReportExportMessage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recent?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(recent.previewUrl);
    };
  }, [recent?.previewUrl]);

  const openPicker = () => inputRef.current?.click();

  const applyFile = (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
      setUploadError('当前正式推理仅支持 JPG / JPEG / PNG；DICOM 仍在验证中。');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('文件超过 500 MB 上限，请选择更小的 JPG / PNG 图像。');
      return;
    }
    setUploadError(null);
    setReportExportMessage('');

    const previewUrl = URL.createObjectURL(file);

    setRecent((current) => {
      if (current?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl);
      return {
        name: file.name,
        details: `图像文件 · ${formatSize(file.size)}`,
        time: new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(new Date()),
        previewUrl,
      };
    });
    onAnalyze(file);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  };

  const exportPdfReport = async () => {
    if (!analysisResult || reportExporting) return;
    setReportExporting(true);
    setReportExportMessage('正在整理影像、可解释性图和分析结果…');
    try {
      await exportAnalysisPdf(analysisResult, sourceImageUrl, {
        name: reportName, age: reportAge, sex: reportSex,
      }, trainingMetrics);
      setReportExportMessage('PDF 已生成并开始下载。');
    } catch (error) {
      setReportExportMessage(error instanceof Error ? `PDF 生成失败：${error.message}` : 'PDF 生成失败，请重试。');
    } finally {
      setReportExporting(false);
    }
  };

  return (
    <article className="workspace-glass-card workspace-card-upload upload-panel" aria-label="上传 MRI 图像模块">
      <div
        className={`upload-drop-surface${isDragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <header className="upload-panel-heading">
          <div className="upload-title-line">
            <h2>上传 MRI 图像</h2>
            <span className="upload-info-icon" title="当前正式支持 JPG、JPEG、PNG；DICOM 预处理仍在验证中。单文件最大 500MB"><InfoIcon /></span>
          </div>
          <p>当前正式支持 JPG / PNG；DICOM 预处理仍在验证中</p>
        </header>

        <UploadIllustration />

        <input ref={inputRef} className="upload-file-input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={onInputChange} />
        <button className="upload-primary-btn" type="button" onClick={openPicker}>
          <span className="upload-primary-icon"><UploadIcon /></span>
          <span>选择文件</span>
        </button>

        <div className="upload-or-divider"><span>或</span></div>
        <button className="upload-drop-hint" type="button" onClick={openPicker}>将文件拖拽到此处上传</button>

        <div className="upload-format-row" aria-label="支持格式">
          <span className="upload-format-label">支持格式：</span>
          <span className="upload-format-pill">JPG</span>
          <span className="upload-format-pill">PNG</span>
          <span className="upload-format-pill upload-format-pill--pending" title="DICOM 尚未完成与冻结 JPG 训练协议的一致性验证">DICOM 验证中</span>
          <span className="upload-format-separator" aria-hidden="true" />
          <span className="upload-format-limit">最大 500MB</span>
        </div>
        {uploadError ? <p className="upload-validation-error" role="alert">{uploadError}</p> : null}

        <section className="recent-upload-card" aria-label="最近上传">
          <div className="recent-upload-head">
            <span>最近上传</span>
            <button type="button" className="recent-clear-btn" onClick={() => setRecent(null)} aria-label="清空最近上传">
              <TrashIcon />
              <span>清空</span>
            </button>
          </div>
          {recent ? (
            <div className="recent-upload-body">
              <div className="recent-thumb">
                {recent.previewUrl ? <img src={recent.previewUrl} alt="最近上传 MRI 预览" /> : <div className="recent-thumb-placeholder"><ImageGlyph /></div>}
              </div>
              <div className="recent-meta">
                <strong title={recent.name}>{recent.name}</strong>
                <span>{recent.details}</span>
                <span className="recent-time"><ClockIcon />{recent.time}</span>
              </div>
              <span className={`recent-status is-${analysisState}`}>
                {analysisState === 'processing' ? '分析中' : analysisState === 'completed' ? '已完成' : analysisState === 'failed' ? '失败' : '待分析'}
              </span>
            </div>
          ) : (
            <div className="recent-upload-empty">暂无上传记录</div>
          )}
        </section>

        <section className="report-export-card" aria-label="检测报告信息">
          <div className="report-export-head">
            <span className="report-export-icon"><FileTextIcon /></span>
            <div>
              <h3>检测报告</h3>
              <p>填写基本信息后，可导出本次 PDF 分析报告</p>
            </div>
          </div>

          <div className="report-form-grid">
            <label className="report-field report-field--wide">
              <span>姓名 / 病例编号</span>
              <input type="text" placeholder="请输入（可选）" value={reportName} onChange={(event) => setReportName(event.target.value)} />
            </label>
            <label className="report-field">
              <span>年龄</span>
              <input type="number" min="0" max="120" placeholder="--" value={reportAge} onChange={(event) => setReportAge(event.target.value)} />
            </label>
            <label className="report-field">
              <span>性别</span>
              <select value={reportSex} onChange={(event) => setReportSex(event.target.value)}>
                <option value="" disabled>请选择</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他 / 不填</option>
              </select>
            </label>
          </div>

          <button
            className="report-export-btn"
            type="button"
            disabled={analysisState !== 'completed' || !analysisResult || reportExporting}
            onClick={exportPdfReport}
          >
            <span className="report-export-btn-icon">{reportExporting ? <span className="report-export-spinner" /> : <DownloadIcon />}</span>
            <span>{reportExporting ? '正在生成 PDF…' : '导出 PDF 检测报告'}</span>
          </button>
          {reportExportMessage ? <p className="report-export-status" role="status">{reportExportMessage}</p> : null}
          <p className="report-export-note">报告包含 MRI 原图、四分类概率、Attention / Grad-CAM、联合解读与医学使用建议；基本信息不参与模型推理。</p>
        </section>

        <div className="upload-privacy-note">
          <span className="upload-privacy-icon"><ShieldIcon /></span>
          <span>所有上传数据仅用于分析，不会被保存或用于模型训练。</span>
        </div>

      </div>
    </article>
  );
}

function ExplainImagePanel({
  title,
  type,
  imageUrl,
}: {
  title: string;
  type: 'original' | 'attention' | 'gradcam';
  imageUrl: string | null;
}) {
  return (
    <div className="explain-image-panel">
      <div className="explain-image-title-row">
        <h3>{title}</h3>
        {type !== 'original' ? <span className="explain-inline-info"><InfoIcon /></span> : null}
      </div>
      <div className={`explain-image-frame explain-image-frame--${type}`}>
        {imageUrl ? (
          <img className="explain-real-image" src={imageUrl} alt={title} draggable="false" />
        ) : (
          <div className="explain-image-empty"><span>等待真实图像</span></div>
        )}
      </div>
    </div>
  );
}

function ExplainColorBar({ topLabel, bottomLabel }: { topLabel: string; bottomLabel: string }) {
  return (
    <div className="explain-colorbar" aria-hidden="true">
      <span className="explain-colorbar-label explain-colorbar-label--top">{topLabel}</span>
      <div className="explain-colorbar-strip" />
      <span className="explain-colorbar-label explain-colorbar-label--bottom">{bottomLabel}</span>
    </div>
  );
}

function ExplainabilityPanel({
  state,
  result,
  sourceImageUrl,
  error,
}: {
  state: AnalysisState;
  result: AnalyzeResponse | null;
  sourceImageUrl: string | null;
  error: string | null;
}) {
  const attentionUrl = result?.explainability.attention_map_url ?? null;
  const gradcamUrl = result?.explainability.gradcam_url ?? null;
  const explainReady = Boolean(attentionUrl && gradcamUrl);
  const explainState: AnalysisState = state === 'completed' && !explainReady ? 'idle' : state;

  return (
    <article className="workspace-glass-card workspace-card-explain explain-panel workspace-state-card" aria-label="模型可解释性模块">
      <div className="explain-shell">
        <header className="explain-header">
          <div className="explain-title-row">
            <h2>模型可解释性（Grad-CAM）</h2>
            <span className="explain-title-info"><InfoIcon /></span>
          </div>
        </header>

        <div className="explain-tip-banner">
          <span className="explain-tip-icon"><SparkleIcon /></span>
          <span>
            {result
              ? '空间注意力图与 Grad-CAM 均由本次 MRI 影像和当前加载的 DMSA-Net 生成；高亮区域表示模型响应较强的位置，并不等同于对具体解剖脑区的自动定位。'
              : '上传 MRI 后，这里将展示模型真实的空间注意力图与 Grad-CAM 结果。'}
          </span>
        </div>

        <section className="explain-visual-grid" aria-label="MRI 与热力图对比">
          <ExplainImagePanel title="1. 原始 MRI" type="original" imageUrl={sourceImageUrl} />
          <ExplainImagePanel title="2. Spatial Attention Map" type="attention" imageUrl={attentionUrl} />
          <ExplainColorBar topLabel="高关注" bottomLabel="低关注" />
          <ExplainImagePanel
            title={`3. Grad-CAM${result ? `（${result.prediction.label}）` : ''}`}
            type="gradcam"
            imageUrl={gradcamUrl}
          />
          <ExplainColorBar topLabel="高贡献" bottomLabel="低贡献" />
        </section>

        <section className="explain-summary-grid">
          <div className="explain-summary-card explain-summary-card--prediction">
            <div className="explain-summary-head">
              <span className="explain-summary-icon"><TargetIcon /></span>
              <strong>预测类别</strong>
            </div>
            <div className="explain-prediction-main">
              <span className="explain-prediction-label">{result?.prediction.label ?? '—'}</span>
              {result ? <span className="explain-prediction-tag">真实结果</span> : null}
            </div>
            <div className="explain-prediction-confidence">
              置信度：<b>{result ? `${(result.prediction.confidence * 100).toFixed(1)}%` : '—'}</b>
            </div>
          </div>

          <div className="explain-summary-card explain-summary-card--insight">
            <div className="explain-summary-head">
              <span className="explain-summary-icon"><SparkleIcon /></span>
              <strong>联合解读</strong>
            </div>
            <p>
              {explainReady
                ? '高响应区域表示模型在本次分类过程中关注或贡献较高的像素区域；不自动推断具体脑区。'
                : '可解释性图像尚未接入时不生成模拟热力图，也不输出未经定位验证的脑区结论。'}
            </p>
          </div>

          <div className="explain-summary-card explain-summary-card--export">
            <div className="explain-summary-head">
              <span className="explain-summary-icon"><DownloadIcon /></span>
              <strong>导出结果</strong>
            </div>
            <div className="explain-export-actions">
              <button
                type="button"
                className="explain-export-btn"
                disabled={!attentionUrl}
                onClick={() => downloadDataUrl(attentionUrl, `spatial-attention-${result?.analysis_id ?? 'analysis'}.png`)}
              >
                <span className="explain-export-btn-icon"><DownloadIcon /></span>
                <span>Attention Map</span>
              </button>
              <button
                type="button"
                className="explain-export-btn"
                disabled={!gradcamUrl}
                onClick={() => downloadDataUrl(gradcamUrl, `gradcam-${result?.analysis_id ?? 'analysis'}.png`)}
              >
                <span className="explain-export-btn-icon"><DownloadIcon /></span>
                <span>Grad-CAM</span>
              </button>
            </div>
          </div>
        </section>

        <div className="explain-footer-note">
          <span className="explain-footer-icon"><InfoIcon /></span>
          <span>Spatial Attention 反映模型主动关注区域；Grad-CAM 反映对当前预测类别的贡献区域。</span>
        </div>
      </div>
      <StateCover
        state={explainState}
        error={error}
        idleText={result ? '当前阶段尚未生成真实 Spatial Attention / Grad-CAM；接入后才会解除遮罩。' : '上传 MRI 后才会生成当前图像对应的真实可解释性结果。'}
        processingText="正在执行 DMSA-Net 推理、注意力分析与 Grad-CAM 解释，请稍候。"
      />
    </article>
  );
}

export function WorkspacePage() {
  const session = useSession();
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const analysisRequestRef = useRef(0);

  const [trainingState, setTrainingState] = useState<AnalysisState>('idle');
  const [trainingMetrics, setTrainingMetrics] = useState<ModelMetricsResponse | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  useEffect(() => initNeuralBackground(), []);

  useEffect(() => {
    let cancelled = false;

    if (analysisState !== 'completed' || !analysisResult) {
      setTrainingState('idle');
      setTrainingMetrics(null);
      setTrainingError(null);
      return () => { cancelled = true; };
    }

    setTrainingState('processing');
    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/v1/inference/model/metrics');
        const payload = await response.json() as ModelMetricsResponse | { detail?: string };
        if (!response.ok) {
          throw new Error('detail' in payload && payload.detail ? payload.detail : '无法读取模型性能指标。');
        }
        if (cancelled) return;
        const metrics = payload as ModelMetricsResponse;
        setTrainingMetrics(metrics);
        setTrainingError(null);
        setTrainingState(metrics.available ? 'completed' : 'idle');
      } catch (error) {
        if (cancelled) return;
        setTrainingMetrics(null);
        setTrainingError(error instanceof Error ? error.message : '无法读取模型性能指标。');
        setTrainingState('failed');
      }
    };
    loadMetrics();
    return () => { cancelled = true; };
  }, [analysisState, analysisResult?.analysis_id]);

  useEffect(() => {
    return () => {
      if (sourceImageUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceImageUrl);
    };
  }, [sourceImageUrl]);

  const analyzeFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
      setAnalysisResult(null);
      setAnalysisError('当前正式推理仅支持 JPG / JPEG / PNG；DICOM 仍在验证中。');
      setAnalysisState('failed');
      return;
    }
    const requestId = ++analysisRequestRef.current;
    const presentationStartedAt = performance.now();
    setAnalysisState('processing');
    setAnalysisResult(null);
    setAnalysisError(null);

    const previewable = file.type.startsWith('image/');
    setSourceImageUrl(previewable ? URL.createObjectURL(file) : null);

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const response = await fetch('/api/v1/inference/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const payload = await response.json() as AnalyzeResponse | { detail?: string };
      if (!response.ok) {
        throw new Error('detail' in payload && payload.detail ? payload.detail : `分析失败（HTTP ${response.status}）`);
      }
      window.clearTimeout(timeoutId);

      // The backend result stays untouched. We only hold the visual reveal so the user can
      // perceive the analysis process instead of seeing a sub-second UI jump.
      const elapsedPresentationMs = performance.now() - presentationStartedAt;
      const remainingPresentationMs = Math.max(0, MIN_ANALYSIS_PRESENTATION_MS - elapsedPresentationMs);
      if (remainingPresentationMs > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingPresentationMs));
      }

      if (requestId !== analysisRequestRef.current) return;
      setAnalysisResult(payload as AnalyzeResponse);
      setAnalysisState('completed');
    } catch (error) {
      if (requestId !== analysisRequestRef.current) return;
      setAnalysisResult(null);
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'MRI 分析超过 180 秒，请检查模型服务或服务器负载。'
        : error instanceof Error ? error.message : 'MRI 分析失败，请检查后端模型服务。';
      setAnalysisError(message);
      setAnalysisState('failed');
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  return (
    <main id="scene" className="workspace-scene" aria-label="NeuroEvo-AD 工作台">
      <canvas id="neural-background" aria-hidden="true" />

      <header className="brand-bar workspace-brand-bar">
        <NavLink className="brand-brand workspace-brand-link" to="/" aria-label="NeuroEvo-AD 首页">
          <span className="brand-logo-wrap">
            <img className="brand-logo" src="/assets/brand/logo.webp" alt="NeuroEvo-AD Logo" />
            <span className="brand-logo-ring" aria-hidden="true" />
          </span>
          <span className="brand-text">
            <span className="brand-title">NeuroEvo-AD</span>
            <span className="brand-subtitle">脑影智析平台</span>
          </span>
        </NavLink>

        <nav className="brand-nav" aria-label="主导航">
          <NavLink to="/" className={({ isActive }) => `brand-nav-item${isActive ? ' is-active' : ''}`}>
            首页<span className="brand-nav-underline" />
          </NavLink>
          <NavLink to="/workspace" className={({ isActive }) => `brand-nav-item${isActive ? ' is-active' : ''}`}>
            工作台<span className="brand-nav-underline" />
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `brand-nav-item${isActive ? ' is-active' : ''}`}>
            研究中心<span className="brand-nav-underline" />
          </NavLink>
        </nav>

        <div className="brand-actions">
          <button className="brand-icon-btn" type="button" aria-label="搜索" onClick={session.openSearch}><SearchIcon /></button>
          <button className="brand-icon-btn has-dot" type="button" aria-label="通知" onClick={session.openNotifications}>
            <BellIcon />
            <span className={`brand-notif-dot${session.unreadNotifications ? '' : ' is-read'}`} aria-hidden="true" />
          </button>
          <div className="brand-divider" aria-hidden="true" />
          <button className="brand-user-btn" type="button" aria-label="用户菜单" onClick={session.openAccount}>
            <span className="brand-user-avatar"><UserIcon /></span>
            <span className="brand-user-info">
              <span className="brand-user-name">{session.user?.name ?? '访客'}</span>
              <span className="brand-user-role">{session.user?.role ?? '游客浏览'}</span>
            </span>
            <CaretIcon />
          </button>
        </div>
      </header>

      <section className="workspace-layout" aria-label="工作台模块布局">
        <UploadPanel
          analysisState={analysisState}
          analysisResult={analysisResult}
          sourceImageUrl={sourceImageUrl}
          trainingMetrics={trainingMetrics}
          onAnalyze={analyzeFile}
        />
        <ResultPanel state={analysisState} result={analysisResult} error={analysisError} />
        <article className="workspace-glass-card workspace-card-training workspace-state-card" aria-label="DMSA-Net 模型性能模块">
          <TrainingChart state={trainingState} metrics={trainingMetrics} error={trainingError} />
        </article>
        <ExplainabilityPanel
          state={analysisState}
          result={analysisResult}
          sourceImageUrl={sourceImageUrl}
          error={analysisError}
        />
      </section>
    </main>
  );
}
