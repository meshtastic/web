import type React from "react";

import {
  majorScale,
  Pane,
  Pulsar,
  Small,
  Strong,
  Text,
  TimeIcon,
} from "evergreen-ui";

import { Hashicon } from "@emeraldpay/hashicon-react";
import type { Protobuf } from "@meshtastic/meshtasticjs";

export interface MessageProps {
  lastMsgSameUser: boolean;
  message: string;
  ack: boolean;
  rxTime: Date;
  sender?: Protobuf.NodeInfo;
}

export const Message = ({
  lastMsgSameUser,
  message,
  ack,
  rxTime,
  sender,
}: MessageProps): JSX.Element => {
  return (
    <Pane marginBottom={majorScale(1)} className="group hover:bg-gray-200">
      {lastMsgSameUser ? (
        <Pane
          marginX={majorScale(2)}
          display="flex"
          justifyContent="space-between"
          marginTop={-majorScale(1)}
          className={`${lastMsgSameUser ? "" : "py-1"}`}
        >
          <Pane
            display="flex"
            position="relative"
            gap={majorScale(1)}
            className="gap-2"
          >
            <Small
              marginY="auto"
              marginLeft="auto"
              width={majorScale(3)}
              paddingTop={majorScale(1)}
              className="pt-1 text-transparent group-hover:text-gray-500"
            >
              {rxTime
                .toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace("AM", "")
                .replace("PM", "")}
            </Small>
            <Text marginY="auto" className={`${ack ? "" : "animate-pulse"}`}>
              {message}
            </Text>
            <Pulsar />
          </Pane>
          <Pane
            display="flex"
            gap={majorScale(1)}
            paddingTop={majorScale(1)}
            className="text-transparent group-hover:text-gray-500"
          >
            <TimeIcon />
            <Small>25s</Small>
          </Pane>
        </Pane>
      ) : (
        <Pane display="flex" marginX={majorScale(2)} gap={majorScale(1)}>
          <Pane marginY="auto" width={majorScale(3)}>
            <Hashicon value={(sender?.num ?? 0).toString()} size={32} />
          </Pane>
          <Pane>
            <Pane display="flex" gap={majorScale(1)}>
              <Strong cursor="default" size={500} className="hover:underline">
                {sender?.user?.longName ?? "UNK"}
              </Strong>
              <Small marginY="auto">
                {rxTime.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Small>
            </Pane>
            <Text className={`${ack ? "" : "animate-pulse"}`}>{message}</Text>
          </Pane>
        </Pane>
      )}
    </Pane>
  );
};
