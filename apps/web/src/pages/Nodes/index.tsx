import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { NodeDetailsPanel } from "@components/Nodes/NodeDetailsPanel.tsx";
import { NodeFilterBar } from "@components/Nodes/NodeFilterBar.tsx";
import { NodeList } from "@components/Nodes/NodeList.tsx";
import { NodeResponseDialogs } from "@components/Nodes/NodeResponseDialogs.tsx";
import { NodesTable } from "@components/Nodes/NodesTable.tsx";
import { useCollator } from "@components/Nodes/useCollator.ts";
import { useAdminAccess } from "@components/Nodes/useAdminAccess.ts";
import { useNodeActions } from "@components/Nodes/useNodeActions.ts";
import { useNodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { useNodeRows } from "@components/Nodes/useNodeRows.ts";
import {
  DETAILS_PANEL_STORAGE_KEY,
  ShellPage,
} from "@components/Shell/ShellPage.tsx";
import { Button } from "@components/UI/Button.tsx";
import { EmptyState } from "@components/UI/EmptyState.tsx";
import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useNodeErrors } from "@core/kmp/hooks";
import {
  countByQuickFilter,
  matchesNodeSearch,
  matchesQuickFilter,
  type NodeQuickFilter,
  toggleQuickFilter,
} from "@core/nodes/nodeFilters.ts";
import { summarizeNodes } from "@core/nodes/nodeRow.ts";
import {
  NODE_SORT_INITIAL_DIRECTION,
  type NodeListSort,
  sortNodeRows,
} from "@core/nodes/nodeSort.ts";
import { nextSortState } from "@core/nodes/sort.ts";
import { useAppStore } from "@core/stores";
import { useNavigate } from "@tanstack/react-router";
import { FunnelIcon, InfoIcon, UsersIcon } from "lucide-react";
import {
  type JSX,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const readBoolean = (value: string): boolean => value === "true";

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation("nodes");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { rows, sources, now } = useNodeRows();
  const labels = useNodeLabels(now);
  const errors = useNodeErrors();

  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<NodeQuickFilter>("all");
  // Kept as an app preference, so the order survives reloads.
  const sort = useAppStore((state) => state.nodeListSorts.nodes);
  const setNodeListSort = useAppStore((state) => state.setNodeListSort);
  const setSort = useCallback(
    (next: NodeListSort) => setNodeListSort("nodes", next),
    [setNodeListSort],
  );
  const [selectedNum, setSelectedNum] = useState<number | undefined>();
  // Tablets show the details panel as a drawer; picking a row opens it.
  const [detailsRequest, setDetailsRequest] = useState(0);
  // Row to focus when the mobile list comes back from a node's details.
  const [returnFocusNum, setReturnFocusNum] = useState<number | undefined>();
  // Shared with ShellPage: selecting a node reopens a hidden details column.
  const [, setDetailsOpen] = useLocalStorage<boolean>(
    DETAILS_PANEL_STORAGE_KEY,
    true,
    { serializer: String, deserializer: readBoolean },
  );

  const deferredFilterState = useDeferredValue(filterState);
  const deferredSearch = useDeferredValue(search);
  const filtersDirty = isFilterDirty(filterState);

  const errorNums = useMemo(
    () => new Set(errors.map((error) => error.node)),
    [errors],
  );
  const collator = useCollator();

  // Search and the advanced filters narrow the set the chips count.
  const searchedRows = useMemo(() => {
    const passing = new Set(
      sources
        .filter((node) => nodeFilter(node, deferredFilterState))
        .map((node) => node.num),
    );
    return rows.filter(
      (row) => passing.has(row.num) && matchesNodeSearch(row, deferredSearch),
    );
  }, [rows, sources, nodeFilter, deferredFilterState, deferredSearch]);

  const counts = useMemo(
    () => countByQuickFilter(searchedRows),
    [searchedRows],
  );
  const visibleRows = useMemo(
    () =>
      sortNodeRows(
        searchedRows.filter((row) => matchesQuickFilter(row, quickFilter)),
        sort,
        collator,
      ),
    [searchedRows, quickFilter, sort, collator],
  );
  const summary = useMemo(() => summarizeNodes(rows), [rows]);

  // Looked up among all nodes, so the selection survives filtering.
  const selectedRow = rows.find((row) => row.num === selectedNum);
  const actions = useNodeActions(selectedRow);
  const adminAccess = useAdminAccess(selectedRow);

  // Stable, so the memoised table rows don't re-render on every update.
  const selectNode = useCallback(
    (num: number) => {
      setSelectedNum(num);
      if (!isMobile) {
        setDetailsOpen(true);
        setDetailsRequest((request) => request + 1);
      }
    },
    [isMobile, setDetailsOpen],
  );

  // Direct-message route; keep in step with useNodeActions.message.
  const messageNode = useCallback(
    (num: number) => {
      void navigate({
        to: "/messages/$type/$chatId",
        params: { type: "direct", chatId: num },
      });
    },
    [navigate],
  );

  const backToList = () => {
    setReturnFocusNum(selectedNum);
    setSelectedNum(undefined);
  };

  const clearFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setFilterState(defaultFilterValues);
  };

  const title = t("navigation.nodes", { ns: "ui" });

  const details = isMobile ? undefined : selectedRow ? (
    <NodeDetailsPanel
      row={selectedRow}
      labels={labels}
      actions={actions}
      adminAccess={adminAccess}
      hasError={errorNums.has(selectedRow.num)}
    />
  ) : (
    <EmptyState
      icon={<InfoIcon className="size-8" />}
      title={t("details.label")}
      description={t("page.selectPrompt")}
      className="px-4 pt-16"
    />
  );

  const moreFilters = (
    <FilterControl
      filterState={filterState}
      defaultFilterValues={defaultFilterValues}
      setFilterState={setFilterState}
      isDirty={filtersDirty}
      parameters={{
        popoverContentProps: { side: "bottom", align: "end", sideOffset: 8 },
        popoverTriggerClassName: [
          "relative flex size-9 items-center justify-center rounded-control border border-input pointer-coarse:touch-target",
          "bg-app text-muted hover:bg-raised hover:text-primary active:bg-raised",
          "dark:bg-app dark:text-muted hover:dark:bg-raised hover:dark:text-primary dark:active:bg-raised",
          "focus-visible:outline-2 focus-visible:outline-focus",
          filtersDirty
            ? "border-accent bg-accent-tint text-accent dark:bg-accent-tint dark:text-accent hover:bg-accent-tint hover:dark:bg-accent-tint"
            : "",
        ].join(" "),
        triggerIcon: <FunnelIcon aria-hidden="true" className="size-4" />,
        showTextSearch: false,
      }}
    />
  );

  const list =
    rows.length === 0 ? (
      <EmptyState
        icon={<UsersIcon className="size-8" />}
        title={t("page.noNodes")}
        description={t("page.noNodesDescription")}
        className="pt-16"
      />
    ) : visibleRows.length === 0 ? (
      <EmptyState
        title={t("page.noMatches")}
        description={t("page.noMatchesDescription")}
        className="pt-16"
      >
        <Button variant="secondary" onClick={clearFilters}>
          {t("page.clearFilters")}
        </Button>
      </EmptyState>
    ) : isMobile ? (
      <NodeList
        rows={visibleRows}
        selectedNum={selectedNum}
        onSelect={selectNode}
        labels={labels}
        label={t("page.tableLabel")}
        errorNums={errorNums}
        focusNum={returnFocusNum}
      />
    ) : (
      <NodesTable
        rows={visibleRows}
        sort={sort}
        onSort={(key) =>
          setSort({
            ...nextSortState(sort, key, NODE_SORT_INITIAL_DIRECTION),
            favoritesFirst: sort.favoritesFirst,
          })
        }
        selectedNum={selectedNum}
        onSelect={selectNode}
        onMessage={messageNode}
        labels={labels}
        errorNums={errorNums}
        label={t("page.tableLabel")}
        className="flex-1 px-1 pb-3 md:px-3"
      />
    );

  return (
    <ShellPage
      label={title}
      details={details}
      detailsLabel={t("details.label")}
      detailsDrawerRequest={detailsRequest}
      noPadding
    >
      <h1 className="sr-only">{title}</h1>
      {/* The details column changes without moving focus; say so. */}
      <output aria-live="polite" className="sr-only">
        {!isMobile && selectedRow
          ? t("page.detailsShown", { name: selectedRow.name })
          : ""}
      </output>
      {isMobile && selectedRow ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <NodeDetailsPanel
            row={selectedRow}
            labels={labels}
            actions={actions}
            adminAccess={adminAccess}
            hasError={errorNums.has(selectedRow.num)}
            onBack={backToList}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3.5 border-b border-subtle px-3 pt-4 pb-3 md:px-6">
            <p className="m-0 text-body text-muted">
              {t("page.summary", {
                known: summary.known,
                recent: summary.heardRecently,
              })}
            </p>
            <NodeFilterBar
              search={search}
              onSearchChange={setSearch}
              quickFilter={quickFilter}
              onQuickFilterChange={(filter) =>
                setQuickFilter((current) => toggleQuickFilter(current, filter))
              }
              counts={counts}
              sortKey={sort.key}
              onSortKeyChange={(key) =>
                setSort({
                  key,
                  direction: NODE_SORT_INITIAL_DIRECTION[key],
                  favoritesFirst: sort.favoritesFirst,
                })
              }
              favoritesFirst={sort.favoritesFirst}
              onFavoritesFirstChange={(favoritesFirst) =>
                setSort({ ...sort, favoritesFirst })
              }
              moreFilters={moreFilters}
            />
          </div>
          {isMobile || visibleRows.length === 0 ? (
            <div className="min-h-0 flex-1 overflow-auto px-1 pb-3 md:px-3">
              {list}
            </div>
          ) : (
            list
          )}
        </>
      )}
      <NodeResponseDialogs />
    </ShellPage>
  );
};

export default NodesPage;
