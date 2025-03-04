import { LocationResponseDialog } from "@app/components/Dialog/LocationResponseDialog.tsx";
import { NodeOptionsDialog } from "@app/components/Dialog/NodeOptionsDialog.tsx";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog.tsx";
import Footer from "@app/components/UI/Footer.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { Fragment, type JSX, useCallback, useEffect, useState } from "react";
import { base16 } from "rfc4648";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NodesPage = (): JSX.Element => {
  const { nodes, hardware, connection } = useDevice();
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

  const filteredNodes = Array.from(nodes.values()).filter((node) => {
    if (node.num === hardware.myNodeNum) return false;
    const nodeName = node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`;
    return nodeName.toLowerCase().includes(searchTerm.toLowerCase());
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
      <Sidebar />
      <div className="flex flex-col w-full">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-sm bg-white text-slate-900"
          />
        </div>
        <div className="overflow-y-auto h-full">
          <Table
            headings={[
              { title: "", type: "blank", sortable: false },
              { title: "Short Name", type: "normal", sortable: true },
              { title: "Long Name", type: "normal", sortable: true },
              { title: "Model", type: "normal", sortable: true },
              { title: "MAC Address", type: "normal", sortable: true },
              { title: "Last Heard", type: "normal", sortable: true },
              { title: "SNR", type: "normal", sortable: true },
              { title: "Encryption", type: "normal", sortable: false },
              { title: "Connection", type: "normal", sortable: true },
            ]}
            rows={filteredNodes.map((node) => [
              <div key={node.num}>
                <Avatar text={node.user?.shortName.toString() ?? "UNK"} />
              </div>,

              <h1
                key="shortName"
                onMouseDown={() => setSelectedNode(node)}
                className="cursor-pointer"
              >
                {node.user?.shortName ??
                  (node.user?.macaddr
                    ? `${base16
                        .stringify(node.user?.macaddr.subarray(4, 6) ?? [])
                        .toLowerCase()}`
                    : `${numberToHexUnpadded(node.num).slice(-4)}`)}
              </h1>,

              <h1
                key="longName"
                onMouseDown={() => setSelectedNode(node)}
                className="cursor-pointer"
              >
                {node.user?.longName ??
                  (node.user?.macaddr
                    ? `Meshtastic ${base16
                        .stringify(node.user?.macaddr.subarray(4, 6) ?? [])
                        .toLowerCase()}`
                    : `!${numberToHexUnpadded(node.num)}`)}
              </h1>,

              <Mono key="model">
                {Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}
              </Mono>,
              <Mono key="addr">
                {base16
                  .stringify(node.user?.macaddr ?? [])
                  .match(/.{1,2}/g)
                  ?.join(":") ?? "UNK"}
              </Mono>,
              <Mono className="px-4" key="lastHeard">
                {node.lastHeard === 0 ? (
                  <p className="px-4">Never</p>
                ) : (
                  <TimeAgo timestamp={node.lastHeard * 1000} />
                )}
              </Mono>,
              <Mono key="snr">
                {node.snr}db/
                {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%/
                {(node.snr + 10) * 5}raw
              </Mono>,
              <Mono key="pki">
                {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
                  <LockIcon className="text-green-600 mx-auto" />
                ) : (
                  <LockOpenIcon className="text-yellow-300 mx-auto" />
                )}
              </Mono>,
              <Mono key="hops">
                {node.lastHeard !== 0
                  ? node.viaMqtt === false && node.hopsAway === 0
                    ? "Direct"
                    : `${node.hopsAway?.toString()} ${
                        node.hopsAway > 1 ? "hops" : "hop"
                      } away`
                  : "-"}
                {node.viaMqtt === true ? ", via MQTT" : ""}
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
        <Footer />
      </div>
    </>
  );
};

export default NodesPage;
