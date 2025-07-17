import { cn } from "@core/utils/cn.ts";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React, { useMemo, useState } from "react";

export interface Heading {
  title: string;
  sortable: boolean;
}

interface Cell {
  content: React.ReactNode;
  sortValue: string | number;
}

export interface DataRow {
  id: string | number;
  isFavorite?: boolean;
  cells: Cell[];
}

export interface TableProps {
  headings: Heading[];
  rows: DataRow[];
}

function numericHops(hopsAway: string | number): number {
  if (typeof hopsAway === "number") {
    return hopsAway;
  }
  if (hopsAway.match(/direct/i)) {
    return 0;
  }
  const match = hopsAway.match(/(\d+)\s+hop/i);
  return Number(match?.[1] ?? Number.MAX_SAFE_INTEGER);
}

export const Table = ({ headings, rows }: TableProps) => {
  const [sortColumn, setSortColumn] = useState<string | null>("Last Heard");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (title: string) => {
    if (sortColumn === title) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(title);
      setSortOrder("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      return rows;
    }

    const columnIndex = headings.findIndex((h) => h.title === sortColumn);
    if (columnIndex === -1) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];

      let aValue: string | number;
      let bValue: string | number;

      if (sortColumn === "Connection") {
        aValue = numericHops(aCell.sortValue);
        bValue = numericHops(bCell.sortValue);
      } else {
        aValue = aCell.sortValue;
        bValue = bCell.sortValue;
      }

      if (aValue < bValue) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [rows, sortColumn, sortOrder, headings]);

  return (
    <table className="min-w-full" style={{ contentVisibility: "auto" }}>
      <thead className="text-xs font-semibold">
        <tr>
          {headings.map((heading) => (
            <th
              key={heading.title}
              scope="col"
              className={cn(
                "py-2 pr-3 text-left",
                heading.sortable &&
                  "cursor-pointer hover:brightness-hover active:brightness-press",
              )}
              onClick={() => heading.sortable && handleSort(heading.title)}
              onKeyUp={(e) => {
                if (heading.sortable && (e.key === "Enter" || e.key === " ")) {
                  handleSort(heading.title);
                }
              }}
              tabIndex={heading.sortable ? 0 : -1}
              aria-sort={
                sortColumn === heading.title
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <div className="flex items-center gap-2">
                {heading.title}
                {heading.sortable &&
                  sortColumn === heading.title &&
                  (sortOrder === "asc" ? (
                    <ChevronUpIcon size={16} aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon size={16} aria-hidden="true" />
                  ))}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-w-fit">
        {sortedRows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              row.isFavorite
                ? "bg-yellow-100/30 dark:bg-slate-800 odd:bg-yellow-200/30 dark:odd:bg-slate-600/40"
                : "bg-white dark:bg-slate-900 odd:bg-slate-200/40 dark:odd:bg-slate-800/40",
            )}
          >
            {row.cells.map((cell, cellIndex) => {
              const key = `${row.id}_${cellIndex}`;
              const isFirstCell = cellIndex === 0;

              const cellElement = isFirstCell ? (
                <th
                  className="whitespace-nowrap px-3 py-2 text-sm text-left text-text-secondary"
                  scope="row"
                >
                  {cell.content}
                </th>
              ) : (
                <td className="whitespace-nowrap px-3 py-2 text-sm text-text-secondary">
                  {cell.content}
                </td>
              );

              return React.cloneElement(cellElement, { key });
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
