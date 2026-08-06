const SERIES_COLOR = "#079992";

export interface RankedListRow {
  id: string;
  label: string;
  value: number;
}

interface RankedListProps {
  title: string;
  rows: RankedListRow[];
  emptyLabel?: string;
}

export function RankedList({ title, rows, emptyLabel = "No data yet." }: RankedListProps) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>{row.label}</span>
                <span className="font-medium text-slate-900">{row.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${(row.value / max) * 100}%`,
                    backgroundColor: SERIES_COLOR,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
