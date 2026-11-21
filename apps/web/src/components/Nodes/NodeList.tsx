import { ListRow } from "@components/UI/ListRow.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NodeRowAvatar } from "./NodeRowAvatar.tsx";
import type { NodeLabels } from "./useNodeLabels.ts";

export interface NodeListProps {
  rows: readonly NodeRow[];
  selectedNum?: number;
  onSelect: (num: number) => void;
  labels: NodeLabels;
  /** Accessible name of the list. */
  label: string;
  /** Nodes with a reported error. */
  errorNums?: ReadonlySet<number>;
  /** Focus this node's row on mount, e.g. when coming back from its details. */
  focusNum?: number;
}

/** Narrow-screen node list: one two-line row per node. */
export const NodeList = ({
  rows,
  selectedNum,
  onSelect,
  labels,
  label,
  errorNums,
  focusNum,
}: NodeListProps) => {
  const { t } = useTranslation("nodes");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (focusNum === undefined) {
      return;
    }
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-node-num="${focusNum}"]`)
      ?.focus();
  }, [focusNum]);

  return (
    <ul
      ref={listRef}
      aria-label={label}
      className="m-0 flex list-none flex-col gap-0.5 p-0"
    >
      {rows.map((row) => (
        <li key={row.num}>
          <ListRow
            selected={row.num === selectedNum}
            data-node-num={row.num}
            onClick={() => onSelect(row.num)}
            className="min-h-14"
            leading={<NodeRowAvatar row={row} />}
            title={
              <>
                {row.name}
                {row.isFavorite ? (
                  <span className="sr-only">, {t("value.favorite")}</span>
                ) : null}
                {errorNums?.has(row.num) ? (
                  <>
                    <TriangleAlertIcon
                      aria-hidden="true"
                      className="ml-1.5 inline size-3.5 text-danger"
                    />
                    <span className="sr-only">
                      , {t("nodeDetail.error.label")}
                    </span>
                  </>
                ) : null}
              </>
            }
            meta={
              <span className="flex items-center gap-1.5">
                <StatusDot
                  status={row.isOnline ? "online" : "offline"}
                  size="sm"
                />
                {labels.lastHeard(row)}
              </span>
            }
            description={`${labels.hops(row)} · ${t("column.snr")} ${labels.snr(row)}`}
          />
        </li>
      ))}
    </ul>
  );
};
