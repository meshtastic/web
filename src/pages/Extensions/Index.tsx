import type React from "react";

import { TabbedContent, TabType } from "@app/components/generic/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
import {
  CloudIcon,
  DocumentIcon,
  SignalIcon
} from "@heroicons/react/24/outline";
import { Environment } from "@pages/Extensions/Environment.js";
import { FileBrowser } from "@pages/Extensions/FileBrowser";

export const ExtensionsPage = (): JSX.Element => {
  const { hardware } = useDevice();

  const tabs: TabType[] = [
    {
      name: "File Browser",
      icon: <DocumentIcon className="h-4" />,
      element: FileBrowser,
      disabled: !hardware.hasWifi
    },
    {
      name: "Range Test",
      icon: <SignalIcon className="h-4" />,
      element: FileBrowser,
      disabled: !hardware.hasWifi
    },
    {
      name: "Environment",
      icon: <CloudIcon className="h-4" />,
      element: Environment
    }
  ];

  return <TabbedContent tabs={tabs} />;
};
