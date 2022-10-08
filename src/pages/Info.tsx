import type React from "react";

import { JSONTree } from "react-json-tree";

import {
  TabbedContent,
  TabType,
} from "@app/components/layout/page/TabbedContent.js";
import { useDevice } from "@core/providers/useDevice.js";
import { EyeIcon } from "@heroicons/react/24/outline";

export const InfoPage = (): JSX.Element => {
  const { channels, config, moduleConfig, hardware, nodes, waypoints } =
    useDevice();

  const tabs: TabType[] = [
    {
      name: "Channels",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={channels} />,
    },
    {
      name: "Config",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={config} />,
    },
    {
      name: "Module Config",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={moduleConfig} />,
    },
    {
      name: "Hardware",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={hardware} />,
    },
    {
      name: "Nodes",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={nodes} />,
    },
    {
      name: "Waypoints",
      icon: <EyeIcon className="h-4" />,
      element: () => <JSONTree theme="monokai" data={waypoints} />,
    },
  ];

  return <TabbedContent tabs={tabs} />;
};
