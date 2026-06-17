import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog.tsx";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { Mono } from "@components/generic/Mono.tsx";
import {
  type DataRow,
  type Heading,
  Table,
} from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Input } from "@components/UI/Input.tsx";
import useLang from "@core/hooks/useLang.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useAppStore, useDevice } from "@core/stores";
import { Protobuf, type Types } from "@meshtastic/sdk";
import { useNodeErrors } from "@meshtastic/sdk-react";
import { numberToHexUnpadded } from "@noble/curves/utils.js";
import { LockIcon, LockOpenIcon } from "lucide-react";
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

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodesPage = (): JSX.Element => {
  const { t } = useTranslation("nodes");
  const { current } = useLang();
  const { hardware, connection, setDialogOpen } = useDevice();

  const { setNodeNumDetails } = useAppStore();
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

  // stable predicate so the selector identity doesn’t thrash
  const predicate = useCallback(
    (node: Protobuf.Mesh.NodeInfo) => nodeFilter(node, deferredFilterState),
    [nodeFilter, deferredFilterState],
  );

  // Nodes come from the SDK NodesClient (signals + sqlocal-backed history).
  // PKI / node-error tracking lives on the SDK NodesClient too.
  const allSdkNodes = useNodesAsProto();
  const filteredNodes = useMemo(
    () => allSdkNodes.filter(predicate),
    [allSdkNodes, predicate],
  );
  const errors = useNodeErrors();
  const errorSet = useMemo(() => new Set(errors.map((e) => e.node)), [errors]);
  const hasNodeError = useCallback(
    (num: number) => errorSet.has(num),
    [errorSet],
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

  const tableHeadings: Heading[] = [
    { title: "", sortable: false },
    { title: t("nodesTable.headings.longName"), sortable: true },
    { title: t("nodesTable.headings.connection"), sortable: true },
    { title: t("nodesTable.headings.lastHeard"), sortable: true },
    { title: t("nodesTable.headings.encryption"), sortable: false },
    { title: t("unit.snr"), sortable: true },
    { title: t("nodesTable.headings.model"), sortable: true },
    { title: t("nodesTable.headings.macAddress"), sortable: true },
  ];

  const tableRows: DataRow[] = filteredNodes.map((node) => {
    const macAddress =
      base16
        .stringify(node.user?.macaddr ?? [])
        .match(/.{1,2}/g)
        ?.join(":") ?? t("unknown.shortName");

    const shortName =
      node.user?.shortName ??
      numberToHexUnpadded(node.num).slice(-4).toUpperCase();
    const longName =
      node.user?.longName ??
      t("fallbackName", {
        last4: shortName,
      });

    // SNR is reported in dB. Map it to a 0–100% signal-quality heuristic
    // (-10 dB → 0%, +10 dB → 100%) for an at-a-glance read, and pick a tone.
    const snr = node.snr ?? 0;
    const snrQuality = Math.min(Math.max(Math.round((snr + 10) * 5), 0), 100);
    const snrTone =
      snrQuality >= 67
        ? "text-green-500"
        : snrQuality >= 34
          ? "text-yellow-500"
          : "text-red-500";

    return {
      id: node.num,
      isFavorite: node.isFavorite,
      cells: [
        {
          content: (
            <Avatar
              nodeNum={node.num}
              showFavorite={node.isFavorite}
              showError={hasNodeError(node.num)}
            />
          ),
          sortValue: shortName, // Non-sortable column
        },
        {
          content: (
            <h1
              onMouseDown={() => handleNodeInfoDialog(node.num)}
              onKeyUp={(evt) => {
                if (evt.key === "Enter") {
                  handleNodeInfoDialog(node.num);
                }
              }}
              className="cursor-pointer underline ml-2 whitespace-break-spaces"
            >
              {longName}
            </h1>
          ),
          sortValue: longName,
        },
        {
          content: (
            <Mono className="w-16">
              {node.hopsAway !== undefined
                ? node?.viaMqtt === false && node.hopsAway === 0
                  ? t("nodesTable.connectionStatus.direct")
                  : `${node.hopsAway?.toString()} ${
                      (node.hopsAway ?? 0) > 1
                        ? t("unit.hop.plural")
                        : t("unit.hop.one")
                    } ${t("nodesTable.connectionStatus.away")}`
                : t("unknown.longName")}
              {node?.viaMqtt === true
                ? t("nodesTable.connectionStatus.viaMqtt")
                : ""}
            </Mono>
          ),
          sortValue: node.hopsAway ?? Number.MAX_SAFE_INTEGER,
        },
        {
          content: (
            <Mono>
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
          sortValue: node.lastHeard,
        },
        {
          content: (
            <Mono>
              {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
                <LockIcon className="text-green-600 mx-auto" />
              ) : (
                <LockOpenIcon className="text-yellow-300 mx-auto" />
              )}
            </Mono>
          ),
          sortValue: "", // Non-sortable column
        },
        {
          content: (
            <Mono className="flex items-baseline gap-1.5">
              <span className={snrTone}>
                {Number(snr.toFixed(1))} {t("unit.db")}
              </span>
              <span className="text-gray-500 dark:text-gray-400/70">
                {snrQuality}%
              </span>
            </Mono>
          ),
          sortValue: node.snr,
        },
        {
          content: (
            <Mono>{Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}</Mono>
          ),
          sortValue:
            Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0] ?? "UNSET",
        },
        {
          content: <Mono>{macAddress}</Mono>,
          sortValue: macAddress,
        },
      ],
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
