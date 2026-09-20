import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './literature-search.css';

type PaperTopic = {
  slug?: string;
  name_zh?: string;
  name?: string;
  display_name?: string;
  score?: number;
};

type InstitutionLike =
  | string
  | {
      display_name?: string;
      name?: string;
      institution?: { display_name?: string; name?: string };
    };

type Paper = {
  id: number | string;
  title: string;
  abstract?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  work_type?: string | null;
  authors?: string | string[] | null;
  journal?: string | null;
  cited_by_count?: number | null;
  referenced_works_count?: number | null;
  fwci?: number | null;
  is_oa?: boolean | null;
  oa_status?: string | null;
  pdf_url?: string | null;
  landing_page_url?: string | null;
  doi?: string | null;
  openalex_id?: string | null;
  language?: string | null;
  institutions?: InstitutionLike[] | string | null;
  institution_names?: string[] | string | null;
  institutions_json?: string | InstitutionLike[] | null;
  primary_custom_topic?: string | null;
  primary_topic?: PaperTopic | string | null;
  subfield?: PaperTopic | string | null;
  field?: PaperTopic | string | null;
  domain?: PaperTopic | string | null;
  topics?: PaperTopic[] | string[] | null;
  paper_topics?: PaperTopic[] | string[] | null;
  openalex_topics_json?: string | PaperTopic[] | null;
  local_pdf_path?: string | null;
  has_local_pdf?: boolean;
};

type TopicStat = {
  slug: string;
  name_zh: string;
  count: number;
};

type YearStat = {
  year: number;
  count: number;
};

type PaperListPayload = {
  items: Paper[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

const PAGE_SIZE = 10;
const API_BASE = '/api/v1/literature';

function paperPdfHref(paper: Paper): string | null {
  if (paper.has_local_pdf) return `${API_BASE}/papers/${paper.id}/pdf`;
  return paper.pdf_url ?? null;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16.2 16.2 4.05 4.05" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 9.5 5 5 5-5" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m10 7-5 5 5 5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function normalizePaperList(payload: unknown): PaperListPayload {
  if (Array.isArray(payload)) {
    return {
      items: payload as Paper[],
      total: payload.length,
      page: 1,
      page_size: PAGE_SIZE,
      pages: Math.max(1, Math.ceil(payload.length / PAGE_SIZE)),
    };
  }

  const obj = (payload ?? {}) as Record<string, unknown>;
  const rawItems =
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.papers) && obj.papers) ||
    (Array.isArray(obj.results) && obj.results) ||
    [];

  const total = Number(obj.total ?? obj.count ?? rawItems.length) || 0;
  const page = Number(obj.page ?? 1) || 1;
  const pageSize = Number(obj.page_size ?? obj.pageSize ?? PAGE_SIZE) || PAGE_SIZE;
  const pages =
    Number(obj.pages ?? obj.total_pages ?? obj.totalPages) ||
    Math.max(1, Math.ceil(total / pageSize));

  return {
    items: rawItems as Paper[],
    total,
    page,
    page_size: pageSize,
    pages,
  };
}

function normalizePaperDetail(payload: unknown): Paper {
  const obj = (payload ?? {}) as Record<string, unknown>;
  const nested =
    (obj.paper && typeof obj.paper === 'object' && obj.paper) ||
    (obj.item && typeof obj.item === 'object' && obj.item) ||
    (obj.result && typeof obj.result === 'object' && obj.result);

  return (nested ?? obj) as unknown as Paper;
}

function normalizeYears(payload: unknown): YearStat[] {
  const source = Array.isArray(payload)
    ? payload
    : (((payload ?? {}) as Record<string, unknown>).years as unknown[]) ?? [];

  return source
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        year: Number(obj.year ?? obj.publication_year),
        count: Number(obj.count ?? obj.total ?? 0),
      };
    })
    .filter((item) => Number.isFinite(item.year) && item.year > 1900)
    .sort((a, b) => a.year - b.year);
}

