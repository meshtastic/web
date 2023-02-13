import { base16 } from "rfc4648";
import { Mono } from "@components/generic/Mono.js";
import { Table } from "@components/generic/Table";
import { TimeAgo } from "@components/generic/Table/tmp/TimeAgo.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { Sidebar } from "@components/Sidebar.js";

export const PeersPage = (): JSX.Element => {
  const { connection, nodes } = useDevice();

  return (
    <>
      <Sidebar></Sidebar>
      <div className="w-full overflow-y-auto">
        <Table
          headings={[
            { title: "", type: "blank", sortable: false },
            { title: "Name", type: "normal", sortable: true },
            { title: "Model", type: "normal", sortable: true },
            { title: "MAC Address", type: "normal", sortable: true },
            { title: "Last Heard", type: "normal", sortable: true },
            { title: "SNR", type: "normal", sortable: true }
          ]}
          rows={nodes.map((node) => [
            <Hashicon size={24} value={node.data.num.toString()} />,
            <h1>
              {node.data.user?.longName ?? node.data.user?.macaddr
                ? `Meshtastic_${base16
                    .stringify(node.data.user?.macaddr.subarray(4, 6) ?? [])
                    .toLowerCase()}`
                : `UNK: ${node.data.num}`}
            </h1>,

            <Mono>{Protobuf.HardwareModel[node.data.user?.hwModel ?? 0]}</Mono>,
            <Mono>
              {base16
                .stringify(node.data.user?.macaddr ?? [])
                .match(/.{1,2}/g)
                ?.join(":") ?? "UNK"}
            </Mono>,
            node.data.lastHeard === 0 ? (
              <p>Never</p>
            ) : (
              <TimeAgo timestamp={node.data.lastHeard * 1000} />
            ),
            <Mono>
              {node.data.snr}db/
              {Math.min(Math.max((node.data.snr + 10) * 5, 0), 100)}%/
              {(node.data.snr + 10) * 5}raw
            </Mono>
          ])}
        />
      </div>
    </>
  );
};
