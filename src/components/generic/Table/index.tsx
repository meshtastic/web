import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

export interface TableProps {
  headings: Heading[];
  rows: [][];
}

export interface Heading {
  title: string;
  type: "blank" | "normal";
  sortable: boolean;
}

/**
 * @param hopsAway String describing the number of hops away the node is from the current node
 * @returns number of hopsAway or `0` if hopsAway is 'Direct'
 */
function numericHops(hopsAway: string): number {
  if(hopsAway.match(/direct/i)){
    return 0;
  }
  if ( hopsAway.match(/\d+\s+hop/gi) ) {
    return Number( hopsAway.match(/(\d+)\s+hop/i)?.[1] );
  }
  return Number.MAX_SAFE_INTEGER;
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

  const sortedRows = rows.slice().sort((a, b) => {
    if (!sortColumn) return 0;

    const columnIndex = headings.findIndex((h) => h.title === sortColumn);
    const aValue = a[columnIndex].props.children;
    const bValue = b[columnIndex].props.children;

    // Custom comparison for 'Last Heard' column
    if (sortColumn === "Last Heard") {
      const aTimestamp = aValue.props.timestamp ?? 0;
      const bTimestamp = bValue.props.timestamp ?? 0;

      if (aTimestamp < bTimestamp) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aTimestamp > bTimestamp) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    }

    // Custom comparison for 'Connection' column
    if (sortColumn === "Connection") {
      const aNumHops = numericHops(aValue instanceof Array ? aValue[0] : aValue);
      const bNumHops = numericHops(bValue instanceof Array ? bValue[0] : bValue);
      
      if (aNumHops < bNumHops) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aNumHops > bNumHops) {
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
      <thead className="bg-backgound-primary text-sm font-semibold text-text-primary">
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
              onKeyUp={() => heading.sortable && headingSort(heading.title)}
            >
              <div className="flex gap-2">
                {heading.title}
                {sortColumn === heading.title &&
                  (sortOrder === "asc"
                    ? <ChevronUpIcon size={16} />
                    : <ChevronDownIcon size={16} />)}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: TODO: Once this table is sortable, this should get fixed.
          <tr key={index} className={`${index % 2 ? 'bg-white dark:bg-white/2' : 'bg-slate-50/50 dark:bg-slate-50/5'} border-b-1 border-slate-200 dark:border-slate-900`}>
            {row.map((item, index) => (
               index === 0 ?
               <th 
                 key={item.key ?? index}
                 className="whitespace-nowrap py-2 text-sm text-text-secondary first:pl-2"
                 scope="row"
               >
                 {item}
               </th> :
              <td
                key={item.key ?? index}
                className="whitespace-nowrap py-2 text-sm text-text-secondary first:pl-2"
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