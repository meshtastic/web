import { NodeOptionsDialog } from "@app/components/Dialog/NodeOptionsDialog";
import { TracerouteResponseDialog } from "@app/components/Dialog/TracerouteResponseDialog";
import Footer from "@app/components/UI/Footer";
import { Sidebar } from "@components/Sidebar.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, type Types } from "@meshtastic/js";
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

  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum,
  );

  useEffect(() => {
    connection?.events.onTraceRoutePacket.subscribe(handleTraceroute);
    return () => {
      connection?.events.onTraceRoutePacket.unsubscribe(handleTraceroute);
    };
  }, [connection]);

  const handleTraceroute = useCallback(
    (traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>) => {
      setSelectedTraceroute(traceroute);
    },
    [],
  );

  return (
    <>
      <Sidebar />
      <div className="flex flex-col w-full">
        <div className="overflow-y-auto h-full">
          <Table
            headings={[
              { title: "", type: "blank", sortable: false },
              { title: "Name", type: "normal", sortable: true },
              { title: "Model", type: "normal", sortable: true },
              { title: "MAC Address", type: "normal", sortable: true },
              { title: "Last Heard", type: "normal", sortable: true },
              { title: "SNR", type: "normal", sortable: true },
              { title: "Encryption", type: "normal", sortable: false },
              { title: "Connection", type: "normal", sortable: true },
            ]}
            rows={filteredNodes.map((node) => [
              <span
                key={node.num}
                className="h-3 w-3 rounded-full bg-accent"
              />,

              <h1
                key="header"
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
              <Fragment key="lastHeard">
                {node.lastHeard === 0 ? (
                  <p>Never</p>
                ) : (
                  <TimeAgo timestamp={node.lastHeard * 1000} />
                )}
              </Fragment>,
              <Mono key="snr">
                {node.snr}db/
                {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%/
                {(node.snr + 10) * 5}raw
              </Mono>,
              <Mono key="pki">
                {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
                  <LockIcon className="text-green-600" />
                ) : (
                  <LockOpenIcon className="text-yellow-300 mx-auto" />
                )}
              </Mono>,
              <Mono key="hops">
                {node.lastHeard !== 0
                  ? node.viaMqtt === false && node.hopsAway === 0
                    ? "Direct"
                    : `${node.hopsAway.toString()} ${
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
        </div>
        <Footer />
      </div>
    </>
  );
};

export default NodesPage;
