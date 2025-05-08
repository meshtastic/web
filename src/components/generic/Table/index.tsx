import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import React from "react";

export interface TableProps {
  headings: Heading[];
  rows: React.ReactNode[][];
}

export interface Heading {
  title: string;
  type: "blank" | "normal";
  sortable: boolean;
}

function numericHops(hopsAway: string | unknown): number {
  if (typeof hopsAway !== "string") {
    return Number.MAX_SAFE_INTEGER;
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

  const headingSort = (title: string) => {
    if (sortColumn === title) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(title);
      setSortOrder("asc");
    }
  };

  const getElement = (cell: React.ReactNode): React.ReactElement | null => {
    if (!React.isValidElement(cell)) {
      return null;
    }
    if (cell.type === React.Fragment) {
      const childrenArray = React.Children.toArray(cell.props.children);
      const firstElement = childrenArray.find((child) =>
        React.isValidElement(child)
      );
      return (firstElement as React.ReactElement) ?? null;
    }
    // If not a fragment, return the element itself
    return cell;
  };

  const sortedRows = rows.slice().sort((a, b) => {
    if (!sortColumn) return 0;

    const columnIndex = headings.findIndex((h) => h.title === sortColumn);
    if (columnIndex === -1) return 0;

    const elementA = getElement(a[columnIndex]);
    const elementB = getElement(b[columnIndex]);

    if (sortColumn === "Last Heard") {
      const aTimestamp = elementA?.props?.children?.props?.timestamp ?? 0;
      const bTimestamp = elementB?.props?.children?.props?.timestamp ?? 0;
      if (aTimestamp < bTimestamp) return sortOrder === "asc" ? -1 : 1;
      if (aTimestamp > bTimestamp) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }

    if (sortColumn === "Connection") {
      const aHopsStr = elementA?.props?.children[0];
      const bHopsStr = elementB?.props?.children[0];
      const aNumHops = numericHops(aHopsStr);
      const bNumHops = numericHops(bHopsStr);
      if (aNumHops < bNumHops) return sortOrder === "asc" ? -1 : 1;
      if (aNumHops > bNumHops) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }

    const aValue = elementA?.props?.children;
    const bValue = elementB?.props?.children;
    const valA = aValue ?? "";
    const valB = bValue ?? "";

    // Ensure consistent comparison for potentially different types
    const compareA = typeof valA === "string" || typeof valA === "number"
      ? valA
      : String(valA);
    const compareB = typeof valB === "string" || typeof valB === "number"
      ? valB
      : String(valB);

    if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
    if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <table className="min-w-full">
      <thead className="text-xs font-semibold">
        <tr>
          {headings.map((heading) => (
            <th
              key={heading.title}
              scope="col"
              className={`py-2 pr-3 text-left ${
                heading.sortable
                  ? "cursor-pointer hover:brightness-hover active:brightness-press"
                  : ""
              }`}
              onClick={() => heading.sortable && headingSort(heading.title)}
              onKeyUp={(e) => {
                if (heading.sortable && (e.key === "Enter" || e.key === " ")) {
                  headingSort(heading.title);
                }
              }}
              tabIndex={heading.sortable ? 0 : -1}
              role="columnheader"
              aria-sort={sortColumn === heading.title
                ? sortOrder === "asc" ? "ascending" : "descending"
                : "none"}
            >
              <div className="flex items-center gap-2">
                {heading.title}
                {heading.sortable && sortColumn === heading.title && (
                  sortOrder === "asc"
                    ? <ChevronUpIcon size={16} aria-hidden="true" />
                    : <ChevronDownIcon size={16} aria-hidden="true" />
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-w-fit">
        {sortedRows.map((row) => {
          const firstCellKey =
            (React.isValidElement(row[0]) && row[0].key !== null)
              ? String(row[0].key)
              : null;
          const rowKey = firstCellKey ?? Math.random().toString(); // Use random only as last resort

          return (
            <tr
              key={rowKey}
              className={`
                bg-white dark:bg-slate-900
                odd:bg-slate-200/40 dark:odd:bg-slate-800/40
              `}
            >
              {row.map((item, cellIndex) => {
                const cellKey = `${rowKey}_${cellIndex}`;
                return cellIndex === 0
                  ? (
                    <th
                      key={cellKey}
                      className="whitespace-nowrap px-3 py-2 text-sm text-left text-text-secondary"
                      scope="row"
                    >
                      {item}
                    </th>
                  )
                  : (
                    <td
                      key={cellKey}
                      className="whitespace-nowrap px-3 py-2 text-sm text-text-secondary"
                    >
                      {item}
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