function normalizeTopics(payload: unknown): TopicStat[] {
  const source = Array.isArray(payload)
    ? payload
    : (((payload ?? {}) as Record<string, unknown>).topics as unknown[]) ?? [];

  return source
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        slug: String(obj.slug ?? obj.topic_slug ?? obj.id ?? ''),
        name_zh: String(obj.name_zh ?? obj.name ?? obj.label ?? obj.slug ?? ''),
        count: Number(obj.count ?? obj.total ?? 0),
      };
    })
    .filter((item) => item.slug && item.name_zh)
    .sort((a, b) => b.count - a.count);
}

function normalizeAuthors(authors: Paper['authors']) {
  if (Array.isArray(authors)) {
    return authors.filter(Boolean).join(', ');
  }
  return authors || '作者信息暂缺';
}

function parseMaybeJson<T>(value: string | T | null | undefined): T | null {
  if (!value) return null;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizePaperTopics(paper: Paper): string[] {
  const source = paper.paper_topics ?? paper.topics ?? [];
  const normalized = (source as Array<PaperTopic | string>)
    .map((topic) => {
      if (typeof topic === 'string') return topic;
      return topic.name_zh ?? topic.name ?? topic.display_name ?? topic.slug ?? '';
    })
    .filter(Boolean);

  const openAlexTopics = parseMaybeJson<PaperTopic[]>(paper.openalex_topics_json) ?? [];
  openAlexTopics.forEach((topic) => {
    const label = topic.display_name ?? topic.name ?? topic.name_zh ?? topic.slug ?? '';
    if (label) normalized.push(label);
  });

  if (paper.primary_custom_topic && !normalized.includes(paper.primary_custom_topic)) {
    normalized.unshift(paper.primary_custom_topic);
  }

  return Array.from(new Set(normalized)).slice(0, 8);
}

function topicLabel(topic: Paper['primary_topic'] | Paper['subfield'] | Paper['field'] | Paper['domain']) {
  if (!topic) return '';
  if (typeof topic === 'string') return topic;
  return topic.display_name ?? topic.name ?? topic.name_zh ?? topic.slug ?? '';
}

function normalizeInstitutions(paper: Paper) {
  const values: InstitutionLike[] = [];

  if (Array.isArray(paper.institutions)) {
    values.push(...paper.institutions);
  } else if (typeof paper.institutions === 'string') {
    const parsed = parseMaybeJson<InstitutionLike[]>(paper.institutions);
    if (Array.isArray(parsed)) values.push(...parsed);
    else if (paper.institutions.trim()) values.push(paper.institutions);
  }

  if (Array.isArray(paper.institution_names)) {
    values.push(...paper.institution_names);
  } else if (typeof paper.institution_names === 'string' && paper.institution_names.trim()) {
    const parsed = parseMaybeJson<string[]>(paper.institution_names);
    if (Array.isArray(parsed)) values.push(...parsed);
    else values.push(paper.institution_names);
  }

  const fromJson = parseMaybeJson<InstitutionLike[]>(paper.institutions_json);
  if (Array.isArray(fromJson)) values.push(...fromJson);

  const names = values
    .map((item) => {
      if (typeof item === 'string') return item;
      return (
        item.display_name ??
        item.name ??
        item.institution?.display_name ??
        item.institution?.name ??
        ''
      );
    })
    .filter(Boolean);

  return Array.from(new Set(names));
}

function normalizeDoiUrl(doi?: string | null) {
  if (!doi) return null;
  if (/^https?:\/\//i.test(doi)) return doi;
  return `https://doi.org/${doi.replace(/^doi:\s*/i, '')}`;
}

function displayOpenAlexId(value?: string | null) {
  if (!value) return '—';
  const match = value.match(/W\d+$/i);
  return match?.[0] ?? value;
}

function displayLanguage(value?: string | null) {
  if (!value) return '—';

  const languages: Record<string, string> = {
    en: 'English',
    zh: '中文',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    ja: '日本語',
    ko: '한국어',
    it: 'Italiano',
    pt: 'Português',
  };

  return languages[value.toLowerCase()] ?? value;
}

function displayWorkType(value?: string | null) {
  if (!value) return 'Article';
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchTerms(query: string) {
  const matches = query.match(/"[^"]+"|'[^']+'|[\p{L}\p{N}_-]+/gu) ?? [];
  return Array.from(
    new Set(
      matches
        .map((item) => item.replace(/^["']|["']$/g, '').trim())
        .filter((item) => item.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length);
}

function buildHighlightRegex(query: string) {
  const terms = searchTerms(query);
  if (!terms.length) return null;

  const patterns = terms.map((term) => {
    const escaped = escapeRegExp(term);
    const isAsciiWord = /^[A-Za-z0-9_-]+$/.test(term);
    return isAsciiWord
      ? `(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`
      : escaped;
  });

  try {
    return new RegExp(`(${patterns.join('|')})`, 'giu');
  } catch {
    return new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  }
}

function HighlightText({
  text,
  query,
  className,
}: {
  text?: string | null;
  query: string;
  className?: string;
}) {
  if (!text) return null;
  const regex = buildHighlightRegex(query);
  if (!regex) return <>{text}</>;

  const pieces = text.split(regex);
  return (
    <>
      {pieces.map((piece, index) => {
        regex.lastIndex = 0;
        const matched = regex.test(piece);
        regex.lastIndex = 0;

        return matched ? (
          <mark className={`literature-keyword-highlight ${className ?? ''}`} key={`${piece}-${index}`}>
            {piece}
          </mark>
        ) : (
          <span key={`${piece}-${index}`}>{piece}</span>
        );
      })}
    </>
  );
}

async function fetchJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }
  return response.json();
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

function pageWindow(current: number, total: number) {
  const windowSize = 10;
  if (total <= windowSize) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(windowSize / 2);
  let start = Math.max(1, current - halfWindow + 1);
  let end = start + windowSize - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - windowSize + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function DetailRow({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`literature-detail-row ${wide ? 'is-wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}

export function LiteratureSearchPage() {
  const navigate = useNavigate();
  const pageRootRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') ?? '';
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'relevance');
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') ?? 1) || 1));
  const [activeTopic, setActiveTopic] = useState(searchParams.get('topic') ?? '');

  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [yearStats, setYearStats] = useState<YearStat[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [availableMinYear, setAvailableMinYear] = useState<number | null>(null);
  const [availableMaxYear, setAvailableMaxYear] = useState<number | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(
    searchParams.get('year_from') ? Number(searchParams.get('year_from')) : null,
  );
  const [yearTo, setYearTo] = useState<number | null>(
    searchParams.get('year_to') ? Number(searchParams.get('year_to')) : null,
  );

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicExpanded, setTopicExpanded] = useState(false);

  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const initializedYearRangeRef = useRef(false);

  useEffect(() => {
    const root = pageRootRef.current;
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    const updateViewportHeight = () => {
      if (!root) return;
      const top = Math.max(0, root.getBoundingClientRect().top);
      const remaining = Math.max(520, window.innerHeight - top);
      root.style.setProperty('--literature-workspace-height', `${remaining}px`);
    };

    window.scrollTo(0, 0);
    updateViewportHeight();

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!selectedPaper) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPaper(null);
        setDetailError('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPaper]);

  const yearRangeReady =
    availableMinYear !== null &&
    availableMaxYear !== null &&
    yearFrom !== null &&
    yearTo !== null;

  const effectiveYearFrom = yearFrom ?? availableMinYear ?? undefined;
  const effectiveYearTo = yearTo ?? availableMaxYear ?? undefined;

  const activeTopicName =
    topicStats.find((topic) => topic.slug === activeTopic)?.name_zh ?? '';

  const maxYearCount = useMemo(
    () => Math.max(1, ...yearStats.map((item) => item.count)),
    [yearStats],
  );

  const shownTopics = topicExpanded ? topicStats : topicStats.slice(0, 9);

  const syncUrl = (
    next: Partial<{
      q: string;
      sort: string;
      page: number;
      topic: string;
      yearFrom: number | null;
      yearTo: number | null;
    }> = {},
  ) => {
    const nextQuery = next.q ?? query;
    const nextSort = next.sort ?? sort;
    const nextPage = next.page ?? page;
    const nextTopic = next.topic ?? activeTopic;
    const nextYearFrom = next.yearFrom !== undefined ? next.yearFrom : yearFrom;
    const nextYearTo = next.yearTo !== undefined ? next.yearTo : yearTo;

    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextSort !== 'relevance') params.set('sort', nextSort);
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextTopic) params.set('topic', nextTopic);

    const isFullRange =
      availableMinYear !== null &&
      availableMaxYear !== null &&
      nextYearFrom === availableMinYear &&
      nextYearTo === availableMaxYear;

    if (!isFullRange) {
      if (nextYearFrom !== null) params.set('year_from', String(nextYearFrom));
      if (nextYearTo !== null) params.set('year_to', String(nextYearTo));
    }

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
      setQueryInput(urlQuery);
    }
  }, [searchParams, query]);

  useEffect(() => {
    const controller = new AbortController();
    setStatsLoading(true);

    const yearQuery = buildQuery({
      q: query || undefined,
      topic: activeTopic || undefined,
    });

    const topicQuery = buildQuery({
      q: query || undefined,
      year_from: effectiveYearFrom,
      year_to: effectiveYearTo,
    });

    Promise.all([
      fetchJson(`${API_BASE}/stats/years${yearQuery ? `?${yearQuery}` : ''}`, controller.signal),
      fetchJson(`${API_BASE}/stats/topics${topicQuery ? `?${topicQuery}` : ''}`, controller.signal),
    ])
      .then(([yearPayload, topicPayload]) => {
        const nextYears = normalizeYears(yearPayload);
        const nextTopics = normalizeTopics(topicPayload);

        setYearStats(nextYears);
        setTopicStats(nextTopics);

        if (nextYears.length) {
          const minYear = nextYears[0].year;
          const maxYear = nextYears[nextYears.length - 1].year;

          setAvailableMinYear(minYear);
          setAvailableMaxYear(maxYear);

          if (!initializedYearRangeRef.current) {
            const requestedFrom = searchParams.get('year_from');
            const requestedTo = searchParams.get('year_to');
            setYearFrom(requestedFrom ? Math.max(minYear, Number(requestedFrom)) : minYear);
            setYearTo(requestedTo ? Math.min(maxYear, Number(requestedTo)) : maxYear);
            initializedYearRangeRef.current = true;
          }
        }
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || '统计数据加载失败');
        }
      })
      .finally(() => setStatsLoading(false));

    return () => controller.abort();
  }, [query, activeTopic, effectiveYearFrom, effectiveYearTo, searchParams]);

  useEffect(() => {
    if (!initializedYearRangeRef.current && availableMinYear === null) return;

    const controller = new AbortController();
    setLoading(true);
    setError('');

    const requestQuery = buildQuery({
      q: query || undefined,
      year_from: effectiveYearFrom,
      year_to: effectiveYearTo,
      topic: activeTopic || undefined,
      sort,
      page,
      page_size: PAGE_SIZE,
    });

    fetchJson(`${API_BASE}/papers?${requestQuery}`, controller.signal)
      .then((payload) => {
        const result = normalizePaperList(payload);
        setPapers(result.items);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.pages));
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || '论文数据加载失败');
          setPapers([]);
          setTotal(0);
          setTotalPages(1);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, sort, page, activeTopic, effectiveYearFrom, effectiveYearTo, availableMinYear]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = queryInput.trim();
    setQuery(nextQuery);
    setPage(1);
    syncUrl({ q: nextQuery, page: 1 });
  };

  const handleTopic = (slug: string) => {
    const nextTopic = activeTopic === slug ? '' : slug;
    setActiveTopic(nextTopic);
    setPage(1);
    syncUrl({ topic: nextTopic, page: 1 });
  };

  const applyYearRange = (nextFrom: number, nextTo: number) => {
    const from = Math.min(nextFrom, nextTo);
    const to = Math.max(nextFrom, nextTo);
    setYearFrom(from);
    setYearTo(to);
    setPage(1);
    syncUrl({ yearFrom: from, yearTo: to, page: 1 });
  };

  const clearYears = () => {
    if (availableMinYear === null || availableMaxYear === null) return;
    setYearFrom(availableMinYear);
    setYearTo(availableMaxYear);
    setPage(1);
    syncUrl({
      yearFrom: availableMinYear,
      yearTo: availableMaxYear,
      page: 1,
    });
  };

  const openPaperDetail = async (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailLoading(true);
    setDetailError('');

    try {
      const payload = await fetchJson(`${API_BASE}/papers/${paper.id}`);
      const detail = normalizePaperDetail(payload);
      setSelectedPaper((current) =>
        current?.id === paper.id ? { ...paper, ...detail } : current,
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : '详细信息加载失败';
      setDetailError(`${message}，当前展示列表中已有信息。`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePaperKeyDown = (event: KeyboardEvent<HTMLElement>, paper: Paper) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openPaperDetail(paper);
    }
  };

  const selectedRangeLabel =
    yearRangeReady && yearFrom === yearTo
      ? `${yearFrom}`
      : yearRangeReady
        ? `${yearFrom} – ${yearTo}`
        : '全部年份';

  const selectedPaperTopics = selectedPaper ? normalizePaperTopics(selectedPaper) : [];
  const selectedInstitutions = selectedPaper ? normalizeInstitutions(selectedPaper) : [];
  const selectedDoiUrl = normalizeDoiUrl(selectedPaper?.doi);

  return (
    <main ref={pageRootRef} className="literature-search-page">
      <div className="literature-search-shell">
        <aside className="literature-filter-column" aria-label="文献筛选器">
          <section className="literature-filter-card literature-year-card">
            <div className="literature-filter-heading">
              <div>
                <span className="literature-eyebrow">YEAR</span>
                <h2>年份分布</h2>
              </div>
              {yearRangeReady &&
                availableMinYear !== null &&
                availableMaxYear !== null &&
                (yearFrom !== availableMinYear || yearTo !== availableMaxYear) && (
                  <button className="literature-clear-button" type="button" onClick={clearYears}>
                    清除
                  </button>
                )}
            </div>

            <div className="literature-year-chart" aria-label="按年份统计的论文柱状图">
              {statsLoading && !yearStats.length ? (
                <div className="literature-filter-empty">正在加载年份数据…</div>
              ) : yearStats.length ? (
                yearStats.map(({ year, count }) => {
                  const withinRange =
                    yearFrom !== null &&
                    yearTo !== null &&
                    year >= Math.min(yearFrom, yearTo) &&
                    year <= Math.max(yearFrom, yearTo);

                  return (
                    <button
                      key={year}
                      className={`literature-year-bar-wrap ${withinRange ? 'is-in-range' : ''}`}
                      type="button"
                      title={`${year} · ${count} 篇`}
                      onClick={() => applyYearRange(year, year)}
                    >
                      <span className="literature-year-tooltip">
                        <strong>{year}</strong>
                        <small>{count} 篇</small>
                      </span>
                      <span
                        className="literature-year-bar"
                        style={{ height: `${Math.max(10, (count / maxYearCount) * 100)}%` }}
                      />
                      <span className="literature-year-label">{String(year).slice(-2)}</span>
                    </button>
                  );
                })
              ) : (
                <div className="literature-filter-empty">暂无年份数据</div>
              )}
            </div>

            {yearRangeReady && (
              <div className="literature-range-area">
                <div className="literature-range-track">
                  <div
                    className="literature-range-selection"
                    style={{
                      left: `${
                        ((Math.min(yearFrom!, yearTo!) - availableMinYear!) /
                          Math.max(1, availableMaxYear! - availableMinYear!)) *
                        100
                      }%`,
                      right: `${
                        100 -
                        ((Math.max(yearFrom!, yearTo!) - availableMinYear!) /
                          Math.max(1, availableMaxYear! - availableMinYear!)) *
                          100
                      }%`,
                    }}
                  />
                  <input
                    aria-label="起始年份"
                    className="literature-range-input"
                    type="range"
                    min={availableMinYear!}
                    max={availableMaxYear!}
                    step={1}
                    value={yearFrom!}
                    onChange={(event) =>
                      applyYearRange(
                        Math.min(Number(event.target.value), yearTo!),
                        yearTo!,
                      )
                    }
                  />
                  <input
                    aria-label="结束年份"
                    className="literature-range-input"
                    type="range"
                    min={availableMinYear!}
                    max={availableMaxYear!}
                    step={1}
                    value={yearTo!}
                    onChange={(event) =>
                      applyYearRange(
                        yearFrom!,
                        Math.max(Number(event.target.value), yearFrom!),
                      )
                    }
                  />
                </div>

                <div className="literature-range-labels">
                  <span>{availableMinYear}</span>
                  <strong>{selectedRangeLabel}</strong>
                  <span>{availableMaxYear}</span>
                </div>
              </div>
            )}
          </section>

          <section className="literature-filter-card literature-topic-card">
            <div className="literature-filter-heading">
              <div>
                <span className="literature-eyebrow">TOPIC</span>
                <h2>研究主题</h2>
              </div>
              {topicStats.length > 9 && (
                <button
                  className="literature-text-button"
                  type="button"
                  onClick={() => setTopicExpanded((value) => !value)}
                >
                  {topicExpanded ? '收起' : '全部'}
                  <span>›</span>
                </button>
              )}
            </div>

            <div className="literature-topic-list">
              {statsLoading && !topicStats.length ? (
                <div className="literature-filter-empty">正在加载 Topic…</div>
              ) : shownTopics.length ? (
                shownTopics.map((topic) => {
                  const selected = activeTopic === topic.slug;
                  return (
                    <button
                      key={topic.slug}
                      className={`literature-topic-item ${selected ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => handleTopic(topic.slug)}
                    >
                      <span className="literature-topic-check" aria-hidden="true">
                        {selected && <span />}
                      </span>
                      <span className="literature-topic-name">{topic.name_zh}</span>
                      <span className="literature-topic-count">{topic.count}</span>
                    </button>
                  );
                })
              ) : (
                <div className="literature-filter-empty">暂无 Topic 数据</div>
              )}
            </div>
          </section>
        </aside>

        <section className="literature-results-column">
          <button
            className="literature-back-link"
            type="button"
            onClick={() => navigate('/reports')}
          >
            <ArrowLeftIcon />
            返回研究中心
          </button>

          <form className="literature-search-toolbar" onSubmit={handleSearch}>
            <label className="literature-search-input-wrap">
              <span className="literature-search-icon">
                <SearchIcon />
              </span>
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="搜索 Alzheimer、MRI、ADNI、Transformer…"
                aria-label="搜索文献"
              />
            </label>

            <label className="literature-sort-control">
              <select
                value={sort}
                onChange={(event) => {
                  const nextSort = event.target.value;
                  setSort(nextSort);
                  setPage(1);
                  syncUrl({ sort: nextSort, page: 1 });
                }}
                aria-label="论文排序"
              >
                <option value="relevance">相关性</option>
                <option value="citations">引用最多</option>
                <option value="newest">最新发表</option>
                <option value="oldest">最早发表</option>
              </select>
              <ChevronDownIcon />
            </label>

            <button className="literature-search-button" type="submit">
              Search
            </button>
          </form>

          <div className="literature-result-summary">
            <div className="literature-result-summary-main">
              <strong>找到 {total.toLocaleString()} 篇文献</strong>
              {query && (
                <>
                  <span className="literature-summary-dot">·</span>
                  <span>
                    关键词 “
                    <HighlightText text={query} query={query} />
                    ”
                  </span>
                </>
              )}
              {yearRangeReady && (
                <>
                  <span className="literature-summary-dot">·</span>
                  <span>{selectedRangeLabel}</span>
                </>
              )}
              {activeTopicName && (
                <>
                  <span className="literature-summary-dot">·</span>
                  <span className="literature-summary-topic">{activeTopicName}</span>
                </>
              )}
            </div>
            <span className="literature-page-summary">
              第 {page} 页 · 每页 {PAGE_SIZE} 篇
            </span>
          </div>

          <div className="literature-paper-stage">
            {loading ? (
              <div className="literature-state-panel">
                <span className="literature-loader" />
                正在检索本地文献索引…
              </div>
            ) : error ? (
              <div className="literature-state-panel is-error">{error}</div>
            ) : papers.length ? (
              <div className="literature-paper-list">
                {papers.map((paper) => {
                  const paperTopics = normalizePaperTopics(paper);
                  const doiUrl = normalizeDoiUrl(paper.doi);

                  return (
                    <article
                      className="literature-paper-card"
                      key={paper.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`查看论文详情：${paper.title}`}
                      onClick={() => void openPaperDetail(paper)}
                      onKeyDown={(event) => handlePaperKeyDown(event, paper)}
                    >
                      <div className="literature-paper-topline">
                        <div className="literature-paper-meta">
                          <span className="literature-paper-type">
                            {(paper.work_type || 'ARTICLE').toUpperCase()}
                          </span>
                          {paper.publication_year && <span>{paper.publication_year}</span>}
                          {paper.journal && (
                            <span>
                              <HighlightText text={paper.journal} query={query} />
                            </span>
                          )}
                        </div>

                        {typeof paper.cited_by_count === 'number' && (
                          <span className="literature-citation-pill">
                            Cited {paper.cited_by_count}
                          </span>
                        )}
                      </div>

                      <h3>
                        <HighlightText text={paper.title} query={query} />
                      </h3>

                      <p className="literature-paper-authors">
                        <HighlightText text={normalizeAuthors(paper.authors)} query={query} />
                      </p>

                      {paper.abstract && (
                        <p className="literature-paper-abstract">
                          <HighlightText text={paper.abstract} query={query} />
                        </p>
                      )}

                      <div className="literature-paper-footer">
                        <div className="literature-paper-tags">
                          {paperTopics.slice(0, 4).map((topic) => (
                            <span key={`${paper.id}-${topic}`}>
                              <HighlightText text={topic} query={query} />
                            </span>
                          ))}
                        </div>

                        <div
                          className="literature-paper-actions"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {paperPdfHref(paper) && (
                            <a href={paperPdfHref(paper) ?? undefined} target="_blank" rel="noreferrer">
                              {paper.has_local_pdf ? '本地 PDF' : 'PDF'}
                            </a>
                          )}
                          {doiUrl && (
                            <a href={doiUrl} target="_blank" rel="noreferrer">
                              DOI
                            </a>
                          )}
                          {paper.landing_page_url && (
                            <a href={paper.landing_page_url} target="_blank" rel="noreferrer">
                              来源
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="literature-state-panel">
                没有找到符合当前筛选条件的论文
              </div>
            )}
          </div>

          {!loading && !error && totalPages > 1 && (
            <nav className="literature-pagination" aria-label="论文结果分页">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  syncUrl({ page: next });
                }}
              >
                ‹
                <span>上一页</span>
              </button>

              {pageWindow(page, totalPages).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={number === page ? 'is-active' : ''}
                  onClick={() => {
                    setPage(number);
                    syncUrl({ page: number });
                  }}
                >
                  {number}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  syncUrl({ page: next });
                }}
              >
                <span>下一页</span>
                ›
              </button>
            </nav>
          )}
        </section>
      </div>

      {selectedPaper && (
        <div
          className="literature-detail-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPaper(null);
              setDetailError('');
            }
          }}
        >
          <aside
            className="literature-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`论文详情：${selectedPaper.title}`}
          >
            <header className="literature-detail-header">
              <div className="literature-detail-kicker">
                <span>WORK</span>
                {detailLoading && <small>正在补充详情…</small>}
              </div>
              <button
                className="literature-detail-close"
                type="button"
                aria-label="关闭论文详情"
                onClick={() => {
                  setSelectedPaper(null);
                  setDetailError('');
                }}
              >
                <CloseIcon />
              </button>
            </header>

            <div className="literature-detail-scroll">
              <h2>
                <HighlightText text={selectedPaper.title} query={query} />
              </h2>

              <div className="literature-detail-primary-actions">
                {paperPdfHref(selectedPaper) && (
                  <a href={paperPdfHref(selectedPaper) ?? undefined} target="_blank" rel="noreferrer">
                    {selectedPaper.has_local_pdf ? '本地 PDF' : 'PDF'}
                    <ExternalIcon />
                  </a>
                )}
                {selectedDoiUrl && (
                  <a href={selectedDoiUrl} target="_blank" rel="noreferrer">
                    DOI
                    <ExternalIcon />
                  </a>
                )}
                {selectedPaper.landing_page_url && (
                  <a href={selectedPaper.landing_page_url} target="_blank" rel="noreferrer">
                    来源
                    <ExternalIcon />
                  </a>
                )}
              </div>

              {detailError && (
                <div className="literature-detail-notice">{detailError}</div>
              )}

              <section className="literature-detail-section">
                <h3>文献信息</h3>
                <dl className="literature-detail-grid">
                  <DetailRow label="Year">
                    {selectedPaper.publication_year ?? '—'}
                  </DetailRow>
                  <DetailRow label="Type">
                    {displayWorkType(selectedPaper.work_type)}
                  </DetailRow>
                  <DetailRow label="Authors" wide>
                    <HighlightText
                      text={normalizeAuthors(selectedPaper.authors)}
                      query={query}
                    />
                  </DetailRow>
                  <DetailRow label="Institutions" wide>
                    {selectedInstitutions.length
                      ? selectedInstitutions.join(', ')
                      : '—'}
                  </DetailRow>
                  <DetailRow label="Language">
                    {displayLanguage(selectedPaper.language)}
                  </DetailRow>
                  <DetailRow label="Journal">
                    <HighlightText text={selectedPaper.journal ?? '—'} query={query} />
                  </DetailRow>
                </dl>
              </section>

              <section className="literature-detail-section">
                <h3>引用与开放获取</h3>
                <dl className="literature-detail-grid">
                  {typeof selectedPaper.fwci === 'number' && (
                    <DetailRow label="FWCI">
                      {selectedPaper.fwci.toFixed(2)}
                    </DetailRow>
                  )}
                  {typeof selectedPaper.referenced_works_count === 'number' && (
                    <DetailRow label="References">
                      {selectedPaper.referenced_works_count.toLocaleString()}
                    </DetailRow>
                  )}
                  <DetailRow label="Cited by">
                    {typeof selectedPaper.cited_by_count === 'number'
                      ? selectedPaper.cited_by_count.toLocaleString()
                      : '—'}
                  </DetailRow>
                  <DetailRow label="Open Access">
                    {selectedPaper.oa_status ??
                      (selectedPaper.is_oa === true
                        ? 'open'
                        : selectedPaper.is_oa === false
                          ? 'closed'
                          : '—')}
                  </DetailRow>
                  <DetailRow label="DOI" wide>
                    {selectedPaper.doi ?? '—'}
                  </DetailRow>
                  <DetailRow label="OpenAlex ID" wide>
                    {displayOpenAlexId(selectedPaper.openalex_id)}
                  </DetailRow>
                </dl>
              </section>

              <section className="literature-detail-section">
                <h3>研究主题</h3>
                <dl className="literature-detail-grid">
                  {topicLabel(selectedPaper.primary_topic) && (
                    <DetailRow label="Topic" wide>
                      {topicLabel(selectedPaper.primary_topic)}
                    </DetailRow>
                  )}
                  {topicLabel(selectedPaper.subfield) && (
                    <DetailRow label="Subfield" wide>
                      {topicLabel(selectedPaper.subfield)}
                    </DetailRow>
                  )}
                  {topicLabel(selectedPaper.field) && (
                    <DetailRow label="Field" wide>
                      {topicLabel(selectedPaper.field)}
                    </DetailRow>
                  )}
                  {topicLabel(selectedPaper.domain) && (
                    <DetailRow label="Domain" wide>
                      {topicLabel(selectedPaper.domain)}
                    </DetailRow>
                  )}
                </dl>

                {selectedPaperTopics.length > 0 && (
                  <div className="literature-detail-topic-cloud">
                    {selectedPaperTopics.map((topic) => (
                      <span key={topic}>
                        <HighlightText text={topic} query={query} />
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="literature-detail-section">
                <h3>摘要</h3>
                <div className="literature-detail-abstract">
                  {selectedPaper.abstract ? (
                    <HighlightText text={selectedPaper.abstract} query={query} />
                  ) : (
                    <span className="literature-detail-empty">当前数据库暂无摘要。</span>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default LiteratureSearchPage;
