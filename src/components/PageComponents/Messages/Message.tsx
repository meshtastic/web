import type React from "react";

import { WaypointMessage } from "@components/PageComponents/Messages/WaypointMessage.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { AllMessageTypes } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  CheckCircleIcon,
  EllipsisHorizontalCircleIcon
} from "@heroicons/react/24/outline";
import type { Protobuf } from "@meshtastic/meshtasticjs";

export interface MessageProps {
  lastMsgSameUser: boolean;
  message: AllMessageTypes;
  sender?: Protobuf.NodeInfo;
}

export const Message = ({
  lastMsgSameUser,
  message,
  sender
}: MessageProps): JSX.Element => {
  const { setPeerInfoOpen, setActivePeer, connection } = useDevice();

  const openPeer = (): void => {
    setActivePeer(message.packet.from);
    setPeerInfoOpen(true);
  };

  return lastMsgSameUser ? (
    <div className="ml-4 flex">
      {message.ack ? (
        <CheckCircleIcon className="my-auto h-4 text-slate-400" />
      ) : (
        <EllipsisHorizontalCircleIcon className="my-auto h-4 text-slate-200" />
      )}
      {"waypointID" in message ? (
        <WaypointMessage waypointID={message.waypointID} />
      ) : (
        <span
          className={`ml-4 border-l-2 border-l-slate-200 pl-2 ${
            message.ack ? "text-black" : "text-slate-500"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  ) : (
    <div className="mx-4 mt-2 gap-2">
      <div className="flex gap-2">
        <div className="w-6 cursor-pointer" onClick={openPeer}>
          <Hashicon value={(sender?.num ?? 0).toString()} size={32} />
        </div>
        <span
          className="cursor-pointer font-medium text-slate-700"
          onClick={openPeer}
        >
          {sender?.user?.longName ?? "UNK"}
        </span>
        <span className="text-sm">
          {new Date(message.packet.rxTime).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>
      </div>
      <div className="flex">
        {message.ack ? (
          <CheckCircleIcon className="my-auto h-4 text-slate-400" />
        ) : (
          <EllipsisHorizontalCircleIcon className="my-auto h-4 text-slate-200" />
        )}
        {"waypointID" in message ? (
          <WaypointMessage waypointID={message.waypointID} />
        ) : (
          <span
            className={`ml-4 border-l-2 border-l-slate-200 pl-2 ${
              message.ack ? "text-black" : "text-slate-500"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
};
