import { Sidebar } from "@app/components/Sidebar.js";
import { SettingsIcon, BoxesIcon, SaveIcon } from "lucide-react";
import { DeviceConfig } from "@pages/Config/DeviceConfig.js";
import { ModuleConfig } from "@pages/Config/ModuleConfig.js";
import { PageLayout } from "@app/components/Topbar.js";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { SidebarItem } from "@app/components/UI/Sidebar/SidebarItem.js";
import { useState } from "react";
import { useDevice } from "@app/core/stores/deviceStore.js";

export const ConfigPage = (): JSX.Element => {
  const { workingConfig, workingModuleConfig, connection } = useDevice();
  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");

  return (
    <>
      <Sidebar>
        <SidebarSection title="Config Sections">
          <SidebarItem
            icon={SettingsIcon}
            label="Device Config"
            active={activeConfigSection === "device"}
            onClick={() => setActiveConfigSection("device")}
          />
          <SidebarItem
            icon={BoxesIcon}
            label="Module Config"
            active={activeConfigSection === "module"}
            onClick={() => setActiveConfigSection("module")}
          />
        </SidebarSection>
        <div className="space-y-1.5">
          <div className="bg-palette-0 sticky top-0 pb-2">
            <div className="text-palette-700 flex items-center justify-between px-2">
              <div className="text-base font-medium"></div>
            </div>
          </div>
          <ul className="space-y-1"></ul>
        </div>
      </Sidebar>
      <PageLayout
        title={
          activeConfigSection === "device" ? "Device Config" : "Module Config"
        }
        actions={[
          {
            icon: SaveIcon,
            async onClick() {
              if (activeConfigSection === "device") {
                workingConfig.map(
                  async (config) => await connection?.setConfig(config)
                );
              } else {
                workingModuleConfig.map(
                  async (config) => await connection?.setModuleConfig(config)
                );
              }

              await connection?.commitEditSettings();
            }
          }
        ]}
      >
        <div className="p-3">
          {activeConfigSection === "device" ? (
            <DeviceConfig />
          ) : (
            <ModuleConfig />
          )}
        </div>
      </PageLayout>
    </>
  );
};
