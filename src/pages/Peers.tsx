import type React from "react";

import toast from "react-hot-toast";
import { base16 } from "rfc4648";

import { IconButton } from "@app/components/IconButton.js";
import { Mono } from "@app/components/Mono.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  ArrowPathRoundedSquareIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const PeersPage = (): JSX.Element => {
  const { connection, nodes } = useDevice();

  return (
    <div className="w-full overflow-y-auto">
      <div className="overflow-hidden ring-1 ring-black ring-opacity-5">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="py-3.5 pr-3 pl-6 text-left text-sm font-semibold text-gray-900"
              >
                Name
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Model
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                MAC Address
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Versions
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Last Heard
              </th>
              <th
                scope="col"
                className="py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                SNR
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {nodes.map((node, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? undefined : "bg-gray-50"}
              >
                <td className="flex gap-2 whitespace-nowrap py-2 pr-3 pl-6 text-sm font-medium text-gray-900">
                  <Hashicon size={24} value={node.data.num.toString()} />
                  <span className="my-auto">
                    {/* node.data.user?.longName */}
                    {undefined ??
                      `Meshtastic_${base16
                        .stringify(node.data.user?.macaddr.subarray(4, 6) ?? [])
                        .toLowerCase()}`}
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  <span className="rounded-md bg-slate-200 p-1">
                    <Mono>
                      {Protobuf.HardwareModel[node.data.user?.hwModel ?? 0]}
                    </Mono>
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  <Mono>
                    {base16
                      .stringify(node.data.user?.macaddr ?? [])
                      .match(/.{1,2}/g)
                      ?.join(":") ?? ""}
                  </Mono>
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  {node.metadata ? (
                    <>
                      <Mono>{node.metadata.firmwareVersion}</Mono>
                      <span className="text-black">/</span>
                      <Mono>{node.metadata.deviceStateVersion}</Mono>
                    </>
                  ) : (
                    <IconButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (connection) {
                          void toast.promise(
                            connection.getMetadata(node.data.num),
                            {
                              loading: "Requesting Metadata...",
                              success: "Recieved Metadata",
                              error: "No response received"
                            }
                          );
                        }
                      }}
                      icon={<ArrowPathRoundedSquareIcon className="h-4" />}
                    />
                  )}
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  {new Date(node.data.lastHeard).toLocaleTimeString()}
                </td>
                <td className="whitespace-nowrap py-2 text-sm text-gray-500">
                  <Mono>{node.data.snr}db</Mono>
                </td>
                <td className="relative whitespace-nowrap pl-3 pr-4 text-right text-sm font-medium">
                  <IconButton
                    size="sm"
                    variant="secondary"
                    icon={<EllipsisHorizontalIcon className="h-4" />}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
