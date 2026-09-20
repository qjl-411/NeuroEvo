import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session';
import { BrandBar } from '../components/BrandBar';
import { initNeuralBackground } from '../landing/neuralBackground.js';
import '../landing/landing-scene.css';
import './workspace.css';

/* ────────────────────────────────────────────────
   研究中心瀑布流：直接读取本地 SQLite 文献 API
   ──────────────────────────────────────────────── */
type PaperIcon = 'article' | 'preprint' | 'book' | 'grad' | 'data' | 'paper';

type ApiPaper = {
  id: number;
  title: string;
  publication_year?: number | null;
  work_type?: string | null;
  authors?: string | null;
  journal?: string | null;
  pdf_url?: string | null;
  landing_page_url?: string | null;
  has_local_pdf?: boolean;
};

type ApiPaperPage = {
  items: ApiPaper[];
  total: number;
};

interface Paper {
  id: number;
  type: string;
  title: string;
  year: string;
  author: string;
  venue: string;
  pdf: boolean;
  hasLocalPdf: boolean;
  pdfHref: string | null;
  landingHref: string | null;
  icon: PaperIcon;
}

function paperIcon(workType?: string | null): PaperIcon {
  const value = (workType ?? '').toLowerCase();
  if (value.includes('preprint')) return 'preprint';
  if (value.includes('book')) return 'book';
  if (value.includes('thesis') || value.includes('dissertation')) return 'grad';
  if (value.includes('dataset') || value.includes('data')) return 'data';
  if (value.includes('article') || value.includes('review')) return 'article';
  return 'paper';
}

