const SERIES_BLUE = "#2a78d6";

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
    <div className="rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{row.label}</span>
                <span className="font-medium text-gray-900">{row.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${(row.value / max) * 100}%`,
                    backgroundColor: SERIES_BLUE,
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
