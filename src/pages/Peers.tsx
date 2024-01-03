import { Sidebar } from "@components/Sidebar.js";
import { Mono } from "@components/generic/Mono.js";
import { Table } from "@components/generic/Table/index.js";
import { TimeAgo } from "@components/generic/Table/tmp/TimeAgo.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf } from "@meshtastic/js";
import { base16 } from "rfc4648";

export const PeersPage = (): JSX.Element => {
  const { nodes, hardware } = useDevice();

  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum,
  );

  return (
    <>
      <Sidebar />
      <div className="w-full overflow-y-auto">
        <Table
          headings={[
            { title: "", type: "blank", sortable: false },
            { title: "Name", type: "normal", sortable: true },
            { title: "Model", type: "normal", sortable: true },
            { title: "MAC Address", type: "normal", sortable: true },
            { title: "Last Heard", type: "normal", sortable: true },
            { title: "SNR", type: "normal", sortable: true },
          ]}
          rows={filteredNodes.map((node) => [
            <Hashicon size={24} value={node.num.toString()} />,
            <h1>
              {node.user?.longName ??
                (node.user?.macaddr
                  ? `Meshtastic ${base16
                      .stringify(node.user?.macaddr.subarray(4, 6) ?? [])
                      .toLowerCase()}`
                  : `UNK: ${node.num}`)}
            </h1>,

            <Mono>{Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]}</Mono>,
            <Mono>
              {base16
                .stringify(node.user?.macaddr ?? [])
                .match(/.{1,2}/g)
                ?.join(":") ?? "UNK"}
            </Mono>,
            node.lastHeard === 0 ? (
              <p>Never</p>
            ) : (
              <TimeAgo timestamp={node.lastHeard * 1000} />
            ),
            <Mono>
              {node.snr}db/
              {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%/
              {(node.snr + 10) * 5}raw
            </Mono>,
          ])}
        />
      </div>
    </>
  );
};
