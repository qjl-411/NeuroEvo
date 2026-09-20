import { useMemo, useState } from 'react';
import type { YearStat } from '../../types/literature';

interface YearHistogramProps {
  data: YearStat[];
  selectedYear: number | null;
  onSelect: (year: number | null) => void;
  loading?: boolean;
}

export function YearHistogram({ data, selectedYear, onSelect, loading = false }: YearHistogramProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const maxCount = useMemo(() => Math.max(1, ...data.map((item) => item.count)), [data]);
  const hovered = data.find((item) => item.year === hoveredYear);

  return (
    <section className="lit-panel lit-year-panel" aria-label="文献年份分布">
      <div className="lit-panel-heading">
        <div>
          <span className="lit-eyebrow">YEAR</span>
          <h3>年份分布</h3>
        </div>
        {selectedYear != null && (
          <button className="lit-clear-button" type="button" onClick={() => onSelect(null)}>
            清除 {selectedYear}
          </button>
        )}
      </div>

      <div className="lit-year-chart" aria-busy={loading}>
        {data.length === 0 ? (
          <div className="lit-empty-small">{loading ? '正在统计…' : '暂无年份数据'}</div>
        ) : (
          <>
            <div className="lit-year-tooltip" data-visible={hovered ? 'true' : 'false'}>
              {hovered ? `${hovered.year} · ${hovered.count} 篇` : '悬停柱形查看数量'}
            </div>
            <div className="lit-bars">
              {data.map((item) => {
                const height = Math.max(7, (item.count / maxCount) * 100);
                const active = selectedYear === item.year;
                return (
                  <button
                    key={item.year}
                    type="button"
                    className={`lit-bar-column${active ? ' is-active' : ''}`}
                    onClick={() => onSelect(active ? null : item.year)}
                    onMouseEnter={() => setHoveredYear(item.year)}
                    onMouseLeave={() => setHoveredYear(null)}
                    aria-label={`${item.year} 年 ${item.count} 篇文献`}
                    aria-pressed={active}
                  >
                    <span className="lit-bar-track">
                      <span className="lit-bar-fill" style={{ height: `${height}%` }} />
                    </span>
                    <span className="lit-bar-year">{String(item.year).slice(-2)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
