import { useLanguage } from "@app/shared/hooks/useLanguage.ts";
import { SignalIndicator } from "@app/shared/index.ts";
import { useNodes, useOnlineNodes, usePreference } from "@data/hooks";
import { Protobuf, type Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { LocationResponseDialog } from "@shared/components/Dialog/LocationResponseDialog.tsx";
import { TracerouteResponseDialog } from "@shared/components/Dialog/TracerouteResponseDialog.tsx";
import { FilterControl } from "@shared/components/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@shared/components/Filter/useFilterNode.ts";
import { Mono } from "@shared/components/Mono.tsx";
import { NodeAvatar } from "@shared/components/NodeAvatar.tsx";
import { TimeAgo } from "@shared/components/TimeAgo.tsx";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Input } from "@shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { cn } from "@shared/utils/cn";
import {
  DEFAULT_PREFERENCES,
  type NodeColumnKey,
  useDevice,
  useUIStore,
} from "@state/index.ts";
import { useMyNode } from "@shared/hooks/useMyNode";
import type { Node } from "@data/schema";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  GripVertical,
  LockIcon,
  LockOpenIcon,
} from "lucide-react";
import {
  type JSX,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { sortNodes } from "../utils/nodeSort.ts";

type SortColumn =
  | "longName"
  | "connection"
  | "lastHeard"
  | "snr"
  | "model"
  | "macAddress"
  | null;
type SortOrder = "asc" | "desc";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SortIcon = ({
  column,
  sortOrder,
  sortColumn,
}: {
  column: SortColumn;
  sortOrder: SortOrder;
  sortColumn: SortColumn;
}) => {
  if (sortColumn !== column) {
    return null;
  }
  return sortOrder === "asc" ? (
    <ArrowUpIcon className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDownIcon className="ml-2 h-4 w-4" />
  );
};

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation("nodes");
  const { current } = useLanguage();
  const { hardware, connection, setDialogOpen } = useDevice();
  const { myNodeNum } = useMyNode();
  const { nodes: allNodes } = useNodes(myNodeNum);
  const { nodes: onlineNodes } = useOnlineNodes(myNodeNum);

  // Create a Set of online node numbers for O(1) lookup
  const onlineNodeNums = useMemo(
    () => new Set(onlineNodes.map((n) => n.nodeNum)),
    [onlineNodes],
  );

  const { setNodeNumDetails } = useUIStore();

  const [columnVisibility, setColumnVisibility] = usePreference<
    Record<NodeColumnKey, boolean>
  >(
    "nodesTableColumnVisibility",
    DEFAULT_PREFERENCES.nodesTableColumnVisibility,
  );

  const [columnOrder, setColumnOrder] = usePreference<NodeColumnKey[]>(
    "nodesTableColumnOrder",
    DEFAULT_PREFERENCES.nodesTableColumnOrder,
  );
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();

  const [selectedTraceroute, setSelectedTraceroute] = useState<
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined
  >();
  const [selectedLocation, setSelectedLocation] = useState<
    Types.PacketMetadata<Protobuf.Mesh.Position> | undefined
  >();

  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);

  const [sortColumn, setSortColumn] = useState<SortColumn>("lastHeard");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [draggedColumn, setDraggedColumn] = useState<NodeColumnKey | null>(
    null,
  );

  const handleDragStart = useCallback((column: NodeColumnKey) => {
    setDraggedColumn(column);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetColumn: NodeColumnKey) => {
      if (!draggedColumn || draggedColumn === targetColumn) {
        setDraggedColumn(null);
        return;
      }

      const newOrder = [...columnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumn);

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      void setColumnOrder(newOrder);
      setDraggedColumn(null);
    },
    [draggedColumn, columnOrder, setColumnOrder],
  );

  // Column for sorting
  const columnConfig: Record<
    NodeColumnKey,
    {
      label: string;
      sortable: boolean;
      sortKey?: SortColumn;
      render: (node: Node) => React.ReactNode;
    }
  > = useMemo(
    () => ({
      encryption: {
        label: t("nodesTable.headings.encryption"),
        sortable: false,
        render: (node) => (
          <div className="text-center">
            {node.publicKey && node.publicKey.length > 0 ? (
              <LockIcon className="h-4 w-4 text-green-600 dark:text-green-500 mx-auto" />
            ) : (
              <LockOpenIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mx-auto" />
            )}
          </div>
        ),
      },
      lastHeard: {
        label: t("nodesTable.headings.lastHeard"),
        sortable: true,
        sortKey: "lastHeard",
        render: (node) => (
          <Mono className="text-xs md:text-sm">
            {node.lastHeard === null ? (
              t("unknown.longName")
            ) : (
              <TimeAgo
                timestamp={node.lastHeard.getTime()}
                locale={current?.code}
              />
            )}
          </Mono>
        ),
      },
      signal: {
        label: t("nodesTable.headings.signal"),
        sortable: true,
        sortKey: "snr",
        render: (node) => {
          const snr = node.snr ?? 0;
          if (snr === 0 && node.lastHeard === null) {
            return <Mono className="text-xs md:text-sm">—</Mono>;
          }
          // Use a default RSSI estimate based on SNR for grading
          const estimatedRssi = snr > 0 ? -60 : snr > -10 ? -90 : -120;
          return (
            <div className="flex flex-col gap-0.5">
              <SignalIndicator
                snr={snr}
                rssi={estimatedRssi}
                showLabel={true}
              />
              <Mono className="text-xs text-muted-foreground">
                {snr.toFixed(1)} dB
              </Mono>
            </div>
          );
        },
      },
      battery: {
        label: t("nodesTable.headings.battery"),
        sortable: false,
        render: (node) => {
          const batteryLevel = node.batteryLevel;
          const voltage = node.voltage;
          const text =
            batteryLevel !== null && batteryLevel > 0
              ? `${batteryLevel}% ${voltage !== null ? `${voltage.toFixed(2)}V` : ""}`
              : voltage !== null
                ? `${voltage.toFixed(2)}V`
                : node.voltage === 0
                  ? "PWD"
                  : "—";
          return <Mono className="text-xs md:text-sm">{text}</Mono>;
        },
      },
      altitude: {
        label: t("nodesTable.headings.altitude"),
        sortable: false,
        render: (node) => {
          const altitude = node.altitude;
          const text = altitude !== null ? `${altitude} m MSL` : "—";
          return <Mono className="text-xs md:text-sm">{text}</Mono>;
        },
      },
      hops: {
        label: t("nodesTable.headings.hopsAway"),
        sortable: true,
        sortKey: "connection",
        render: (_node) => (
          // hopsAway and viaMqtt not available in Node schema - would need to add if needed
          <Mono className="text-xs md:text-sm">—</Mono>
        ),
      },
      temp: {
        label: t("nodesTable.headings.temp"),
        sortable: false,
        render: (_node) => {
          // Environment metrics not stored in nodes table, available via telemetryLogs
          const text = "—";
          return <Mono className="text-xs md:text-sm">{text}</Mono>;
        },
      },
      chUtil: {
        label: t("nodesTable.headings.chUtil"),
        sortable: false,
        render: (node) => {
          const chUtil = node.channelUtilization;
          const airUtil = node.airUtilTx;
          const text =
            chUtil !== null || airUtil !== null
              ? `Ch ${chUtil?.toFixed(1) ?? "—"}%${airUtil !== null ? ` / Air ${airUtil.toFixed(1)}%` : ""}`
              : "—";
          return <Mono className="text-xs md:text-sm">{text}</Mono>;
        },
      },
      model: {
        label: t("nodesTable.headings.model"),
        sortable: true,
        sortKey: "model",
        render: (node) => (
          <Mono className="text-xs md:text-sm">
            {node.hwModel !== null
              ? Protobuf.Mesh.HardwareModel[node.hwModel]
              : "—"}
          </Mono>
        ),
      },
      role: {
        label: t("nodesTable.headings.role"),
        sortable: false,
        render: (node) => {
          const role = node.role
            ? Protobuf.Config.Config_DeviceConfig_Role[node.role]
            : "—";
          return <Mono className="text-xs md:text-sm">{role}</Mono>;
        },
      },
      nodeId: {
        label: t("nodesTable.headings.nodeId"),
        sortable: false,
        render: (node) => {
          const nodeId = `!${numberToHexUnpadded(node.nodeNum)}`;
          return <Mono className="text-xs md:text-sm">{nodeId}</Mono>;
        },
      },
    }),
    [t, current?.code],
  );

  // Apply filter to nodes (now using NodeDTO directly)
  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => nodeFilter(node, deferredFilterState));
  }, [allNodes, nodeFilter, deferredFilterState]);

  // Stub for hasNodeError - no longer tracking node errors
  const hasNodeError = useCallback((_nodeNum: number) => false, []);

  const handleTraceroute = useCallback(
    (traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>) => {
      setSelectedTraceroute(traceroute);
    },
    [],
  );

  const handleLocation = useCallback(
    (location: Types.PacketMetadata<Protobuf.Mesh.Position>) => {
      if (
        location.to.valueOf() !== hardware.myNodeNum ||
        location.from.valueOf() === hardware.myNodeNum
      ) {
        return;
      }
      setSelectedLocation(location);
    },
    [hardware.myNodeNum],
  );

  function handleNodeInfoDialog(nodeNum: number): void {
    setNodeNumDetails(nodeNum);
    setDialogOpen("nodeDetails", true);
  }

  useEffect(() => {
    if (!connection) {
      return;
    }
    connection.events.onTraceRoutePacket.subscribe(handleTraceroute);
    return () => {
      connection.events.onTraceRoutePacket.unsubscribe(handleTraceroute);
    };
  }, [connection, handleTraceroute]);

  useEffect(() => {
    if (!connection) {
      return;
    }
    connection.events.onPositionPacket.subscribe(handleLocation);
    return () => {
      connection.events.onPositionPacket.unsubscribe(handleLocation);
    };
  }, [connection, handleLocation]);

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortColumn(column);
        setSortOrder("asc");
      }
    },
    [sortColumn, sortOrder],
  );

  const getName = useCallback(
    (node: Node) =>
      node.longName ||
      numberToHexUnpadded(node.nodeNum).slice(-4).toUpperCase(),
    [],
  );

  const sortedNodes = useMemo(() => {
    // Default sort: Favorites (A-Z) -> Recently heard (by lastHeard desc) -> Never heard (A-Z)
    if (!sortColumn || sortColumn === "lastHeard") {
      return sortNodes(filteredNodes, {
        getName,
        getLastHeard: (n) => n.lastHeard?.getTime() ?? 0,
        isFavorite: (n) => n.isFavorite,
      });
    }

    // Column-specific sorting (favorites still on top)
    return [...filteredNodes].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "longName":
          aValue = getName(a);
          bValue = getName(b);
          break;
        case "connection":
          // hopsAway not available in Node schema
          aValue = Number.MAX_SAFE_INTEGER;
          bValue = Number.MAX_SAFE_INTEGER;
          break;
        case "snr":
          aValue = a.snr ?? 0;
          bValue = b.snr ?? 0;
          break;
        case "model":
          aValue = Protobuf.Mesh.HardwareModel[a.hwModel ?? 0] ?? "UNSET";
          bValue = Protobuf.Mesh.HardwareModel[b.hwModel ?? 0] ?? "UNSET";
          break;
        case "macAddress":
          // macaddr is stored as hex string in schema
          aValue = a.macaddr?.match(/.{1,2}/g)?.join(":") ?? "";
          bValue = b.macaddr?.match(/.{1,2}/g)?.join(":") ?? "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredNodes, sortColumn, sortOrder, getName]);

  return (
    <div className="p-6 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("nodesPage.title")}</h1>
        <p className="text-muted-foreground">{t("nodesPage.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle>{t("nodesPage.tableTitle")}</CardTitle>
              <CardDescription>
                {t("nodesPage.nodeCount", { count: sortedNodes.length })}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                type="search"
                placeholder={t("search.nodes")}
                value={filterState.nodeName}
                className="max-w-xs"
                showClearButton={!!filterState.nodeName}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    nodeName: e.target.value,
                  }))
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3Icon className="mr-2 h-4 w-4" />
                    {t("nodesTable.columns")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    {t("nodesTable.toggleColumns")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.encryption}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        encryption: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.encryption")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastHeard}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        lastHeard: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.lastHeard")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.signal}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        signal: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.signal")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.battery}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        battery: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.battery")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.altitude}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        altitude: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.altitude")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.hops}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        hops: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.hopsAway")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.temp}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        temp: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.temp")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.chUtil}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        chUtil: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.chUtil")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.model}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        model: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.model")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.role}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        role: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.role")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.nodeId}
                    onCheckedChange={(checked) =>
                      void setColumnVisibility({
                        ...columnVisibility,
                        nodeId: checked,
                      })
                    }
                  >
                    {t("nodesTable.headings.nodeId")}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <FilterControl
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                setFilterState={setFilterState}
                isDirty={isFilterDirty(filterState)}
                parameters={{
                  popoverContentProps: {
                    side: "bottom",
                    align: "end",
                    sideOffset: 12,
                  },
                  showTextSearch: false,
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("longName")}
                >
                  <div className="flex items-center">
                    {t("nodesTable.headings.longName")}
                    <SortIcon
                      column="longName"
                      sortOrder={sortOrder}
                      sortColumn={sortColumn}
                    />
                  </div>
                </TableHead>
                {columnOrder.map((columnKey) => {
                  if (!columnVisibility[columnKey]) {
                    return null;
                  }

                  const column = columnConfig[columnKey];

                  return (
                    <TableHead
                      key={columnKey}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(columnKey)}
                      className={cn(
                        column.sortable && "cursor-pointer select-none",
                        draggedColumn === columnKey && "opacity-50",
                      )}
                      onClick={() =>
                        column.sortable &&
                        column.sortKey &&
                        handleSort(column.sortKey)
                      }
                    >
                      <div className="flex items-center gap-1">
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(columnKey);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-grab active:cursor-grabbing p-1 -m-1 hover:bg-muted rounded"
                        >
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span>{column.label}</span>
                        {column.sortable && column.sortKey && (
                          <SortIcon
                            column={column.sortKey}
                            sortOrder={sortOrder}
                            sortColumn={sortColumn}
                          />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      2 + Object.values(columnVisibility).filter(Boolean).length
                    }
                    className="text-center py-8"
                  >
                    <p className="text-muted-foreground">
                      {t("nodesPage.noNodes")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedNodes.map((node) => {
                  const shortName =
                    node.shortName ||
                    numberToHexUnpadded(node.nodeNum).slice(-4).toUpperCase();
                  const longName =
                    node.longName ||
                    t("fallbackName", {
                      last4: shortName,
                    });

                  return (
                    <TableRow
                      key={node.nodeNum}
                      className={cn(
                        node.isFavorite &&
                          "bg-yellow-50/50 dark:bg-yellow-900/10",
                      )}
                    >
                      <TableCell>
                        <NodeAvatar
                          nodeNum={node.nodeNum}
                          showFavorite={node.isFavorite}
                          showError={hasNodeError(node.nodeNum)}
                          showOnline={onlineNodeNums.has(node.nodeNum)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleNodeInfoDialog(node.nodeNum)}
                          className="hover:underline text-left font-medium"
                          type="button"
                        >
                          {longName}
                        </button>
                      </TableCell>
                      {columnOrder.map((columnKey) => {
                        if (!columnVisibility[columnKey]) {
                          return null;
                        }
                        const column = columnConfig[columnKey];
                        return (
                          <TableCell key={columnKey}>
                            {column.render(node)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TracerouteResponseDialog />
      <LocationResponseDialog
        location={selectedLocation}
        open={!!selectedLocation}
        onOpenChange={(open) => !open && setSelectedLocation(undefined)}
      />
    </div>
  );
};

export default NodesPage;
