export interface LiteratureTopic {
  slug: string;
  name_zh: string;
  description: string;
  score?: number | null;
}

export interface LiteraturePaper {
  id: number;
  openalex_id: string;
  doi?: string | null;
  title: string;
  abstract: string;
  publication_year?: number | null;
  publication_date?: string | null;
  work_type?: string | null;
  authors: string;
  journal: string;
  cited_by_count: number;
  is_oa: boolean;
  oa_status?: string | null;
  pdf_url?: string | null;
  local_pdf_path?: string | null;
  has_local_pdf?: boolean;
  landing_page_url?: string | null;
  primary_custom_topic?: string | null;
  relevance_score: number;
  topics: LiteratureTopic[];
}

export interface LiteraturePaperPage {
  items: LiteraturePaper[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface YearStat {
  year: number;
  count: number;
}

export interface TopicStat extends LiteratureTopic {
  count: number;
}

export type LiteratureSort = 'relevance' | 'citations' | 'latest' | 'oldest';

export interface LiteratureFilters {
  q?: string;
  year?: number | null;
  topic?: string | null;
  oa?: boolean | null;
  sort?: LiteratureSort;
  page?: number;
  pageSize?: number;
}
