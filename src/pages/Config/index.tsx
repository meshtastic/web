import { TabbedContent, TabType } from "@components/generic/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
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
      label: "Device Config",
      icon: <Cog8ToothIcon className="h-4" />,
      element: DeviceConfig
    },
    {
      label: "Module Config",
      icon: <CubeTransparentIcon className="h-4" />,
      element: ModuleConfig
    },
    {
      label: "App Config",
      icon: <WindowIcon className="h-4" />,
      element: AppConfig
    }
  ];

  return <TabbedContent tabs={tabs} />;
};
