import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import {
  EllipsisHorizontalIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import type { Protobuf } from "@meshtastic/meshtasticjs";

import { IconButton } from "../IconButton.js";
import { Mono } from "../Mono.js";

export interface PeersWidgetProps {
  peers: Protobuf.NodeInfo[];
}

export const PeersWidget = ({ peers }: PeersWidgetProps): JSX.Element => {
  const { setActivePage } = useDevice();

  return (
    <div className="flex gap-3 overflow-hidden rounded-lg bg-white p-3 shadow">
      <div className="rounded-md bg-emerald-500 p-3">
        <UserGroupIcon className="h-6 text-white" />
      </div>
      <div>
        <p className="truncate text-sm font-medium text-gray-500">Peers</p>
        <div className="flex gap-1">
          {peers.length > 0 ? (
            <p className="text-lg font-semibold text-gray-900">
              {`${peers.length} ${peers.length > 1 ? "Peers" : "Peer"}`}
            </p>
          ) : (
            <Mono className="m-auto">None Discovered.</Mono>
          )}
        </div>
      </div>
      <IconButton
        className="my-auto ml-auto"
        variant="secondary"
        size="sm"
        onClick={() => {
          setActivePage("peers");
        }}
        icon={<EllipsisHorizontalIcon className="h-4" />}
      />
    </div>
  );
};
