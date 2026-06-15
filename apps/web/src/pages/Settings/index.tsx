import { deviceRoute, moduleRoute, radioRoute } from "@app/routes";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { DeviceConfig } from "@pages/Settings/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Settings/ModuleConfig.tsx";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayersIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  RouterIcon,
  SaveIcon,
  SaveOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { RadioConfig } from "./RadioConfig.tsx";

const EMPTY_DIRTY_STRING_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;
const EMPTY_DIRTY_NUMBER_SIGNAL = {
  value: [] as readonly number[],
  peek: () => [] as readonly number[],
  subscribe: () => () => {},
} as const;

const ConfigPage = () => {
  const editor = useConfigEditor();
  const editorIsDirty = useSignal(
    editor?.isDirty ?? { value: false, peek: () => false, subscribe: () => () => {} },
  );
  const dirtyRadio = useSignal(editor?.dirtyRadioSections ?? EMPTY_DIRTY_STRING_SIGNAL);
  const dirtyModule = useSignal(editor?.dirtyModuleSections ?? EMPTY_DIRTY_STRING_SIGNAL);
  const dirtyChannels = useSignal(editor?.dirtyChannels ?? EMPTY_DIRTY_NUMBER_SIGNAL);

  const [isSaving, setIsSaving] = useState(false);
  const [rhfState, setRhfState] = useState({ isDirty: false, isValid: true });
  const unsubRef = useRef<(() => void) | null>(null);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { t } = useTranslation("config");

  const configChangeCount = dirtyRadio.length;
  const moduleConfigChangeCount = dirtyModule.length;
  const channelChangeCount = dirtyChannels.length;

  const sections = useMemo(
    () => [
      {
        key: "radio",
        route: radioRoute,
        label: t("navigation.radioConfig"),
        icon: RadioTowerIcon,
        changeCount: configChangeCount,
        component: RadioConfig,
      },
      {
        key: "device",
        route: deviceRoute,
        label: t("navigation.deviceConfig"),
        icon: RouterIcon,
        changeCount: moduleConfigChangeCount,
        component: DeviceConfig,
      },
      {
        key: "module",
        route: moduleRoute,
        label: t("navigation.moduleConfig"),
        icon: LayersIcon,
        changeCount: channelChangeCount,
        component: ModuleConfig,
      },
    ],
    [t, configChangeCount, moduleConfigChangeCount, channelChangeCount],
  );

  const activeSection =
    sections.find((section) =>
      routerState.location.pathname.includes(`/settings/${section.key}`),
    ) ?? sections[0];

  const onFormInit = useCallback(<T extends FieldValues>(methods: UseFormReturn<T>) => {
    setFormMethods(methods as UseFormReturn);

    setRhfState({
      // Assume defailt on init, changes will be caught by subscription
      isDirty: false,
      isValid: true,
    });

    // Unsubscribe from previous subscriptions & subscribe to form changes
    unsubRef.current?.();
    unsubRef.current = methods.subscribe({
      formState: { isDirty: true, isValid: true },
      callback: ({ isValid, isDirty }) => {
        setRhfState({
          isDirty: isDirty ?? false,
          isValid: isValid ?? true,
        });
      },
    });
  }, []);

  useEffect(() => {
    return () => unsubRef.current?.();
  }, []);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setIsSaving(true);

    try {
      const result = await editor.commit();
      if (result.status === "error") {
        throw result.error;
      }
      toast({
        title: t("toast.saveAllSuccess.title"),
        description: t("toast.saveAllSuccess.description"),
      });

      if (formMethods) {
        formMethods.reset(formMethods.getValues(), {
          keepDirty: false,
          keepErrors: false,
          keepTouched: false,
          keepValues: true,
        });
        formMethods.trigger();
      }
    } catch {
      toast({
        title: t("toast.configSaveError.title"),
        description: t("toast.configSaveError.description"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast, t, formMethods, editor]);

  const handleReset = useCallback(() => {
    if (formMethods) {
      formMethods.reset();
    }
    editor?.reset();
  }, [formMethods, editor]);

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        <SidebarSection label={t("sidebar.label")} className="py-2 px-0">
          {sections.map((section) => (
            <SidebarButton
              key={section.key}
              label={section.label}
              active={activeSection?.key === section.key}
              onClick={() => navigate({ to: section.route.to })}
              Icon={section.icon}
              isDirty={section.changeCount > 0}
              count={section.changeCount}
            />
          ))}
        </SidebarSection>
      </Sidebar>
    ),
    [sections, activeSection?.key, navigate, t],
  );

  const hasDrafts = editorIsDirty;
  const hasPending = hasDrafts || rhfState.isDirty;
  const buttonOpacity = hasPending ? "opacity-100" : "opacity-0";
  const saveDisabled = isSaving || !rhfState.isValid || !hasPending;

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
        icon: !hasPending ? SaveOff : SaveIcon,
        isLoading: isSaving,
        disabled: saveDisabled,
        iconClasses:
          !rhfState.isValid && hasPending ? "text-red-400 cursor-not-allowed" : "cursor-pointer",
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
      hasPending,
      rhfState.isValid,
      saveDisabled,
      buttonOpacity,
      handleReset,
      handleSave,
      t,
    ],
  );

  const ActiveComponent = activeSection?.component;

  return (
    <PageLayout
      contentClassName="overflow-auto"
      leftBar={leftSidebar}
      label={activeSection?.label ?? ""}
      actions={actions}
    >
      {ActiveComponent && <ActiveComponent onFormInit={onFormInit} />}
    </PageLayout>
  );
};

export default ConfigPage;