function conciseAuthors(value?: string | null): string {
  const authors = (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (authors.length === 0) return '作者信息未收录';
  if (authors.length <= 3) return authors.join(', ');
  return `${authors.slice(0, 3).join(', ')} et al.`;
}

function mapApiPaper(paper: ApiPaper): Paper {
  const hasLocalPdf = Boolean(paper.has_local_pdf);
  return {
    id: paper.id,
    type: (paper.work_type || 'research work').replaceAll('_', ' ').toUpperCase(),
    title: paper.title,
    year: paper.publication_year ? String(paper.publication_year) : '—',
    author: conciseAuthors(paper.authors),
    venue: paper.journal?.trim() || 'OpenAlex indexed source',
    pdf: hasLocalPdf || Boolean(paper.pdf_url),
    hasLocalPdf,
    pdfHref: hasLocalPdf ? `/api/v1/literature/papers/${paper.id}/pdf` : paper.pdf_url ?? null,
    landingHref: paper.landing_page_url ?? null,
    icon: paperIcon(paper.work_type),
  };
}

/* ────────────────────────────────────────────────
   SVG 内联图标（替代 lucide-react，配色匹配 NeuroEvo）
   ──────────────────────────────────────────────── */
function IconArticle({ size = 22, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}
function IconFileSearch({ size = 22, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="11.5" cy="14.5" r="2.5" />
      <path d="m13.5 16.5 1.8 1.8" />
    </svg>
  );
}
function IconBookOpen({ size = 22, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function IconGraduation({ size = 22, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  );
}
function IconDatabase({ size = 22, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconPause({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

const ICON_MAP: Record<PaperIcon, (p: { size?: number; strokeWidth?: number }) => React.ReactElement> = {
  article: IconArticle,
  preprint: IconFileSearch,
  book: IconBookOpen,
  grad: IconGraduation,
  data: IconDatabase,
  paper: IconArticle,
};

/* ────────────────────────────────────────────────
   传送带动画参数
   ──────────────────────────────────────────────── */
const GAP = 104;
const SPEED = 18;
const VISIBLE_COUNT = 8;

interface PaperItem {
  key: number;
  paper: Paper;
  y: number;
}

function PaperCard({ paper, y }: { paper: Paper; y: number }) {
  const IconComp = ICON_MAP[paper.icon] ?? IconArticle;
  return (
    <article
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        minHeight: 100,
        borderBottom: '1px solid rgba(130, 170, 230, 0.10)',
        paddingLeft: 36,
        paddingRight: 0,
        paddingTop: 14,
        paddingBottom: 10,
        transform: `translate3d(0, ${y}px, 0)`,
        willChange: 'transform',
      }}
    >
      {/* 左侧图标（NeuroEvo 蓝紫色光晕 — 紧凑版） */}
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 14,
          width: 26,
          height: 26,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 8,
          color: '#6ea0ff',
          background: 'linear-gradient(145deg, rgba(82,154,255,0.14), rgba(45,90,170,0.05))',
          border: '1px solid rgba(98,160,255,0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
      >
        <IconComp size={15} strokeWidth={1.8} />
      </span>

      {/* 类型标签 */}
      <div
        style={{
          marginBottom: 6,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.13em',
          color: '#8d81ff',
          textTransform: 'uppercase',
        }}
      >
        {paper.type}
      </div>

      {/* 标题链接（NeuroEvo 青色高亮 — 紧凑版） */}
      <a
        href={paper.landingHref ?? `/reports/search?q=${encodeURIComponent(paper.title)}`}
        target={paper.landingHref ? '_blank' : undefined}
        rel={paper.landingHref ? 'noreferrer' : undefined}
        style={{
          display: 'block',
          width: 'calc(100% - 48px)',
          marginBottom: 6,
          fontSize: 'clamp(12px, 0.85vw, 15px)',
          fontWeight: 600,
          lineHeight: 1.28,
          color: '#2ad0d1',
          textDecoration: 'none',
          transition: 'opacity .18s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.72')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {paper.title}
      </a>

      {/* 作者 / 年份 / 期刊 */}
      <div style={{ fontSize: 10.5, lineHeight: 1.4, color: '#9fb3cf' }}>
        <span style={{ color: '#8ea3c1' }}>{paper.year}</span>
        {' by '}
        <span style={{ fontWeight: 600, color: '#3ed1cf' }}>♙ {paper.author}</span>
        {' in '}
        <span style={{ fontWeight: 600, color: '#6ea0ff' }}>▣ {paper.venue}</span>
      </div>

      {/* PDF 标签（NeuroEvo 毛玻璃胶囊 — 紧凑版） */}
      {paper.pdf && paper.pdfHref && (
        <a
          href={paper.pdfHref}
          target="_blank"
          rel="noreferrer"
          title={paper.hasLocalPdf ? '打开本地 PDF' : '打开外部开放获取 PDF'}
          style={{
            position: 'absolute',
            right: 0,
            top: 26,
            padding: '3px 8px',
            borderRadius: 7,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: paper.hasLocalPdf ? '#bfffee' : '#d7e9ff',
            border: paper.hasLocalPdf
              ? '1px solid rgba(65,226,185,0.38)'
              : '1px solid rgba(110,160,255,0.30)',
            background: paper.hasLocalPdf
              ? 'linear-gradient(145deg, rgba(24,126,111,0.42), rgba(12,58,65,0.30))'
              : 'radial-gradient(circle at 50% 0%, rgba(110,160,255,0.16), transparent 60%), linear-gradient(145deg, rgba(38,84,164,0.38), rgba(18,42,86,0.28))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            textDecoration: 'none',
          }}
        >
          {paper.hasLocalPdf ? 'LOCAL PDF' : 'PDF'}
        </a>
      )}
    </article>
  );
}

function ResearchConveyor() {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const nextPaperRef = useRef<number>(VISIBLE_COUNT);
  const pausedRef = useRef(false);
  const papersRef = useRef<Paper[]>([]);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [items, setItems] = useState<PaperItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/v1/literature/papers?q=MRI&topic=deep_learning&sort=citations&page=1&page_size=60', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`文献接口返回 ${response.status}`);
        return response.json() as Promise<ApiPaperPage>;
      })
      .then((payload) => {
        const mapped = payload.items
          .filter((paper) => !paper.title.toUpperCase().startsWith('RETRACTED'))
          .map(mapApiPaper);
        setPapers(mapped);
        setLoadError(mapped.length ? '' : '本地数据库暂时没有可展示的文献。');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError('无法读取本地文献数据库，请确认 NeuroEvo API 已启动。');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    papersRef.current = papers;
    nextPaperRef.current = VISIBLE_COUNT;
    if (!papers.length) {
      setItems([]);
      return;
    }
    setItems(
      Array.from({ length: Math.min(VISIBLE_COUNT, papers.length) }, (_, index) => ({
        key: index,
        paper: papers[index % papers.length],
        y: (index - 1.25) * GAP,
      })),
    );
  }, [papers]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04);
      lastTimeRef.current = now;
      const source = papersRef.current;

      if (!pausedRef.current && feedRef.current && source.length) {
        const feedHeight = feedRef.current.clientHeight;
        setItems((current) => {
          if (!current.length) return current;
          let minY = Math.min(...current.map((item) => item.y));
          return current.map((item) => {
            let nextY = item.y + SPEED * dt;
            let nextPaper = item.paper;
            if (nextY > feedHeight + 40) {
              nextY = minY - GAP;
              minY = nextY;
              nextPaper = source[nextPaperRef.current % source.length];
              nextPaperRef.current += 1;
            }
            return { ...item, y: nextY, paper: nextPaper };
          });
        });
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingLeft: 2,
        paddingRight: 10,
        height: '100%',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="本地数据库推荐文献滚动区域"
    >
      <div
        ref={feedRef}
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          minHeight: 0,
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)',
        }}
      >
        {(loading || loadError) && (
          <div style={{ padding: '36px 18px', color: '#8298b7', fontSize: 13, lineHeight: 1.7 }}>
            {loading ? '正在从本地文献数据库载入 Papers…' : loadError}
          </div>
        )}
        {!loading && !loadError && items.map((item) => (
          <PaperCard key={item.key} paper={item.paper} y={item.y} />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   通用卡片：NeuroEvo 毛玻璃样式（::before/::after 光晕用伪元素模拟）
   ──────────────────────────────────────────────── */
function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: 'clamp(16px, 1vw, 22px)',
        border: '1px solid rgba(145, 181, 238, 0.14)',
        background:
          'linear-gradient(145deg, rgba(15, 27, 49, 0.50), rgba(7, 15, 30, 0.36))',
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.055), inset 0 -1px 0 rgba(89, 130, 197, 0.035), 0 18px 46px rgba(0, 0, 0, 0.18), 0 0 28px rgba(68, 118, 207, 0.025)',
        backdropFilter: 'blur(19px) saturate(125%)',
        WebkitBackdropFilter: 'blur(19px) saturate(125%)',
        ...style,
      }}
    >
      {/* 光晕层 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 8% 5%, rgba(117, 182, 255, 0.05), transparent 28%), linear-gradient(135deg, rgba(255, 255, 255, 0.025), transparent 38%)',
        }}
      />
      {/* 内阴影层 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 36px rgba(47, 90, 163, 0.022)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   ReportsPage 主组件
   ──────────────────────────────────────────────── */
export function ReportsPage() {
  useEffect(() => initNeuralBackground(), []);

  const navigate = useNavigate();
  const session = useSession();
  const [query, setQuery] = useState('');
  const handleSearch = () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    if (!session.isAuthenticated) {
      session.openAuth('login', '登录后即可使用研究中心的文献检索功能。');
      return;
    }
    navigate(`/reports/search?q=${encodeURIComponent(normalizedQuery)}`);
  };

  return (
    <main id="scene" className="workspace-scene" aria-label="NeuroEvo-AD 研究中心"
      style={{ '--workspace-top': '118px', '--workspace-bottom': '44px' } as React.CSSProperties}
    >
      <canvas id="neural-background" aria-hidden="true" />
      <BrandBar />

      <div
        style={{
          position: 'absolute',
          zIndex: 5,
          top: 'var(--workspace-top)',
          right: 'var(--workspace-edge-x)',
          bottom: 'var(--workspace-bottom)',
          left: 'var(--workspace-edge-x)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)',
          gap: 'var(--workspace-gap)',
          pointerEvents: 'none',
        }}
      >
          {/* ─── 左栏：标题 + 搜索（无边框透明容器，留白透气） ─── */}
          <div
            style={{
              pointerEvents: 'auto',
              height: '100%',
              minHeight: 0,
              padding: 'clamp(28px, 2.4vw, 42px) clamp(22px, 2vw, 38px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
            }}
          >
              {/* 小标签 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                  marginBottom: 18,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(140,128,255,0.28)',
                  background:
                    'linear-gradient(145deg, rgba(112,102,226,0.12), rgba(57,58,126,0.06))',
                  color: '#b5abff',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: '#8d81ff',
                    boxShadow: '0 0 10px rgba(141,129,255,0.8)',
                  }}
                />
                NeuroEvo Research
              </div>

              {/* 标题 */}
              <h2
                style={{
                  margin: 0,
                  color: '#eff6ff',
                  fontSize: 'clamp(38px, 3.4vw, 62px)',
                  fontWeight: 800,
                  lineHeight: 0.98,
                  letterSpacing: '-0.045em',
                }}
              >
                Trace the evidence
                <br />
                <span
                  style={{
                    background:
                      'linear-gradient(100deg, #6ea0ff 0%, #8d81ff 45%, #2ad0d1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  behind Alzheimer&rsquo;s change
                </span>
              </h2>

              {/* 描述 */}
              <p
                style={{
                  margin: '20px 0 28px',
                  maxWidth: 560,
                  color: '#9fb3cf',
                  fontSize: 'clamp(14px, 1vw, 18px)',
                  lineHeight: 1.65,
                }}
              >
                Explore MRI, AI, biomarkers, and disease progression in a focused literature
                space built for Alzheimer&rsquo;s neuroimaging discovery.
              </p>

              {/* 搜索框（NeuroEvo 毛玻璃风格） */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 560,
                  borderRadius: 14,
                  border: '1px solid rgba(130,170,230,0.20)',
                  background:
                    'radial-gradient(circle at 0% 0%, rgba(82,154,255,0.08), transparent 40%), linear-gradient(160deg, rgba(8,19,36,0.60), rgba(4,12,24,0.50))',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 28px rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(14px)',
                  padding: '14px 14px 12px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gridTemplateRows: '1fr auto',
                  columnGap: 14,
                  rowGap: 8,
                }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search AD imaging papers, biomarkers, and methods"
                  style={{
                    gridColumn: '1 / -1',
                    width: '100%',
                    border: 0,
                    padding: 0,
                    background: 'transparent',
                    outline: 'none',
                    color: '#edf5ff',
                    fontSize: 'clamp(15px, 1.1vw, 19px)',
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                />
                <style>{`
                  .reports-search-input::placeholder { color: #5f7795; }
                `}</style>

                <button
                  type="button"
                  className="reports-search-input"
                  style={{
                    gridColumn: '1 / 2',
                    justifySelf: 'start',
                    alignSelf: 'end',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(130,170,230,0.14)',
                    background: 'rgba(13,27,48,0.45)',
                    color: '#869bb7',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'color .15s ease, border-color .15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c6d9f3';
                    e.currentTarget.style.borderColor = 'rgba(130,170,230,0.30)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#869bb7';
                    e.currentTarget.style.borderColor = 'rgba(130,170,230,0.14)';
                  }}
                >
                  works
                  <IconChevronDown size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleSearch}
                  style={{
                    gridColumn: '2 / 3',
                    justifySelf: 'end',
                    alignSelf: 'end',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '10px 22px',
                    borderRadius: 11,
                    border: '1px solid rgba(70,220,220,0.35)',
                    color: '#eaffff',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    background:
                      'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.14), transparent 60%), linear-gradient(180deg, rgba(28,198,199,0.96), rgba(6,152,170,0.96))',
                    boxShadow:
                      '0 8px 22px rgba(0,166,181,0.22), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,72,89,0.22)',
                    transition: 'transform .18s ease, filter .18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.filter = 'brightness(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                >
                  Search
                </button>
              </div>

          </div>

          {/* ─── 右栏：文献传送带（无边框透明容器，留白透气） ─── */}
          <div
            style={{
              pointerEvents: 'auto',
              height: '100%',
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '22px 18px 18px 22px',
            }}
          >
            {/* 文献瀑布流标题：保持克制，只保留 Papers */}
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px 12px 4px',
                borderBottom: '1px solid rgba(130,170,230,0.10)',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  color: '#eff6ff',
                  fontSize: 'clamp(14px, 0.95vw, 17px)',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                }}
              >
                Papers
              </div>
            </div>

            {/* 传送带本体 */}
            <div
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden',
                paddingRight: 6,
              }}
            >
              <ResearchConveyor />
            </div>
          </div>

      </div>
    </main>
  );
}

