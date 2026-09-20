import type { LiteraturePaper } from '../../types/literature';
import { PaperCard } from './PaperCard';

interface PaperListProps {
  papers: LiteraturePaper[];
  loading: boolean;
  error: string | null;
}

export function PaperList({ papers, loading, error }: PaperListProps) {
  if (loading && papers.length === 0) {
    return <div className="lit-state-card">正在从 NeuroEvo 文献库检索…</div>;
  }
  if (error) {
    return <div className="lit-state-card is-error">{error}</div>;
  }
  if (papers.length === 0) {
    return (
      <div className="lit-state-card">
        当前筛选条件下没有论文。若数据库尚未建立，请先运行 OpenAlex 文献同步脚本。
      </div>
    );
  }
  return (
    <div className="lit-paper-list">
      {papers.map((paper) => <PaperCard key={paper.id} paper={paper} />)}
    </div>
  );
}
