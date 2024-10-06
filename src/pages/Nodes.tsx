import Footer from "@app/components/UI/Footer";
import { useAppStore } from "@app/core/stores/appStore";
import { Sidebar } from "@components/Sidebar.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/Table/tmp/TimeAgo.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { LockIcon, LockOpenIcon, TrashIcon } from "lucide-react";
import { Fragment } from "react";
import { base16 } from "rfc4648";

export interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodesPage = (): JSX.Element => {
  const { nodes, hardware, setDialogOpen } = useDevice();
  const { setNodeNumToBeRemoved } = useAppStore();

  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum,
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
              { title: "Remove", type: "normal", sortable: false },
            ]}
            rows={filteredNodes.map((node) => [
              <Hashicon key="icon" size={24} value={node.num.toString()} />,
              <h1 key="header">
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
                  <LockOpenIcon className="text-yellow-300" />
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
              <Button
                key="remove"
                variant="destructive"
                onClick={() => {
                  setNodeNumToBeRemoved(node.num);
                  setDialogOpen("nodeRemoval", true);
                }}
              >
                <TrashIcon />
                Remove
              </Button>,
            ])}
          />
        </div>
        <Footer />
      </div>
    </>
  );
};
