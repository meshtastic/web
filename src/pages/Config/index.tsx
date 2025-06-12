import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";

import { useToast } from "@core/hooks/useToast.ts";
import { DeviceConfig } from "@pages/Config/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Config/ModuleConfig.tsx";
import {
  BoxesIcon,
  RefreshCwIcon,
  SaveIcon,
  SaveOff,
  SettingsIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@core/utils/cn.ts";
import type { UseFormReturn } from "react-hook-form";

const ConfigPage = () => {
  const {
    workingConfig,
    workingModuleConfig,
    connection,
    removeWorkingConfig,
    removeWorkingModuleConfig,
  } = useDevice();
  const { hasErrors } = useAppStore();

  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");
  const [isSaving, setIsSaving] = useState(false);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);

  const { toast } = useToast();
  const isError = hasErrors();
  const { t } = useTranslation("deviceConfig");

  const onFormInit = (methods: UseFormReturn) => {
    setFormMethods(methods);
  };

  const handleSave = async () => {
    if (hasErrors()) {
      return toast({
        title: t("toast.validationError.title"),
        description: t("toast.validationError.description"),
      });
    }
    if (
      (activeConfigSection === "device" && workingConfig.length === 0) ||
      (activeConfigSection === "module" && workingModuleConfig.length === 0)
    ) return;

    setIsSaving(true);
    try {
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

      await connection?.commitEditSettings().then(() => {
        removeWorkingConfig();
        removeWorkingModuleConfig();

        if (formMethods) {
          formMethods.reset({
            keepDefaultValues: true,
            keepDirty: false,
            keepDirtyValues: true,
          });
        }
      });
    } catch (_error) {
      toast({
        title: t("toast.configSaveError.title"),
        description: t("toast.configSaveError.description"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (formMethods) {
      formMethods.reset();
    }

    removeWorkingConfig();
    removeWorkingModuleConfig();
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
            isDirty={workingConfig.length > 0}
            count={workingConfig.length}
          />
          <SidebarButton
            label={t("navigation.moduleConfig")}
            active={activeConfigSection === "module"}
            onClick={() => setActiveConfigSection("module")}
            Icon={BoxesIcon}
            isDirty={workingModuleConfig.length > 0}
            count={workingModuleConfig.length}
          />
        </SidebarSection>
      </Sidebar>
    ),
    [activeConfigSection, workingConfig, workingModuleConfig],
  );

  const buttonOpacity = useMemo(
    () => (formMethods?.formState.isDirty ||
        workingConfig.length > 0 || workingModuleConfig.length > 0
      ? "opacity-100"
      : "opacity-0"),
    [formMethods?.formState.isDirty, workingConfig, workingModuleConfig],
  );

  const actions = useMemo(() => [
    {
      key: "unsavedChanges",
      label: t("common:formValidation.unsavedChanges"),
      onClick: () => {},
      className: cn([
        "bg-blue-500 hover:bg-blue-500 text-white hover:text-white",
        buttonOpacity,
        "transition-opacity",
      ]),
    },
    {
      key: "reset",
      icon: RefreshCwIcon,
      label: t("common:button.reset"),
      onClick: handleReset,
      className: cn([buttonOpacity, "transition-opacity"]),
    },
    {
      key: "save",
      icon: isError ? SaveOff : SaveIcon,
      isLoading: isSaving,
      disabled: isSaving ||
        (workingConfig.length === 0 && workingModuleConfig.length === 0),
      iconClasses: isError ? "text-red-400 cursor-not-allowed" : "",
      onClick: handleSave,
      label: t("common:button.save"),
    },
  ], [
    activeConfigSection,
    isError,
    isSaving,
    buttonOpacity,
  ]);

  return (
    <>
      <PageLayout
        contentClassName="overflow-auto"
        leftBar={leftSidebar}
        label={activeConfigSection === "device"
          ? t("navigation.radioConfig")
          : t("navigation.moduleConfig")}
        actions={actions}
      >
        {activeConfigSection === "device"
          ? <DeviceConfig onFormInit={onFormInit} />
          : <ModuleConfig onFormInit={onFormInit} />}
      </PageLayout>
    </>
  );
};

export default ConfigPage;
