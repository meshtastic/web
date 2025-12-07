import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog.tsx";
import { NodeAvatar } from "@app/components/NodeAvatar";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Badge } from "@components/ui/badge.tsx";
import { Button } from "@components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu.tsx";
import { Input } from "@components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table.tsx";
import useLang from "@core/hooks/useLang.ts";
import {
  type NodeColumnKey,
  useAppStore,
  useDevice,
  useNodeDB,
  usePreferencesStore,
} from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
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
import { base16 } from "rfc4648";

const NODEDB_DEBOUNCE_MS = 250;

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

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation("nodes");
  const { current } = useLang();
  const { hardware, connection, setDialogOpen } = useDevice();

  const { setNodeNumDetails } = useAppStore();
  const {
    nodesTableColumnVisibility: columnVisibility,
    nodesTableColumnOrder: columnOrder,
    setNodesTableColumnVisibility: setColumnVisibility,
    setNodesTableColumnOrder: setColumnOrder,
  } = usePreferencesStore();
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

  // Drag and drop handlers
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

      setColumnOrder(newOrder);
      setDraggedColumn(null);
    },
    [draggedColumn, columnOrder, setColumnOrder],
  );

  // Column configuration
  const columnConfig: Record<
    NodeColumnKey,
    {
      label: string;
      sortable: boolean;
      sortKey?: SortColumn;
      render: (node: Protobuf.Mesh.NodeInfo) => React.ReactNode;
    }
  > = useMemo(
    () => ({
      encryption: {
        label: t("nodesTable.headings.encryption"),
        sortable: false,
        render: (node) => (
          <div className="text-center">
            {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
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
          <Mono className="text-xs">
            {node.lastHeard === 0 ? (
              t("unknown.longName")
            ) : (
              <TimeAgo
                timestamp={node.lastHeard * 1000}
                locale={current?.code}
              />
            )}
          </Mono>
        ),
      },
      battery: {
        label: t("nodesTable.headings.battery"),
        sortable: false,
        render: (node) => {
          const batteryLevel = node.deviceMetrics?.batteryLevel;
          const voltage = node.deviceMetrics?.voltage;
          const text =
            batteryLevel !== undefined && batteryLevel > 0
              ? `${batteryLevel}% ${voltage ? `${voltage.toFixed(2)}V` : ""}`
              : voltage
                ? `${voltage.toFixed(2)}V`
                : node.deviceMetrics?.voltage === 0
                  ? "PWD"
                  : "—";
          return <Mono className="text-xs">{text}</Mono>;
        },
      },
      altitude: {
        label: t("nodesTable.headings.altitude"),
        sortable: false,
        render: (node) => {
          const altitude = node.position?.altitude;
          const text = altitude ? `${altitude} m MSL` : "—";
          return <Mono className="text-xs">{text}</Mono>;
        },
      },
      hops: {
        label: t("nodesTable.headings.hopsAway"),
        sortable: true,
        sortKey: "connection",
        render: (node) => (
          <Mono className="text-xs">
            {node.hopsAway !== undefined
              ? node?.viaMqtt === false && node.hopsAway === 0
                ? t("nodesTable.connectionStatus.direct")
                : `${node.hopsAway}`
              : "—"}
            {node?.viaMqtt === true && (
              <Badge variant="secondary" className="ml-2">
                MQTT
              </Badge>
            )}
          </Mono>
        ),
      },
      temp: {
        label: t("nodesTable.headings.temp"),
        sortable: false,
        render: (node) => {
          const temp = node.environmentMetrics?.temperature;
          const text = temp !== undefined ? `${temp.toFixed(1)}°C` : "—";
          return <Mono className="text-xs">{text}</Mono>;
        },
      },
      chUtil: {
        label: t("nodesTable.headings.chUtil"),
        sortable: false,
        render: (node) => {
          const chUtil = node.deviceMetrics?.channelUtilization;
          const airUtil = node.deviceMetrics?.airUtilTx;
          const text =
            chUtil !== undefined || airUtil !== undefined
              ? `Ch ${chUtil?.toFixed(1) ?? "—"}%${airUtil !== undefined ? ` / Air ${airUtil.toFixed(1)}%` : ""}`
              : "—";
          return <Mono className="text-xs">{text}</Mono>;
        },
      },
      model: {
        label: t("nodesTable.headings.model"),
        sortable: true,
        sortKey: "model",
        render: (node) => (
          <Mono className="text-xs">
            {Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}
          </Mono>
        ),
      },
      role: {
        label: t("nodesTable.headings.role"),
        sortable: false,
        render: (node) => {
          const role = node.user?.role
            ? Protobuf.Config.Config_DeviceConfig_Role[node.user.role]
            : "—";
          return <Mono className="text-xs">{role}</Mono>;
        },
      },
      nodeId: {
        label: t("nodesTable.headings.nodeId"),
        sortable: false,
        render: (node) => {
          const nodeId = `!${numberToHexUnpadded(node.num)}`;
          return <Mono className="text-xs">{nodeId}</Mono>;
        },
      },
    }),
    [t, current?.code],
  );

  // stable predicate so the selector identity doesn't thrash
  const predicate = useCallback(
    (node: Protobuf.Mesh.NodeInfo) => nodeFilter(node, deferredFilterState),
    [nodeFilter, deferredFilterState],
  );

  // subscribe to actual data (nodes array) and to nodeErrors ref for badge updates
  const { nodes: filteredNodes, hasNodeError } = useNodeDB(
    (db) => ({
      nodes: db.getNodes(predicate, true),
      hasNodeError: db.hasNodeError,
      _errorsRef: db.nodeErrors, // include the Map ref so UI also re-renders on error changes
    }),
    { debounce: NODEDB_DEBOUNCE_MS },
  );

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

  const sortedNodes = useMemo(() => {
    if (!sortColumn) {
      return filteredNodes;
    }

    return [...filteredNodes].sort((a, b) => {
      // Favorites always on top
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }

      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "longName":
          aValue =
            a.user?.longName ??
            numberToHexUnpadded(a.num).slice(-4).toUpperCase();
          bValue =
            b.user?.longName ??
            numberToHexUnpadded(b.num).slice(-4).toUpperCase();
          break;
        case "connection":
          aValue = a.hopsAway ?? Number.MAX_SAFE_INTEGER;
          bValue = b.hopsAway ?? Number.MAX_SAFE_INTEGER;
          break;
        case "lastHeard":
          aValue = a.lastHeard;
          bValue = b.lastHeard;
          break;
        case "snr":
          aValue = a.snr;
          bValue = b.snr;
          break;
        case "model":
          aValue = Protobuf.Mesh.HardwareModel[a.user?.hwModel ?? 0] ?? "UNSET";
          bValue = Protobuf.Mesh.HardwareModel[b.user?.hwModel ?? 0] ?? "UNSET";
          break;
        case "macAddress":
          aValue =
            base16
              .stringify(a.user?.macaddr ?? [])
              .match(/.{1,2}/g)
              ?.join(":") ?? "";
          bValue =
            base16
              .stringify(b.user?.macaddr ?? [])
              .match(/.{1,2}/g)
              ?.join(":") ?? "";
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
  }, [filteredNodes, sortColumn, sortOrder]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortOrder === "asc" ? (
      <ArrowUpIcon className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDownIcon className="ml-2 h-4 w-4" />
    );
  };

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
                      setColumnVisibility((prev) => ({
                        ...prev,
                        encryption: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.encryption")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastHeard}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        lastHeard: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.lastHeard")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.battery}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        battery: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.battery")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.altitude}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        altitude: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.altitude")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.hops}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        hops: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.hopsAway")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.temp}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        temp: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.temp")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.chUtil}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        chUtil: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.chUtil")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.model}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        model: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.model")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.role}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        role: checked,
                      }))
                    }
                  >
                    {t("nodesTable.headings.role")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.nodeId}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        nodeId: checked,
                      }))
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
                    <SortIcon column="longName" />
                  </div>
                </TableHead>
                {columnOrder.map((columnKey) => {
                  if (!columnVisibility[columnKey]) return null;
                  const column = columnConfig[columnKey];

                  return (
                    <TableHead
                      key={columnKey}
                      draggable
                      onDragStart={() => handleDragStart(columnKey)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(columnKey)}
                      className={cn(
                        column.sortable && "cursor-pointer select-none",
                        "cursor-move",
                        draggedColumn === columnKey && "opacity-50",
                      )}
                      onClick={() =>
                        column.sortable &&
                        column.sortKey &&
                        handleSort(column.sortKey)
                      }
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-60 hover:opacity-100" />
                        <span>{column.label}</span>
                        {column.sortable && column.sortKey && (
                          <SortIcon column={column.sortKey} />
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
                    node.user?.shortName ??
                    numberToHexUnpadded(node.num).slice(-4).toUpperCase();
                  const longName =
                    node.user?.longName ??
                    t("fallbackName", {
                      last4: shortName,
                    });

                  return (
                    <TableRow
                      key={node.num}
                      className={cn(
                        node.isFavorite &&
                          "bg-yellow-50/50 dark:bg-yellow-900/10",
                      )}
                    >
                      <TableCell>
                        <NodeAvatar
                          nodeNum={node.num}
                          showFavorite={node.isFavorite}
                          showError={hasNodeError(node.num)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleNodeInfoDialog(node.num)}
                          className="hover:underline text-left font-medium"
                          type="button"
                        >
                          {longName}
                        </button>
                      </TableCell>
                      {columnOrder.map((columnKey) => {
                        if (!columnVisibility[columnKey]) return null;
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

      <TracerouteResponseDialog
        traceroute={selectedTraceroute}
        open={!!selectedTraceroute}
        onOpenChange={() => setSelectedTraceroute(undefined)}
      />
      <LocationResponseDialog
        location={selectedLocation}
        open={!!selectedLocation}
        onOpenChange={() => setSelectedLocation(undefined)}
      />
    </div>
  );
};

export default NodesPage;
