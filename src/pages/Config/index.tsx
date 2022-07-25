import type React from "react";
import { useState } from "react";

import { CogIcon, CubeIcon } from "evergreen-ui";

import { Tab, TabbedContent } from "@components/layout/page/TabbedContent";

import { DeviceConfig } from "./DeviceConfig.js";
import { ModuleConfig } from "./ModuleConfig.js";

export const ConfigPage = (): JSX.Element => {
  const [activeConfig, setActiveConfig] = useState(0);

  const tabs: Tab[] = [
    {
      key: 0,
      name: "Device Config",
      icon: CogIcon,
      element: DeviceConfig,
    },
    {
      key: 1,
      name: "Module Config",
      icon: CubeIcon,
      element: ModuleConfig,
    },
  ];

  return (
    <TabbedContent
      active={activeConfig}
      setActive={setActiveConfig}
      tabs={tabs}
    />
  );
};
