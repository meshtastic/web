import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useAppStore, useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { ChannelConfig } from "@pages/Config/ChannelConfig.tsx";
import { DeviceConfig } from "@pages/Config/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Config/ModuleConfig.tsx";
import {
  BoxesIcon,
  LayersIcon,
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
    workingChannelConfig,
    connection,
    removeWorkingConfig,
    removeWorkingModuleConfig,
    removeWorkingChannelConfig,
    setConfig,
    setModuleConfig,
    addChannel,
  } = useDevice();
  const { isDirtyForm, isValidForm, setDirtyForm, setValidForm } =
    useAppStore();

  const [activeConfigSection, setActiveConfigSection] = useState<
    "device" | "module" | "channel"
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
    setIsSaving(true);

    try {
      // Save all working channel configs first, doesn't require a commit/reboot
      await Promise.all(
        workingChannelConfig.map((channel) =>
          connection?.setChannel(channel).then(() => {
            toast({
              title: t("toast.savedChannel.title", {
                ns: "ui",
                channelName: channel.settings?.name,
              }),
            });
          }),
        ),
      );

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
          formMethods.reset(undefined, {
            keepDirty: false,
            keepErrors: false,
            keepTouched: false,
            keepValues: false,
          });

          // Force RHF to re-validate and emit state
          formMethods.trigger();
        }

        workingChannelConfig.map((newChannel) => addChannel(newChannel));
        workingConfig.map((newConfig) => setConfig(newConfig));
        workingModuleConfig.map((newModuleConfig) =>
          setModuleConfig(newModuleConfig),
        );

        removeWorkingChannelConfig();
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
      setDirtyForm(false);
      setValidForm(true);
      toast({
        title: t("toast.saveAllSuccess.title"),
        description: t("toast.saveAllSuccess.description"),
      });
    }
  }, [
    toast,
    t,
    workingConfig,
    connection,
    workingModuleConfig,
    workingChannelConfig,
    formMethods,
    addChannel,
    setConfig,
    setModuleConfig,
    removeWorkingConfig,
    removeWorkingModuleConfig,
    removeWorkingChannelConfig,
    setDirtyForm,
    setValidForm,
  ]);

  const handleReset = useCallback(() => {
    if (formMethods) {
      formMethods.reset();
    }
    setDirtyForm(false);
    setValidForm(true);
    removeWorkingChannelConfig();
    removeWorkingConfig();
    removeWorkingModuleConfig();
  }, [
    formMethods,
    removeWorkingConfig,
    removeWorkingModuleConfig,
    removeWorkingChannelConfig,
    setDirtyForm,
    setValidForm,
  ]);

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
          <SidebarButton
            label={t("navigation.channelConfig")}
            active={activeConfigSection === "channel"}
            onClick={() => setActiveConfigSection("channel")}
            Icon={LayersIcon}
            isDirty={workingChannelConfig.length > 0}
            count={workingChannelConfig.length}
          />
        </SidebarSection>
      </Sidebar>
    ),
    [
      activeConfigSection,
      workingConfig,
      workingModuleConfig,
      workingChannelConfig,
      t,
    ],
  );

  const hasDrafts =
    workingConfig.length > 0 ||
    workingModuleConfig.length > 0 ||
    workingChannelConfig.length > 0;
  const isValid = isValidForm();
  const isDirty = isDirtyForm();
  const hasPending = formMethods?.formState.isReady && (hasDrafts || isDirty);
  const buttonOpacity = hasPending ? "opacity-100" : "opacity-0";
  const saveDisabled = isSaving || !isValid || !hasPending;

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
        disabled: saveDisabled,
        iconClasses:
          isDirty && !isValid
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
      isDirty,
      saveDisabled,
      buttonOpacity,
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
          : activeConfigSection === "module"
            ? t("navigation.moduleConfig")
            : t("navigation.channelConfig")
      }
      actions={actions}
    >
      {activeConfigSection === "device" ? (
        <DeviceConfig onFormInit={onFormInit} />
      ) : activeConfigSection === "module" ? (
        <ModuleConfig onFormInit={onFormInit} />
      ) : (
        <ChannelConfig onFormInit={onFormInit} />
      )}
    </PageLayout>
  );
};

export default ConfigPage;
