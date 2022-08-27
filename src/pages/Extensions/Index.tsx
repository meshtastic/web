import type React from "react";

import { DocumentIcon, GanttChartIcon, RainIcon } from "evergreen-ui";

import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
import { Environment } from "@pages/Extensions/Environment.js";
import { FileBrowser } from "@pages/Extensions/FileBrowser";

export const ExtensionsPage = (): JSX.Element => {
  const { hardware } = useDevice();

  const tabs: TabType[] = [
    {
      name: "File Browser",
      icon: DocumentIcon,
      element: FileBrowser,
      disabled: !hardware.hasWifi,
    },
    {
      name: "Range Test",
      icon: GanttChartIcon,
      element: FileBrowser,
      disabled: !hardware.hasWifi,
    },
    {
      name: "Environment",
      icon: RainIcon,
      element: Environment,
    },
  ];

  return <TabbedContent tabs={tabs} />;
};
