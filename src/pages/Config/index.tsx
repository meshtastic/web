import { useAppStore } from "../../core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "../../components/UI/Sidebar/SidebarButton.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { DeviceConfig } from "@pages/Config/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Config/ModuleConfig.tsx";
import { BoxesIcon, SaveIcon, SaveOff, SettingsIcon } from "lucide-react";
import { useMemo, useState } from "react";

const ConfigPage = () => {
  const { workingConfig, workingModuleConfig, connection } = useDevice();
  const { hasErrors } = useAppStore();
  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const isError = hasErrors();

  const handleSave = async () => {
    if (hasErrors()) {
      return toast({
        title: "Config Errors Exist",
        description: "Please fix the configuration errors before saving.",
      });
    }

    setIsSaving(true);
    try {
      if (activeConfigSection === "device") {
        await Promise.all(
          workingConfig.map((config) =>
            connection?.setConfig(config).then(() =>
              toast({
                title: "Saving Config",
                description:
                  `The configuration change ${config.payloadVariant.case} has been saved.`,
              })
            )
          ),
        );
      } else {
        await Promise.all(
          workingModuleConfig.map((moduleConfig) =>
            connection?.setModuleConfig(moduleConfig).then(() =>
              toast({
                title: "Saving Config",
                description:
                  `The configuration change ${moduleConfig.payloadVariant.case} has been saved.`,
              })
            )
          ),
        );
        setIsSaving(false);
      }
      await connection?.commitEditSettings();
    } catch (_error) {
      toast({
        title: "Error Saving Config",
        description: "An error occurred while saving the configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        <SidebarSection label="Modules">
          <SidebarButton
            label="Radio Config"
            active={activeConfigSection === "device"}
            onClick={() => setActiveConfigSection("device")}
            Icon={SettingsIcon}
          />
          <SidebarButton
            label="Module Config"
            active={activeConfigSection === "module"}
            onClick={() => setActiveConfigSection("module")}
            Icon={BoxesIcon}
          />
        </SidebarSection>
      </Sidebar>
    ),
    [activeConfigSection],
  );

  return (
    <>
      <PageLayout
        contentClassName="overflow-auto"
        leftBar={leftSidebar}
        label={activeConfigSection === "device"
          ? "Radio Config"
          : "Module Config"}
        actions={[
          {
            key: "save",
            icon: isError ? SaveOff : SaveIcon,
            isLoading: isSaving,
            disabled: isSaving,
            iconClasses: isError ? "text-red-400 cursor-not-allowed" : "",
            onClick: handleSave,
          },
        ]}
      >
        {activeConfigSection === "device" ? <DeviceConfig /> : <ModuleConfig />}
      </PageLayout>
    </>
  );
};

export default ConfigPage;
