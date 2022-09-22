import type React from "react";

import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import {
  Cog8ToothIcon,
  CubeTransparentIcon,
  WindowIcon,
} from "@heroicons/react/24/outline";
import { AppConfig } from "@pages/Config/AppConfig.js";
import { DeviceConfig } from "@pages/Config/DeviceConfig.js";
import { ModuleConfig } from "@pages/Config/ModuleConfig.js";

export const ConfigPage = (): JSX.Element => {
  const tabs: TabType[] = [
    {
      name: "Device Config",
      icon: <Cog8ToothIcon className="h-4" />,
      element: DeviceConfig,
    },
    {
      name: "Module Config",
      icon: <CubeTransparentIcon className="h-4" />,
      element: ModuleConfig,
    },
    {
      name: "App Config",
      icon: <WindowIcon className="h-4" />,
      element: AppConfig,
    },
  ];

  return <TabbedContent tabs={tabs} />;
};
