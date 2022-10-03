import type React from "react";

import { base16 } from "rfc4648";

import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  EllipsisHorizontalCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { Protobuf } from "@meshtastic/meshtasticjs";

import { Card } from "../Card.js";
import { Dropdown } from "../Dropdown.js";
import { IconButton } from "../IconButton.js";
import { Mono } from "../Mono.js";

export interface PeersWidgetProps {
  peers: Protobuf.NodeInfo[];
}

export const PeersWidget = ({ peers }: PeersWidgetProps): JSX.Element => {
  return (
    <Card className="flex-col">
      <Dropdown
        title="Peers"
        stat={peers.length}
        icon={<UserGroupIcon className="h-4" />}
      >
        <div className="flex flex-col p-3">
          {peers.map((peer) => (
            <div
              className="flex gap-2 rounded-md p-2 hover:bg-slate-100"
              key={peer.num}
            >
              <span className="my-auto shrink-0">
                <Hashicon value={peer.num.toString()} size={28} />
              </span>
              <div className="flex flex-col">
                <span className="font-medium">{peer.user?.longName}</span>
                <Mono>
                  {base16
                    .stringify(peer.user?.macaddr ?? [])
                    .match(/.{1,2}/g)
                    ?.join(":") ?? ""}
                </Mono>
              </div>
              <div className="my-auto ml-auto">
                <IconButton
                  variant="secondary"
                  size="sm"
                  icon={<EllipsisHorizontalCircleIcon className="h-4" />}
                />
              </div>
            </div>
          ))}
          {peers.length === 0 && (
            <Mono className="m-auto">No devices discovered yet.</Mono>
          )}
        </div>
      </Dropdown>
    </Card>
  );
};
