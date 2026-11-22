import {
  NodeTrustIndicators,
  TrustTooltipProvider,
} from "@components/generic/NodeTrustIndicators.tsx";
import { Button } from "@components/UI/Button.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import type { NodeSortKey } from "@core/nodes/nodeSort.ts";
import { ariaSortFor, type SortState } from "@core/nodes/sort.ts";
import { visibleRange } from "@core/nodes/windowing.ts";
import { cn } from "@core/utils/cn.ts";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LockIcon,
  LockOpenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  createContext,
  memo,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { NodeRowAvatar } from "./NodeRowAvatar.tsx";
import type { NodeLabels } from "./useNodeLabels.ts";

export interface NodesTableProps {
  rows: readonly NodeRow[];
  sort: SortState<NodeSortKey>;
  onSort: (key: NodeSortKey) => void;
  selectedNum?: number;
  /** Keep stable (useCallback): rows are memoised on it. */
  onSelect: (num: number) => void;
  /** Keep stable (useCallback): rows are memoised on it. */
  onMessage: (num: number) => void;
  labels: NodeLabels;
  /** Nodes with a reported error (key mismatch and the like). */
  errorNums?: ReadonlySet<number>;
  /** Accessible name of the table. */
  label: string;
  /** Classes for the scroll container the table renders in. */
  className?: string;
}

interface Column {
  readonly key: NodeSortKey;
  /** Hidden below this breakpoint to keep the table readable. */
  readonly visibility?: string;
  readonly align?: "end";
}

/** Sortable columns after "Node", in drawing order. */
const COLUMNS: readonly Column[] = [
  { key: "role", visibility: "hidden 2xl:table-cell" },
  { key: "hardware", visibility: "hidden 2xl:table-cell" },
  { key: "hops" },
  { key: "snr", align: "end" },
  { key: "battery", visibility: "hidden xl:table-cell", align: "end" },
  { key: "distance", visibility: "hidden lg:table-cell", align: "end" },
  { key: "lastHeard" },
];

/** Row height (56px) plus the 2px border spacing between rows. */
export const NODE_ROW_PITCH = 58;

const cellPad = "px-3 py-2";

/**
 * The clock-bound labels. Only the last-heard cell reads them, so a clock
 * tick re-renders those cells and not whole rows.
 */
const LiveLabels = createContext<NodeLabels | undefined>(undefined);

const LastHeardText = ({ row }: { row: NodeRow }) => {
  const labels = useContext(LiveLabels);
  return labels ? labels.lastHeard(row) : null;
};

const SortHeader = ({
  column,
  sort,
  onSort,
  children,
  className,
}: {
  column: NodeSortKey;
  sort: SortState<NodeSortKey>;
  onSort: (key: NodeSortKey) => void;
  children: ReactNode;
  className?: string;
}) => {
  const ariaSort = ariaSortFor(sort, column);
  const Arrow = sort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "sticky top-0 z-10 bg-chat px-1 py-1 text-left font-semibold",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-meta font-semibold text-muted transition-colors",
          "hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-focus",
          ariaSort !== "none" && "text-primary",
        )}
      >
        {children}
        {ariaSort !== "none" ? (
          <Arrow aria-hidden="true" className="size-3.5" />
        ) : null}
      </button>
    </th>
  );
};

interface NodesTableRowProps {
  row: NodeRow;
  rowIndex: number;
  selected: boolean;
  hasError: boolean;
  labels: NodeLabels;
  onSelect: (num: number) => void;
  onMessage: (num: number) => void;
}

/**
 * One node. Memoised: with stable row objects and callbacks, an update to
 * one node re-renders only that node's row.
 */
