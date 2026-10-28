interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// Page numbers to show: always first/last, current +/- 1, with gaps as null.
function pageItems(page: number, pageCount: number): (number | null)[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const items: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(null);
    items.push(p);
  });
  return items;
}

const buttonBase =
  "min-w-9 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-zinc-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      {pageCount > 1 && (
        <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`${buttonBase} border-zinc-300 bg-white text-slate-700 hover:bg-zinc-50`}
          >
            Previous
          </button>
          {pageItems(page, pageCount).map((item, i) =>
            item === null ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-zinc-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={`${buttonBase} ${
                  item === page
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-zinc-300 bg-white text-slate-700 hover:bg-zinc-50"
                }`}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === pageCount}
            className={`${buttonBase} border-zinc-300 bg-white text-slate-700 hover:bg-zinc-50`}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
