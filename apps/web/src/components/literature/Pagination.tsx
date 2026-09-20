interface PaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav className="lit-pagination" aria-label="论文结果分页">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>上一页</button>
      <span>第 {page} / {pages} 页</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages}>下一页</button>
    </nav>
  );
}
