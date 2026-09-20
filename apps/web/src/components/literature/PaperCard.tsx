import type { LiteraturePaper } from '../../types/literature';

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function paperTypeLabel(type?: string | null) {
  if (!type) return 'SCHOLARLY WORK';
  return type.replaceAll('-', ' ').toUpperCase();
}

export function PaperCard({ paper }: { paper: LiteraturePaper }) {
  const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : null;
  const primaryLink = doiUrl || paper.landing_page_url || paper.pdf_url || `https://openalex.org/${paper.openalex_id}`;

  return (
    <article className="lit-paper-card">
      <div className="lit-paper-topline">
        <div className="lit-paper-meta-main">
          <span className="lit-paper-type">{paperTypeLabel(paper.work_type)}</span>
          {paper.publication_year && <span>{paper.publication_year}</span>}
          {paper.journal && <span>{paper.journal}</span>}
        </div>
        <span className="lit-citation-pill">Cited {paper.cited_by_count}</span>
      </div>

      <a className="lit-paper-title" href={primaryLink} target="_blank" rel="noreferrer">
        {paper.title}
      </a>

      <div className="lit-paper-authors">{paper.authors || '作者信息暂缺'}</div>

      {paper.abstract && <p className="lit-paper-abstract">{truncate(paper.abstract, 420)}</p>}

      <div className="lit-paper-footer">
        <div className="lit-paper-topics">
          {paper.topics.slice(0, 4).map((topic) => (
            <span key={topic.slug} className="lit-topic-chip">{topic.name_zh}</span>
          ))}
        </div>
        <div className="lit-paper-actions">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="lit-link-button lit-link-primary">
              PDF
            </a>
          )}
          {doiUrl && (
            <a href={doiUrl} target="_blank" rel="noreferrer" className="lit-link-button">
              DOI
            </a>
          )}
          {paper.landing_page_url && (
            <a href={paper.landing_page_url} target="_blank" rel="noreferrer" className="lit-link-button">
              来源
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
