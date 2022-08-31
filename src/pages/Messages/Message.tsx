import type React from "react";

import {
  CircleIcon,
  FullCircleIcon,
  majorScale,
  Pane,
  Small,
  Strong,
  Text,
} from "evergreen-ui";

import type { AllMessageTypes } from "@app/core/stores/deviceStore.js";
import { WaypointMessage } from "@app/pages/Messages/WaypointMessage.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import type { Protobuf } from "@meshtastic/meshtasticjs";

export interface MessageProps {
  lastMsgSameUser: boolean;
  message: AllMessageTypes;
  sender?: Protobuf.NodeInfo;
}

export const Message = ({
  lastMsgSameUser,
  message,
  sender,
}: MessageProps): JSX.Element => {
  const { setPeerInfoOpen, setActivePeer } = useDevice();

  const openPeer = (): void => {
    setActivePeer(message.packet.from);
    setPeerInfoOpen(true);
  };

  return lastMsgSameUser ? (
    <Pane display="flex" marginLeft={majorScale(3)}>
      {message.ack ? (
        <FullCircleIcon color="#9c9fab" marginY="auto" size={8} />
      ) : (
        <CircleIcon color="#9c9fab" marginY="auto" size={8} />
      )}
      {"waypointID" in message ? (
        <WaypointMessage waypointID={message.waypointID} />
      ) : (
        <Text
          color={message.ack ? "#474d66" : "#9c9fab"}
          marginLeft={majorScale(2)}
          paddingLeft={majorScale(1)}
          borderLeft="3px solid #e6e6e6"
        >
          {message.text}
        </Text>
      )}
    </Pane>
  ) : (
    <Pane marginX={majorScale(2)} gap={majorScale(1)} marginTop={majorScale(1)}>
      <Pane display="flex" gap={majorScale(1)}>
        <Pane onClick={openPeer} cursor="pointer" width={majorScale(3)}>
          <Hashicon value={(sender?.num ?? 0).toString()} size={32} />
        </Pane>
        <Strong onClick={openPeer} cursor="pointer" size={500}>
          {sender?.user?.longName ?? "UNK"}
        </Strong>
        <Small>
          {new Date(message.packet.rxTime).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Small>
      </Pane>
      <Pane display="flex" marginLeft={majorScale(1)}>
        {message.ack ? (
          <FullCircleIcon color="#9c9fab" marginY="auto" size={8} />
        ) : (
          <CircleIcon color="#9c9fab" marginY="auto" size={8} />
        )}
        {"waypointID" in message ? (
          <WaypointMessage waypointID={message.waypointID} />
        ) : (
          <Text
            color={message.ack ? "#474d66" : "#9c9fab"}
            marginLeft={majorScale(2)}
            paddingLeft={majorScale(1)}
            borderLeft="3px solid #e6e6e6"
          >
            {message.text}
          </Text>
        )}
      </Pane>
    </Pane>
  );
};
