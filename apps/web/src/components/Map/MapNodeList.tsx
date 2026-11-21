import { NodeRowAvatar } from "@components/Nodes/NodeRowAvatar.tsx";
import type { NodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { ListRow } from "@components/UI/ListRow.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface MapNodeListProps {
  rows: readonly NodeRow[];
  /** All nodes with a position, before search. */
  total: number;
  search: string;
  onSearchChange: (value: string) => void;
  selectedNum?: number;
  onSelect: (num: number) => void;
  labels: NodeLabels;
  /** Extra controls beside the search box (advanced filters). */
  tools?: ReactNode;
  /** Render the heading; off when a drawer already titles the list. */
  showHeading?: boolean;
  className?: string;
}

/** Nodes with a position: search them, pick one to fly to it. */
export const MapNodeList = ({
  rows,
  total,
  search,
  onSearchChange,
  selectedNum,
  onSelect,
  labels,
  tools,
  showHeading = true,
  className,
}: MapNodeListProps) => {
  const { t } = useTranslation("map");
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-col gap-2.5 border-b border-subtle p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          {showHeading ? (
            <h2 className="m-0 text-header-lg font-bold">{t("page.title")}</h2>
          ) : null}
          <span className="text-meta text-muted">
            {t("page.nodesWithPosition", { count: total })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SearchField
            label={t("page.findLabel")}
            placeholder={t("page.findPlaceholder")}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            containerClassName="h-[38px] min-w-0 flex-1"
          />
          {tools}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 p-4 text-help text-muted">
          {total === 0 ? t("page.noPositions") : t("page.noMatches")}
        </p>
      ) : (
        <ul
          aria-label={t("page.nodeListLabel")}
          className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-1.5"
        >
          {rows.map((row) => (
            <li key={row.num}>
              <ListRow
                data-node-num={row.num}
                selected={row.num === selectedNum}
                onClick={() => onSelect(row.num)}
                leading={<NodeRowAvatar row={row} size="xs" />}
                title={row.name}
                description={labels.summary(row)}
                className="p-2"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
