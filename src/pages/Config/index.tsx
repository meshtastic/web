import { Sidebar } from "@app/components/Sidebar.js";
import { SettingsIcon, BoxesIcon, SaveIcon } from "lucide-react";
import { DeviceConfig } from "@pages/Config/DeviceConfig.js";
import { ModuleConfig } from "@pages/Config/ModuleConfig.js";
import { PageLayout } from "@app/components/PageLayout.js";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { useState } from "react";
import { useDevice } from "@app/core/stores/deviceStore.js";
import { SidebarButton } from "@app/components/UI/Sidebar/sidebarButton.js";

export const ConfigPage = (): JSX.Element => {
  const { workingConfig, workingModuleConfig, connection } = useDevice();
  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");

  return (
    <>
      <Sidebar>
        <SidebarSection label="Config Sections">
          <SidebarButton
            label="Device Config"
            active={activeConfigSection === "device"}
            onClick={() => setActiveConfigSection("device")}
            icon={SettingsIcon}
          />
          <SidebarButton
            label="Module Config"
            active={activeConfigSection === "module"}
            onClick={() => setActiveConfigSection("module")}
            icon={BoxesIcon}
          />
        </SidebarSection>
      </Sidebar>
      <PageLayout
        label={
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
