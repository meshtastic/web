import type React from "react";

import toast from "react-hot-toast";
import { base16 } from "rfc4648";

import { IconButton } from "@app/components/form/IconButton.js";
import { Mono } from "@app/components/generic/Mono.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  ArrowPathRoundedSquareIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";
import TimeAgo from "timeago-react";

export const PeersPage = (): JSX.Element => {
  const { connection, nodes } = useDevice();

  return (
    <div className="w-full overflow-y-auto">
      <table className="min-w-full">
        <thead className="bg-backgroundPrimary text-sm font-semibold text-textPrimary">
          <tr>
            <th scope="col" className="py-2 pr-3 pl-6 text-left">
              Name
            </th>
            <th scope="col" className="py-2 text-left">
              Model
            </th>
            <th scope="col" className="py-2 text-left">
              MAC Address
            </th>
            <th scope="col" className="py-2 text-left">
              Versions
            </th>
            <th scope="col" className="py-2 text-left">
              Last Heard
            </th>
            <th scope="col" className="py-2 text-left">
              SNR
            </th>
            <th scope="col" className="relative py-2 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node, index) => (
            <tr key={index}>
              <td className="flex gap-2 whitespace-nowrap py-2 pr-3 pl-6 text-sm font-medium text-textPrimary">
                <Hashicon size={24} value={node.data.num.toString()} />
                <span className="my-auto">
                  {node.data.user?.longName ??
                    `Meshtastic_${base16
                      .stringify(node.data.user?.macaddr.subarray(4, 6) ?? [])
                      .toLowerCase()}`}
                </span>
              </td>
              <td className="whitespace-nowrap py-2 text-sm text-textSecondary">
                <span className="bg-slate-200 rounded-md p-1">
                  <Mono>
                    {Protobuf.HardwareModel[node.data.user?.hwModel ?? 0]}
                  </Mono>
                </span>
              </td>
              <td className="whitespace-nowrap py-2 text-sm text-textSecondary">
                <Mono>
                  {base16
                    .stringify(node.data.user?.macaddr ?? [])
                    .match(/.{1,2}/g)
                    ?.join(":") ?? ""}
                </Mono>
              </td>
              <td className="whitespace-nowrap py-2 text-sm text-textSecondary">
                {node.metadata ? (
                  <>
                    <Mono>{node.metadata.firmwareVersion}</Mono>
                    <span className="text-black">/</span>
                    <Mono>{node.metadata.deviceStateVersion}</Mono>
                  </>
                ) : (
                  <IconButton
                    size="sm"
                    onClick={() => {
                      if (connection) {
                        void toast.promise(
                          connection.getMetadata({ nodeNum: node.data.num }),
                          {
                            loading: "Requesting Metadata...",
                            success: "Received Metadata",
                            error: "No response received"
                          }
                        );
                      }
                    }}
                    icon={<ArrowPathRoundedSquareIcon className="h-4" />}
                  />
                )}
              </td>
              <td className="whitespace-nowrap py-2 text-sm text-textSecondary">
                <TimeAgo
                  datetime={node.data.lastHeard * 1000}
                  opts={{ minInterval: 10 }}
                />
              </td>
              <td className="whitespace-nowrap py-2 text-sm text-textSecondary">
                <Mono>{node.data.snr}db</Mono>
              </td>
              <td className="relative whitespace-nowrap pl-3 pr-4 text-right text-sm font-medium">
                <IconButton
                  size="sm"
                  icon={<EllipsisHorizontalIcon className="h-4" />}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
