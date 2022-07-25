import type React from "react";
import { useState } from "react";

import { DocumentIcon, GanttChartIcon, RainIcon } from "evergreen-ui";

import { useDevice } from "@app/core/stores/deviceStore.js";
import { Tab, TabbedContent } from "@components/layout/page/TabbedContent";
import { FileBrowser } from "@pages/Extensions/FileBrowser";

import { Environment } from "./Environment.js";

export const ExtensionsPage = (): JSX.Element => {
  const [activeExtension, setActiveExtension] = useState(0);
  const { hardware } = useDevice();

  const tabs: Tab[] = [
    {
      key: 0,
      name: "File Browser",
      icon: DocumentIcon,
      element: FileBrowser,
      disabled: !hardware.hasWifi,
    },
    {
      key: 1,
      name: "Range Test",
      icon: GanttChartIcon,
      element: FileBrowser,
      disabled: !hardware.hasWifi,
    },
    {
      key: 2,
      name: "Environment",
      icon: RainIcon,
      element: Environment,
    },
  ];

  return (
    <TabbedContent
      active={activeExtension}
      setActive={setActiveExtension}
      tabs={tabs}
    />
  );
};
