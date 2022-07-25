import type React from "react";

import {
  Dialog,
  HelperManagementIcon,
  IconButton,
  majorScale,
  MoreIcon,
  Table,
  TagIcon,
  Tooltip,
} from "evergreen-ui";

import { useDevice } from "@app/core/stores/deviceStore.js";
import { toMGRS } from "@app/core/utils/toMGRS.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf } from "@meshtastic/meshtasticjs";

export interface PeersDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const PeersDialog = ({
  isOpen,
  close,
}: PeersDialogProps): JSX.Element => {
  const { hardware, nodes, connection } = useDevice();

  return (
    <Dialog
      isShown={isOpen}
      title="Peers"
      onCloseComplete={close}
      hasFooter={false}
      width={majorScale(120)}
    >
      <Table>
        <Table.Head>
          <Table.HeaderCell flexBasis={48} flexShrink={0} flexGrow={0} />
          <Table.TextHeaderCell flexBasis={96} flexShrink={0} flexGrow={0}>
            Number
          </Table.TextHeaderCell>
          <Table.TextHeaderCell flexBasis={116} flexShrink={0} flexGrow={0}>
            Name
          </Table.TextHeaderCell>
          <Table.TextHeaderCell flexBasis={48} flexShrink={0} flexGrow={0}>
            SNR
          </Table.TextHeaderCell>
          <Table.TextHeaderCell>Location</Table.TextHeaderCell>
          <Table.TextHeaderCell>Last Heard</Table.TextHeaderCell>
          <Table.TextHeaderCell>Actions</Table.TextHeaderCell>
        </Table.Head>
        <Table.Body height={240}>
          {nodes
            .filter((n) => n.data.num !== hardware.myNodeNum)
            .map((node) => (
              <Table.Row
                key={node.data.num}
                isSelectable
                onSelect={() => alert(node.data.num)}
              >
                <Table.Cell flexBasis={48} flexShrink={0} flexGrow={0}>
                  <Hashicon
                    value={node.data.num.toString()}
                    size={majorScale(3)}
                  />
                </Table.Cell>
                <Table.TextCell flexBasis={96} flexShrink={0} flexGrow={0}>
                  {node.data.num}
                </Table.TextCell>
                <Table.TextCell flexBasis={116} flexShrink={0} flexGrow={0}>
                  {node.data.user?.longName}
                </Table.TextCell>
                <Table.TextCell flexBasis={48} flexShrink={0} flexGrow={0}>
                  {node.data.snr}
                </Table.TextCell>
                <Table.TextCell>
                  {toMGRS(
                    node.data.position?.latitudeI,
                    node.data.position?.longitudeI
                  )}
                </Table.TextCell>
                <Table.TextCell>
                  {new Date(node.data.lastHeard * 1000).toLocaleString()}
                </Table.TextCell>
                <Table.Cell gap={majorScale(1)}>
                  <Tooltip content="Manage">
                    <IconButton icon={HelperManagementIcon} />
                  </Tooltip>
                  <IconButton
                    icon={TagIcon}
                    onClick={() => {
                      void connection?.sendPacket(
                        Protobuf.AdminMessage.toBinary({
                          variant: {
                            oneofKind: "getConfigRequest",
                            getConfigRequest:
                              Protobuf.AdminMessage_ConfigType.LORA_CONFIG,
                          },
                        }),
                        Protobuf.PortNum.ADMIN_APP,
                        node.data.num,
                        true,
                        7,
                        true,
                        false,
                        async (test) => {
                          console.log(test);

                          console.log("got response");
                          return Promise.resolve();
                        }
                      );
                    }}
                  />
                  <IconButton icon={MoreIcon} />
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table>
      {/* <Pane
                key={node.data.num}
                display="flex"
                borderRadius={majorScale(1)}
                elevation={1}
                gap={majorScale(1)}
                padding={majorScale(1)}
              >
                
                <Heading>{node.data.user?.longName}</Heading>
                {node.metrics.airUtilTx}
                {node.metrics.}
                {node.metrics.channelUtilization}
                {node.metrics.}
                {node.data.}
              </Pane> */}
    </Dialog>
  );
};
