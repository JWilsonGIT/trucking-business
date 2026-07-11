"use client";

import { EmptyState } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: { title: string; hint?: string };
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty?.title ?? "Nothing here yet"} hint={empty?.hint} />;
  }
  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-paper/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`label-mono px-4 py-2.5 font-medium ${alignCls(c.align)}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line last:border-0 ${
                onRowClick ? "cursor-pointer hover:bg-paper/60" : ""
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 text-ink ${alignCls(c.align)} ${c.className ?? ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
