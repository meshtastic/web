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

import { useDevice } from "@app/core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import type { Protobuf, Types } from "@meshtastic/meshtasticjs";

import { LocationMessage } from "./LocationMessage.js";

export interface MessageProps {
  lastMsgSameUser: boolean;
  messagePacket: Types.MessagePacket;
  ack: boolean;
  rxTime: Date;
  sender?: Protobuf.NodeInfo;
}

export const Message = ({
  lastMsgSameUser,
  messagePacket,
  ack,
  rxTime,
  sender,
}: MessageProps): JSX.Element => {
  const { setPeerInfoOpen, setActivePeer } = useDevice();

  const openPeer = (): void => {
    setActivePeer(messagePacket.packet.from);
    setPeerInfoOpen(true);
  };

  return lastMsgSameUser ? (
    <Pane display="flex" marginLeft={majorScale(3)}>
      {ack ? (
        <FullCircleIcon color="#9c9fab" marginY="auto" size={8} />
      ) : (
        <CircleIcon color="#9c9fab" marginY="auto" size={8} />
      )}
      {messagePacket.location ? (
        <LocationMessage location={messagePacket.location} />
      ) : (
        <Text
          color={ack ? "#474d66" : "#9c9fab"}
          marginLeft={majorScale(2)}
          paddingLeft={majorScale(1)}
          borderLeft="3px solid #e6e6e6"
        >
          {messagePacket.text}
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
          {rxTime.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Small>
      </Pane>
      <Pane display="flex" marginLeft={majorScale(1)}>
        {ack ? (
          <FullCircleIcon color="#9c9fab" marginY="auto" size={8} />
        ) : (
          <CircleIcon color="#9c9fab" marginY="auto" size={8} />
        )}
        {messagePacket.location ? (
          <LocationMessage location={messagePacket.location} />
        ) : (
          <Text
            color={ack ? "#474d66" : "#9c9fab"}
            marginLeft={majorScale(2)}
            paddingLeft={majorScale(1)}
            borderLeft="3px solid #e6e6e6"
          >
            {messagePacket.text}
          </Text>
        )}
      </Pane>
    </Pane>
  );
};
