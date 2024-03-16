import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React, { useState } from "react";

export interface TableProps {
  headings: Heading[];
  rows: JSX.Element[][];
}

export interface Heading {
  title: string;
  type: "blank" | "normal";
  sortable: boolean;
}

export const Table = ({ headings, rows }: TableProps): JSX.Element => {
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

  const sortedRows = rows.slice().sort((a, b) => {
    if (!sortColumn) return 0;

    const columnIndex = headings.findIndex((h) => h.title === sortColumn);
    const aValue = a[columnIndex].props.children;
    const bValue = b[columnIndex].props.children;

    // Custom comparison for 'Last Heard' column
    if (sortColumn === "Last Heard") {
      const aTimestamp = a[columnIndex].props.timestamp;
      const bTimestamp = b[columnIndex].props.timestamp;

      if (aTimestamp < bTimestamp) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aTimestamp > bTimestamp) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    }

    // Default comparison for other columns
    if (aValue < bValue) {
      return sortOrder === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === "asc" ? 1 : -1;
    }
    return 0;
  });

  return (
    <table className="min-w-full">
      <thead className="bg-backgroundPrimary text-sm font-semibold text-textPrimary">
        <tr>
          {headings.map((heading) => (
            <th
              key={heading.title}
              scope="col"
              className={`py-2 pr-3 pl-6 text-left ${
                heading.sortable
                  ? "cursor-pointer hover:brightness-hover active:brightness-press"
                  : ""
              }`}
              onClick={() => heading.sortable && headingSort(heading.title)}
            >
              <div className="flex gap-2">
                {heading.title}
                {sortColumn === heading.title && (
                  <>{sortOrder === "asc" ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}</>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, index) => (
          <tr key={index}>
            {row.map((item, index) => (
              <td
                key={index}
                className="whitespace-nowrap py-2 text-sm text-textSecondary first:pl-2"
              >
                {item}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
