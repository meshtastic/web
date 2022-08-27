import type React from "react";

import { ApplicationsIcon, CogIcon, CubeIcon } from "evergreen-ui";

import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import { AppConfig } from "@pages/Config/AppConfig.js";
import { DeviceConfig } from "@pages/Config/DeviceConfig.js";
import { ModuleConfig } from "@pages/Config/ModuleConfig.js";

export const ConfigPage = (): JSX.Element => {
  const tabs: TabType[] = [
    {
      name: "Device Config",
      icon: CogIcon,
      element: DeviceConfig,
    },
    {
      name: "Module Config",
      icon: CubeIcon,
      element: ModuleConfig,
    },
    {
      name: "App Config",
      icon: ApplicationsIcon,
      element: AppConfig,
    },
  ];

  return <TabbedContent tabs={tabs} />;
};
