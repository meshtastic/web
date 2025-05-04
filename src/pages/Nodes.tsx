import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { NodeOptionsDialog } from "@app/components/Dialog/NodeOptionsDialog.tsx";
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
  useState,
} from "react";
import { base16 } from "rfc4648";
import { Input } from "@components/UI/Input.tsx";
import { PageLayout } from "@components/PageLayout.tsx";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodesPage = (): JSX.Element => {
  const { getNodes, hardware, connection } = useDevice();
  const [selectedNode, setSelectedNode] = useState<
    Protobuf.Mesh.NodeInfo | undefined
  >(undefined);
  const [selectedTraceroute, setSelectedTraceroute] = useState<
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined
  >();
  const [selectedLocation, setSelectedLocation] = useState<
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined
  >();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const deferredSearch = useDeferredValue(searchTerm);

  const filteredNodes = getNodes((node) => {
    if (!node.user) return false;
    const lowerCaseSearchTerm = deferredSearch.toLowerCase();
    return (
      node.user?.longName?.toLowerCase().includes(lowerCaseSearchTerm) ||
      node.user?.shortName?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

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
        className="flex flex-col w-full"
      >
        <div className="p-2">
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            className="bg-transparent"
            showClearButton={!!searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto">
          <Table
            headings={[
              { title: "", type: "blank", sortable: false },
              { title: "Long Name", type: "normal", sortable: true },
              { title: "Connection", type: "normal", sortable: true },
              { title: "Last Heard", type: "normal", sortable: true },
              { title: "Encryption", type: "normal", sortable: false },
              { title: "SNR", type: "normal", sortable: true },
              { title: "Model", type: "normal", sortable: true },
              { title: "MAC Address", type: "normal", sortable: true },
            ]}
            rows={filteredNodes.map((node) => [
              <div key={node.num}>
                <Avatar text={node.user?.shortName ?? "UNK "} />
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
                {node.lastHeard !== 0
                  ? node.viaMqtt === false && node.hopsAway === 0
                    ? "Direct"
                    : `${node.hopsAway?.toString()} ${
                      node.hopsAway ?? 0 > 1 ? "hops" : "hop"
                    } away`
                  : "-"}
                {node.viaMqtt === true ? ", via MQTT" : ""}
              </Mono>,
              <Mono key="lastHeard">
                {node.lastHeard === 0
                  ? <p>Never</p>
                  : <TimeAgo timestamp={node.lastHeard * 1000} />}
              </Mono>,
              <Mono key="pki">
                {node.user?.publicKey && node.user?.publicKey.length > 0
                  ? <LockIcon className="text-green-600 mx-auto" />
                  : <LockOpenIcon className="text-yellow-300 mx-auto" />}
              </Mono>,
              <Mono key="snr">
                {node.snr}db/
                {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%/
                {(node.snr + 10) * 5}raw
              </Mono>,
              <Mono key="model">
                {Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}
              </Mono>,
              <Mono key="addr">
                {base16
                  .stringify(node.user?.macaddr ?? [])
                  .match(/.{1,2}/g)
                  ?.join(":") ?? "UNK"}
              </Mono>,
            ])}
          />
          <NodeOptionsDialog
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
