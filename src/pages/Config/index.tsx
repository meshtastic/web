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
import { useTranslation } from "react-i18next";

const ConfigPage = () => {
  const { workingConfig, workingModuleConfig, connection } = useDevice();
  const { hasErrors } = useAppStore();
  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const isError = hasErrors();
  const { t } = useTranslation("deviceConfig");

  const handleSave = async () => {
    if (hasErrors()) {
      return toast({
        title: t("toast.validationError.title"),
        description: t("toast.validationError.description"),
      });
    }

    setIsSaving(true);
    try {
      if (activeConfigSection === "device") {
        await Promise.all(
          workingConfig.map((config) =>
            connection?.setConfig(config).then(() =>
              toast({
                title: t("toast.saveSuccess.title"),
                description: t("toast.saveSuccess.description", {
                  case: config.payloadVariant.case,
                }),
              })
            )
          ),
        );
      } else {
        await Promise.all(
          workingModuleConfig.map((moduleConfig) =>
            connection?.setModuleConfig(moduleConfig).then(() =>
              toast({
                title: t("toast.saveSuccess.title"),
                description: t("toast.saveSuccess.description", {
                  case: moduleConfig.payloadVariant.case,
                }),
              })
            )
          ),
        );
        setIsSaving(false);
      }
      await connection?.commitEditSettings();
    } catch (_error) {
      toast({
        title: t("toast.configSaveError.title"),
        description: t("toast.configSaveError.description"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        <SidebarSection
          label={t("sidebar.label")}
          className="py-2 px-0"
        >
          <SidebarButton
            label={t("navigation.radioConfig")}
            active={activeConfigSection === "device"}
            onClick={() => setActiveConfigSection("device")}
            Icon={SettingsIcon}
          />
          <SidebarButton
            label={t("navigation.moduleConfig")}
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
          ? t("navigation.radioConfig")
          : t("navigation.moduleConfig")}
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
