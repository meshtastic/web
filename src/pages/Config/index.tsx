import type React from "react";

import { Button } from "@app/components/form/Button.js";
import { TabbedContent, TabType } from "@app/components/generic/TabbedContent";
import { useDevice } from "@app/core/providers/useDevice.js";
import {
  Cog8ToothIcon,
  CubeTransparentIcon,
  WindowIcon
} from "@heroicons/react/24/outline";
import { AppConfig } from "@pages/Config/AppConfig.js";
import { DeviceConfig } from "@pages/Config/DeviceConfig.js";
import { ModuleConfig } from "@pages/Config/ModuleConfig.js";

export const ConfigPage = (): JSX.Element => {
  const { connection, pendingSettingsChanges } = useDevice();

  const tabs: TabType[] = [
    {
      name: "Device Config",
      icon: <Cog8ToothIcon className="h-4" />,
      element: DeviceConfig
    },
    {
      name: "Module Config",
      icon: <CubeTransparentIcon className="h-4" />,
      element: ModuleConfig
    },
    {
      name: "App Config",
      icon: <WindowIcon className="h-4" />,
      element: AppConfig
    }
  ];

  return <TabbedContent tabs={tabs} />;
};
