import { ChevronUpIcon } from "@heroicons/react/24/outline";

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
  return (
    <table className="min-w-full">
      <thead className="bg-backgroundPrimary text-sm font-semibold text-textPrimary">
        <tr>
          {headings.map((heading, index) => (
            <th
              key={index}
              scope="col"
              className={`py-2 pr-3 pl-6 text-left ${
                heading.sortable
                  ? "cursor-pointer hover:brightness-hover active:brightness-press"
                  : ""
              }`}
            >
              <div className="flex gap-2">
                {heading.title}
                {heading.sortable && <ChevronUpIcon className="my-auto h-3" />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
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