export const NodesTableRow = memo(function NodesTableRow({
  row,
  rowIndex,
  selected,
  hasError,
  labels,
  onSelect,
  onMessage,
}: NodesTableRowProps) {
  const { t } = useTranslation("nodes");
  return (
    <tr
      aria-rowindex={rowIndex}
      onClick={() => onSelect(row.num)}
      className={cn(
        "h-14 cursor-pointer transition-colors",
        selected ? "bg-selected" : "bg-surface hover:bg-raised/60",
        row.unheardOnCurrentLora && "opacity-70",
      )}
    >
      <th
        scope="row"
        // Below xl the name column takes what the others leave and
        // truncates, so the table fits a tablet without scrolling sideways.
        className={cn(
          cellPad,
          "rounded-l-control text-left font-normal max-xl:w-full max-xl:max-w-0",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <NodeRowAvatar row={row} />
          <span className="flex min-w-0 flex-col gap-px">
            <span className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                data-node-num={row.num}
                aria-current={selected || undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(row.num);
                }}
                className="min-w-0 cursor-pointer truncate rounded-sm text-left font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {row.name}
              </button>
              {row.isFavorite ? (
                <span className="sr-only">{t("value.favorite")}</span>
              ) : null}
              {row.isIgnored ? (
                <span className="rounded-full bg-raised px-1.5 text-meta text-muted">
                  {t("value.ignored")}
                </span>
              ) : null}
              {hasError ? (
                <>
                  <TriangleAlertIcon
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-danger"
                  />
                  <span className="sr-only">{t("nodeDetail.error.label")}</span>
                </>
              ) : null}
              <NodeTrustIndicators
                node={{
                  num: row.num,
                  isMuted: row.isMuted,
                  hasXeddsaSigned: row.hasXeddsaSigned,
                  viaMqtt: row.viaMqtt,
                  heardOnCurrentLora: !row.unheardOnCurrentLora,
                }}
                size={13}
              />
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
              {row.publicKey ? (
                <LockIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 text-accent"
                />
              ) : (
                <LockOpenIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 text-warning"
                />
              )}
              <span className="sr-only">
                {row.publicKey ? t("value.encrypted") : t("value.notEncrypted")}
              </span>
              <span className="max-w-md truncate" title={row.status}>
                {row.shortName ? `${row.shortName} · ` : ""}
                <span className="font-mono">{row.id}</span>
                {row.status ? (
                  <>
                    {" · "}
                    <span className="sr-only">
                      {t("trust.statusMessage.label")}:{" "}
                    </span>
                    <span className="text-secondary">{row.status}</span>
                  </>
                ) : null}
              </span>
            </span>
          </span>
        </span>
      </th>
      <td className={cn(cellPad, "hidden text-secondary 2xl:table-cell")}>
        {row.role ?? labels.notAvailable}
      </td>
      <td className={cn(cellPad, "hidden text-secondary 2xl:table-cell")}>
        {row.hardware ?? labels.notAvailable}
      </td>
      <td className={cn(cellPad, "whitespace-nowrap text-secondary")}>
        {labels.hops(row)}
      </td>
      <td
        className={cn(
          cellPad,
          "text-right whitespace-nowrap text-secondary tabular-nums",
        )}
      >
        {labels.snr(row)}
      </td>
      <td
        className={cn(
          cellPad,
          "hidden text-right whitespace-nowrap text-secondary tabular-nums xl:table-cell",
        )}
      >
        {labels.battery(row)}
      </td>
      <td
        className={cn(
          cellPad,
          "hidden text-right whitespace-nowrap text-secondary tabular-nums lg:table-cell",
        )}
      >
        {labels.distance(row)}
      </td>
      <td className={cn(cellPad, "whitespace-nowrap text-secondary")}>
        <span className="flex items-center gap-2">
          <StatusDot status={row.isOnline ? "online" : "offline"} size="sm" />
          <LastHeardText row={row} />
        </span>
      </td>
      <td className={cn(cellPad, "rounded-r-control text-right")}>
        {row.isMessageable ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label={t("value.messageNode", { name: row.name })}
            onClick={(event) => {
              event.stopPropagation();
              onMessage(row.num);
            }}
          >
            {t("button.message")}
          </Button>
        ) : null}
      </td>
    </tr>
  );
});

const COLUMN_COUNT = COLUMNS.length + 2;

/** Stands in for the rows scrolled out of the window, keeping the height. */
const SpacerRow = ({ height }: { height: number }) => (
  <tr aria-hidden="true" style={{ height }}>
    <td colSpan={COLUMN_COUNT} className="p-0">
      {/* Empty: only the height matters. */}
      <span className="sr-only">&nbsp;</span>
    </td>
  </tr>
);

/**
 * Known nodes as a sortable table. Rows are fixed-height and windowed, so
 * a mesh of a thousand nodes renders a screenful at a time. A row is
 * selected with its name button (or a click anywhere on it); Message opens
 * the direct conversation.
 */
export const NodesTable = ({
  rows,
  sort,
  onSort,
  selectedNum,
  onSelect,
  onMessage,
  labels,
  errorNums,
  label,
  className,
}: NodesTableProps) => {
  const { t } = useTranslation("nodes");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Rows get labels that change only with the language; the clock-bound
  // text reaches its cells through LiveLabels.
  const [rowLabels, setRowLabels] = useState(labels);
  if (
    rowLabels.locale !== labels.locale ||
    rowLabels.notAvailable !== labels.notAvailable
  ) {
    setRowLabels(labels);
  }
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const measure = () => setViewportHeight(element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const range = visibleRange({
    count: rows.length,
    rowHeight: NODE_ROW_PITCH,
    scrollTop,
    viewportHeight,
  });

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className={cn("min-h-0 overflow-auto", className)}
    >
      <LiveLabels.Provider value={labels}>
        <TrustTooltipProvider>
          <table
            aria-label={label}
            aria-rowcount={rows.length + 1}
            className="w-full border-separate border-spacing-y-0.5 text-body"
          >
            <thead>
              <tr aria-rowindex={1}>
                <SortHeader column="name" sort={sort} onSort={onSort}>
                  {t("column.node")}
                </SortHeader>
                {COLUMNS.map((column) => (
                  <SortHeader
                    key={column.key}
                    column={column.key}
                    sort={sort}
                    onSort={onSort}
                    className={cn(
                      column.visibility,
                      column.align && "text-right",
                    )}
                  >
                    {t(`column.${column.key}`)}
                  </SortHeader>
                ))}
                <th
                  scope="col"
                  className={cn(cellPad, "sticky top-0 z-10 bg-chat")}
                >
                  <span className="sr-only">{t("column.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {range.padTop > 0 ? <SpacerRow height={range.padTop} /> : null}
              {rows.slice(range.start, range.end).map((row, offset) => (
                <NodesTableRow
                  key={row.num}
                  row={row}
                  rowIndex={range.start + offset + 2}
                  selected={row.num === selectedNum}
                  hasError={errorNums?.has(row.num) ?? false}
                  labels={rowLabels}
                  onSelect={onSelect}
                  onMessage={onMessage}
                />
              ))}
              {range.padBottom > 0 ? (
                <SpacerRow height={range.padBottom} />
              ) : null}
            </tbody>
          </table>
        </TrustTooltipProvider>
      </LiveLabels.Provider>
    </div>
  );
};
