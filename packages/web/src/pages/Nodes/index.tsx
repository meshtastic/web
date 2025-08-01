import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog.tsx";
import { ColumnVisibilityControl } from "@components/generic/ColumnVisibilityControl/index.tsx";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import {
  type DataRow,
  type Heading,
  Table,
} from "@components/generic/Table/index.tsx";
import { getNodeCellData } from "@components/generic/Table/NodeCellHelpers.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Input } from "@components/UI/Input.tsx";
import useLang from "@core/hooks/useLang.ts";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf, Types } from "@meshtastic/core";
import {
  type JSX,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation("nodes");
  const { currentLanguage } = useLang();
  const { getNodes, hardware, connection, hasNodeError, setDialogOpen } =
    useDevice();
  const { setNodeNumDetails, nodesTableColumns } = useAppStore();
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

  const filteredNodes = useMemo(
    () => getNodes((node) => nodeFilter(node, deferredFilterState)),
    [deferredFilterState, getNodes, nodeFilter],
  );

  const handleTraceroute = useCallback(
    (traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>) => {
      setSelectedTraceroute(traceroute);
    },
    [],
  );

  const handleLocation = useCallback(
    (location: Types.PacketMetadata<Protobuf.Mesh.Position>) => {
      if (location.to.valueOf() !== hardware.myNodeNum) {
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
      connection.events.onPositionPacket.subscribe(handleLocation);
    };
  }, [connection, handleLocation]);

  // Get visible columns and create table headings
  const visibleColumns = nodesTableColumns.filter((col) => col.visible);
  const tableHeadings: Heading[] = visibleColumns.map((col) => ({
    title: col.title.includes(".") ? t(col.title) : col.title,
    sortable: col.sortable,
  }));

  const tableRows: DataRow[] = filteredNodes.map((node) => {
    const cells = visibleColumns.map((column) =>
      getNodeCellData(
        node,
        column.key,
        t,
        currentLanguage,
        hasNodeError,
        handleNodeInfoDialog,
      ),
    );

    return {
      id: node.num,
      isFavorite: node.isFavorite,
      cells,
    };
  });

  return (
    <PageLayout label="" leftBar={<Sidebar />}>
      <div className="pl-2 pt-2 flex flex-row">
        <div className="flex-1 mr-2">
          <Input
            placeholder={t("search.nodes")}
            value={filterState.nodeName}
            className="bg-transparent"
            showClearButton={!!filterState.nodeName}
            onChange={(e) =>
              setFilterState((prev) => ({
                ...prev,
                nodeName: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex justify-end">
          <ColumnVisibilityControl />
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
              popoverTriggerClassName: "mr-1 p-2",
              showTextSearch: false,
            }}
          />
        </div>
      </div>
      <div className="overflow-y-auto">
        <Table headings={tableHeadings} rows={tableRows} />
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
    </PageLayout>
  );
};

export default NodesPage;
