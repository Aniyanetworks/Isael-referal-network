import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
}

export function DataTable<T>({ columns, data, rowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50/80">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-brand-primary/4">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-3 align-middle text-gray-700 ${col.className ?? ""}`}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
