import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { IconButton } from "@components/form/IconButton.js";
import { Mono } from "@components/generic/Mono.js";
import {
  EllipsisHorizontalIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import type { Protobuf } from "@meshtastic/meshtasticjs";

export interface PeersWidgetProps {
  peers: Protobuf.NodeInfo[];
}

export const PeersWidget = ({ peers }: PeersWidgetProps): JSX.Element => {
  const { setActivePage } = useDevice();

  return (
    <div className="flex gap-3 overflow-hidden rounded-lg bg-backgroundPrimary p-3 text-textSecondary">
      <div className="rounded-md bg-accent p-3">
        <UserGroupIcon className="h-6 text-textPrimary" />
      </div>
      <div>
        <p className="truncate text-sm font-medium">Peers</p>
        <div className="flex gap-1">
          {peers.length > 0 ? (
            <p className="text-lg font-semibold">
              {`${peers.length} ${peers.length > 1 ? "Peers" : "Peer"}`}
            </p>
          ) : (
            <Mono className="m-auto">None Discovered.</Mono>
          )}
        </div>
      </div>
      <IconButton
        className="my-auto ml-auto"
        size="sm"
        onClick={() => {
          setActivePage("peers");
        }}
        icon={<EllipsisHorizontalIcon className="h-4" />}
      />
    </div>
  );
};
