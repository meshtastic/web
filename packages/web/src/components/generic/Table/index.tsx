import { cn } from "@core/utils/cn.ts";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useMemo, useState } from "react";

export interface Heading {
  title: string;
  sortable: boolean;
  sortFn?: (value: string | number) => string | number;
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
  defaultSortIndex?: number;
  defaultSortOrder?: "asc" | "desc";
}

export const Table = ({
  headings,
  rows,
  defaultSortIndex,
  defaultSortOrder = "desc",
}: TableProps) => {
  const [sortIndex, setSortIndex] = useState<number | null>(defaultSortIndex ?? null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

  const handleSort = (index: number) => {
    if (sortIndex === index) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortIndex(index);
      setSortOrder("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (sortIndex === null) {
      return rows;
    }

    const heading = headings[sortIndex];
    if (!heading) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      const aRaw = a.cells[sortIndex]?.sortValue ?? 0;
      const bRaw = b.cells[sortIndex]?.sortValue ?? 0;
      const aValue = heading.sortFn ? heading.sortFn(aRaw) : aRaw;
      const bValue = heading.sortFn ? heading.sortFn(bRaw) : bRaw;

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortIndex, sortOrder, headings]);

  const lastFavoriteIndex = useMemo(
    () => sortedRows.reduce((last, row, i) => (row.isFavorite ? i : last), -1),
    [sortedRows],
  );

  return (
    <table className="min-w-full" style={{ contentVisibility: "auto" }}>
      <thead className="text-xs font-semibold">
        <tr>
          {headings.map((heading, headingIndex) => (
            <th
              key={heading.title || headingIndex}
              scope="col"
              className={cn(
                "py-2 pr-3 text-left",
                heading.sortable && "cursor-pointer hover:brightness-hover active:brightness-press",
              )}
              onClick={() => heading.sortable && handleSort(headingIndex)}
              onKeyUp={(e) => {
                if (heading.sortable && (e.key === "Enter" || e.key === " ")) {
                  handleSort(headingIndex);
                }
              }}
              tabIndex={heading.sortable ? 0 : -1}
              aria-sort={
                sortIndex === headingIndex
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <div className="flex items-center gap-2">
                {heading.title}
                {heading.sortable &&
                  sortIndex === headingIndex &&
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
        {sortedRows.map((row, rowIndex) => {
          const isSeparator = rowIndex === lastFavoriteIndex && lastFavoriteIndex >= 0;
          return (
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
                const separatorClass = isSeparator
                  ? "border-b-2 border-black dark:border-slate-300"
                  : "";

                if (isFirstCell) {
                  return (
                    <th
                      key={key}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-sm text-left text-text-secondary",
                        separatorClass,
                      )}
                      scope="row"
                    >
                      {cell.content}
                    </th>
                  );
                }
                return (
                  <td
                    key={key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-sm text-text-secondary",
                      separatorClass,
                    )}
                  >
                    {cell.content}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
