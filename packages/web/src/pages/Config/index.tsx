import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useAppStore, useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { DeviceConfig } from "@pages/Config/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Config/ModuleConfig.tsx";
import {
  BoxesIcon,
  RefreshCwIcon,
  SaveIcon,
  SaveOff,
  SettingsIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

const ConfigPage = () => {
  const {
    workingConfig,
    workingModuleConfig,
    connection,
    removeWorkingConfig,
    removeWorkingModuleConfig,
    setConfig,
    setModuleConfig,
  } = useDevice();
  const { hasErrors } = useAppStore();

  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module"
  >("device");
  const [isSaving, setIsSaving] = useState(false);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation("deviceConfig");

  const onFormInit = useCallback(
    <T extends FieldValues>(methods: UseFormReturn<T>) => {
      setFormMethods(methods as UseFormReturn);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (hasErrors()) {
      return toast({
        title: t("toast.validationError.title"),
        description: t("toast.validationError.description"),
      });
    }

    setIsSaving(true);

    try {
      await Promise.all(
        workingConfig.map((newConfig) =>
          connection?.setConfig(newConfig).then(() => {
            toast({
              title: t("toast.saveSuccess.title"),
              description: t("toast.saveSuccess.description", {
                case: newConfig.payloadVariant.case,
              }),
            });
          }),
        ),
      );

      await Promise.all(
        workingModuleConfig.map((newModuleConfig) =>
          connection?.setModuleConfig(newModuleConfig).then(() =>
            toast({
              title: t("toast.saveSuccess.title"),
              description: t("toast.saveSuccess.description", {
                case: newModuleConfig.payloadVariant.case,
              }),
            }),
          ),
        ),
      );

      await connection?.commitEditSettings().then(() => {
        if (formMethods) {
          formMethods.reset(
            {},
            {
              keepValues: true,
            },
          );
        }

        workingConfig.map((newConfig) => setConfig(newConfig));
        workingModuleConfig.map((newModuleConfig) =>
          setModuleConfig(newModuleConfig),
        );

        removeWorkingConfig();
        removeWorkingModuleConfig();
      });
    } catch (_error) {
      toast({
        title: t("toast.configSaveError.title"),
        description: t("toast.configSaveError.description"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    hasErrors,
    toast,
    t,
    workingConfig,
    connection,
    workingModuleConfig,
    formMethods,
    setConfig,
    setModuleConfig,
    removeWorkingConfig,
    removeWorkingModuleConfig,
  ]);

  const handleReset = useCallback(() => {
    if (formMethods) {
      formMethods.reset();
    }

    removeWorkingConfig();
    removeWorkingModuleConfig();
  }, [formMethods, removeWorkingConfig, removeWorkingModuleConfig]);

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        <SidebarSection label={t("sidebar.label")} className="py-2 px-0">
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
    [activeConfigSection, workingConfig, workingModuleConfig, t],
  );

  const buttonOpacity = useMemo(() => {
    const isFormDirty = formMethods?.formState.isDirty ?? false;
    const hasDirtyFields =
      (Object.keys(formMethods?.formState.dirtyFields ?? {}).length ?? 0) > 0;
    const hasWorkingConfig = workingConfig.length > 0;
    const hasWorkingModuleConfig = workingModuleConfig.length > 0;

    const shouldShowButton =
      (isFormDirty && hasDirtyFields) ||
      hasWorkingConfig ||
      hasWorkingModuleConfig;

    return shouldShowButton ? "opacity-100" : "opacity-0";
  }, [
    formMethods?.formState.isDirty,
    formMethods?.formState.dirtyFields,
    workingConfig,
    workingModuleConfig,
  ]);

  const isValid = useMemo(() => {
    return Object.keys(formMethods?.formState.errors ?? {}).length === 0;
  }, [formMethods?.formState.errors]);

  const actions = useMemo(
    () => [
      {
        key: "unsavedChanges",
        label: t("common:formValidation.unsavedChanges"),
        onClick: () => {},
        className: cn([
          "bg-blue-500 text-slate-900 hover:bg-initial",
          "transition-colors duration-200",
          buttonOpacity,
          "transition-opacity",
        ]),
      },
      {
        key: "reset",
        icon: RefreshCwIcon,
        label: t("common:button.reset"),
        onClick: handleReset,
        className: cn([
          buttonOpacity,
          "transition-opacity hover:bg-slate-200 disabled:hover:bg-white",
          "hover:dark:bg-slate-300  hover:dark:text-black cursor-pointer",
        ]),
      },
      {
        key: "save",
        icon: !isValid ? SaveOff : SaveIcon,
        isLoading: isSaving,
        disabled:
          isSaving ||
          !isValid ||
          (workingConfig.length === 0 && workingModuleConfig.length === 0),
        iconClasses: !isValid
          ? "text-red-400 cursor-not-allowed"
          : "cursor-pointer",
        className: cn([
          "transition-opacity hover:bg-slate-200 disabled:hover:bg-white",
          "hover:dark:bg-slate-300 hover:dark:text-black",
          "disabled:hover:cursor-not-allowed cursor-pointer",
        ]),
        onClick: handleSave,
        label: t("common:button.save"),
      },
    ],
    [
      isSaving,
      isValid,
      buttonOpacity,
      workingConfig,
      workingModuleConfig,
      handleReset,
      handleSave,
      t,
    ],
  );

  return (
    <PageLayout
      contentClassName="overflow-auto"
      leftBar={leftSidebar}
      label={
        activeConfigSection === "device"
          ? t("navigation.radioConfig")
          : t("navigation.moduleConfig")
      }
      actions={actions}
    >
      {activeConfigSection === "device" ? (
        <DeviceConfig onFormInit={onFormInit} />
      ) : (
        <ModuleConfig onFormInit={onFormInit} />
      )}
    </PageLayout>
  );
};

export default ConfigPage;
