import type React from "react";
import { useState } from "react";

import { JSONTree } from "react-json-tree";

import {
  TabbedContent,
  TabType
} from "@app/components/layout/page/TabbedContent.js";
import { useDevice } from "@core/providers/useDevice.js";
import { EyeIcon } from "@heroicons/react/24/outline";

export const InfoPage = (): JSX.Element => {
  const { config, moduleConfig, hardware, nodes, waypoints, connection } =
    useDevice();

  const [serialLogs, setSerialLogs] = useState<string>("");

  connection?.onDeviceDebugLog.subscribe((packet) => {
    setSerialLogs(serialLogs + new TextDecoder().decode(packet));
  });

  const tabs: TabType[] = [
    {
      name: "Config",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={config} />
    },
    {
      name: "Module Config",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={moduleConfig} />
    },
    {
      name: "Hardware",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={hardware} />
    },
    {
      name: "Nodes",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={nodes} />
    },
    {
      name: "Waypoints",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={waypoints} />
    },
    {
      name: "Connection",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={connection} />
    },
    {
      name: "Serial Logs",
      icon: <EyeIcon className="h-4" />,
      element: () => (
        <div>
          {serialLogs.split("\n").map((line, index) => (
            <div key={index} className="text-sm">
              {line}
            </div>
          ))}
        </div>
      )
    }
  ];

  return <TabbedContent tabs={tabs} />;
};
