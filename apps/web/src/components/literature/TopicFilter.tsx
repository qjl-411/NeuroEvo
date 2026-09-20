import type { TopicStat } from '../../types/literature';

interface TopicFilterProps {
  topics: TopicStat[];
  selectedTopic: string | null;
  onSelect: (slug: string | null) => void;
  loading?: boolean;
}

export function TopicFilter({ topics, selectedTopic, onSelect, loading = false }: TopicFilterProps) {
  return (
    <section className="lit-panel lit-topic-panel" aria-label="Topic 筛选">
      <div className="lit-panel-heading">
        <div>
          <span className="lit-eyebrow">TOPIC</span>
          <h3>研究主题</h3>
        </div>
        {selectedTopic && (
          <button className="lit-clear-button" type="button" onClick={() => onSelect(null)}>
            清除
          </button>
        )}
      </div>

      <div className="lit-topic-list" aria-busy={loading}>
        {topics.length === 0 ? (
          <div className="lit-empty-small">{loading ? '正在统计…' : '暂无 Topic 数据'}</div>
        ) : (
          topics.map((topic) => {
            const active = selectedTopic === topic.slug;
            return (
              <button
                key={topic.slug}
                type="button"
                className={`lit-topic-row${active ? ' is-active' : ''}`}
                onClick={() => onSelect(active ? null : topic.slug)}
                title={topic.description}
                aria-pressed={active}
              >
                <span className="lit-topic-check" aria-hidden="true">{active ? '✓' : ''}</span>
                <span className="lit-topic-name">{topic.name_zh}</span>
                <span className="lit-topic-count">{topic.count}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
