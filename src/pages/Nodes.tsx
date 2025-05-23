import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { NodeDetailsDialog } from "@app/components/Dialog/NodeDetailsDialog/NodeDetailsDialog.tsx";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { LockIcon, LockOpenIcon } from "lucide-react";
import {
  type JSX,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { base16 } from "rfc4648";
import { Input } from "@components/UI/Input.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import { useTranslation } from "react-i18next";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation();
  const { getNodes, hardware, connection, hasNodeError } = useDevice();
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const [selectedNode, setSelectedNode] = useState<
    Protobuf.Mesh.NodeInfo | undefined
  >(undefined);
  const [selectedTraceroute, setSelectedTraceroute] = useState<
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined
  >();
  const [selectedLocation, setSelectedLocation] = useState<
    Types.PacketMetadata<Protobuf.Mesh.Position> | undefined
  >();

  const [filterState, setFilterState] = useState<FilterState>(() =>
    defaultFilterValues
  );
  const deferredFilterState = useDeferredValue(filterState);

  const filteredNodes = useMemo(
    () => getNodes((node) => nodeFilter(node, deferredFilterState)),
    [deferredFilterState, getNodes, nodeFilter],
  );

  useEffect(() => {
    if (!connection) return;
    connection.events.onTraceRoutePacket.subscribe(handleTraceroute);
    return () => {
      connection.events.onTraceRoutePacket.unsubscribe(handleTraceroute);
    };
  }, [connection]);

  const handleTraceroute = useCallback(
    (traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>) => {
      setSelectedTraceroute(traceroute);
    },
    [],
  );

  useEffect(() => {
    if (!connection) return;
    connection.events.onPositionPacket.subscribe(handleLocation);
    return () => {
      connection.events.onPositionPacket.subscribe(handleLocation);
    };
  }, [connection]);

  const handleLocation = useCallback(
    (location: Types.PacketMetadata<Protobuf.Mesh.Position>) => {
      if (location.to.valueOf() !== hardware.myNodeNum) return;
      setSelectedLocation(location);
    },
    [hardware.myNodeNum],
  );

  return (
    <>
      <PageLayout
        label=""
        leftBar={<Sidebar />}
      >
        <div className="pl-2 pt-2 flex flex-row">
          <div className="flex-1 mr-2">
            <Input
              placeholder={t("nodes_searchPlaceholder")}
              value={filterState.nodeName}
              className="bg-transparent"
              showClearButton={!!filterState.nodeName}
              onChange={(e) =>
                setFilterState((prev) => ({
                  ...prev,
                  nodeName: e.target.value,
                }))}
            />
          </div>
          <div className="flex justify-end">
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
          <Table
            headings={[
              { title: "", type: "blank", sortable: false },
              {
                title: t("nodes_table_headings_longName"),
                type: "normal",
                sortable: true,
              },
              {
                title: t("nodes_table_headings_connection"),
                type: "normal",
                sortable: true,
              },
              {
                title: t("nodes_table_headings_lastHeard"),
                type: "normal",
                sortable: true,
              },
              {
                title: t("nodes_table_headings_encryption"),
                type: "normal",
                sortable: false,
              },
              {
                title: t("node_detail_snr_label"),
                type: "normal",
                sortable: true,
              },
              {
                title: t("nodes_table_headings_model"),
                type: "normal",
                sortable: true,
              },
              {
                title: t("nodes_table_headings_macAddress"),
                type: "normal",
                sortable: true,
              },
            ]}
            rows={filteredNodes.map((node) => [
              <div key={node.num}>
                <Avatar
                  text={node.user?.shortName ?? t("common.unknown")}
                  showFavorite={node.isFavorite}
                  showError={hasNodeError(node.num)}
                />
              </div>,
              <h1
                key="longName"
                onMouseDown={() => setSelectedNode(node)}
                onKeyUp={(evt) => {
                  evt.key === "Enter" && setSelectedNode(node);
                }}
                className="cursor-pointer underline ml-2 whitespace-break-spaces"
                tabIndex={0}
                role="button"
              >
                {node.user?.longName ?? numberToHexUnpadded(node.num)}
              </h1>,
              <Mono key="hops" className="w-16">
                {node.hopsAway !== undefined
                  ? node?.viaMqtt === false && node.hopsAway === 0
                    ? t("nodes_table_connectionStatus_direct")
                    : `${node.hopsAway?.toString()} ${
                      node.hopsAway ?? 0 > 1
                        ? t("nodes_table_connectionStatus_hops_other")
                        : t("nodes_table_connectionStatus_hops_one")
                    } ${t("nodes_table_connectionStatus_away")}`
                  : t("nodes_table_connectionStatus_unknown")}
                {node?.viaMqtt === true
                  ? t("nodes_table_connectionStatus_viaMqtt")
                  : ""}
              </Mono>,
              <Mono key="lastHeard">
                {node.lastHeard === 0
                  ? <p>{t("nodes_table_lastHeardStatus_never")}</p>
                  : <TimeAgo timestamp={node.lastHeard * 1000} />}
              </Mono>,
              <Mono key="pki">
                {node.user?.publicKey && node.user?.publicKey.length > 0
                  ? <LockIcon className="text-green-600 mx-auto" />
                  : <LockOpenIcon className="text-yellow-300 mx-auto" />}
              </Mono>,
              <Mono key="snr">
                {node.snr}
                {t("common_unit_dbm")}/
                {Math.min(
                  Math.max((node.snr + 10) * 5, 0),
                  100,
                )}%/{/* Percentage */}
                {(node.snr + 10) * 5}
                {t("common_unit_raw")}
              </Mono>,
              <Mono key="model">
                {Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}
              </Mono>,
              <Mono key="addr">
                {base16
                  .stringify(node.user?.macaddr ?? [])
                  .match(/.{1,2}/g)
                  ?.join(":") ?? t("common.unknown")}
              </Mono>,
            ])}
          />
          <NodeDetailsDialog
            node={selectedNode}
            open={!!selectedNode}
            onOpenChange={() => setSelectedNode(undefined)}
          />
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
    </>
  );
};

export default NodesPage;
