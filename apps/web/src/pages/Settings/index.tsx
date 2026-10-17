import { Channels } from "@components/PageComponents/Channels/Channels.tsx";
import { LoRa } from "@components/PageComponents/Settings/LoRa.tsx";
import { Security } from "@components/PageComponents/Settings/Security/Security.tsx";
import { User } from "@components/PageComponents/Settings/User.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { About } from "@pages/Settings/About.tsx";
import { Administration } from "@pages/Settings/Administration.tsx";
import { AppSettings } from "@pages/Settings/AppSettings.tsx";
import { BackupRestore } from "@pages/Settings/BackupRestore.tsx";
import { CleanNodeDb } from "@pages/Settings/CleanNodeDb.tsx";
import { DebugPanel } from "@pages/Settings/DebugPanel.tsx";
import { DeviceConfig } from "@pages/Settings/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Settings/ModuleConfig.tsx";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArchiveRestoreIcon,
  BookOpenIcon,
  BugIcon,
  EraserIcon,
  HardDriveUploadIcon,
  InfoIcon,
  LayersIcon,
  ListIcon,
  type LucideIcon,
  PaletteIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  RouterIcon,
  SaveIcon,
  SaveOff,
  ShieldAlertIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { dirtyDeviceTabs, dirtyModuleTabs } from "./dirtySections.ts";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

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
const EMPTY_STAGED_SIGNAL = {
  value: new Map() as ReadonlyMap<string, unknown>,
  peek: () => new Map() as ReadonlyMap<string, unknown>,
  subscribe: () => () => {},
} as const;
const EMPTY_BOOLEAN_SIGNAL = {
  value: false,
  peek: () => false,
  subscribe: () => () => {},
} as const;

const FIRMWARE_FLASHER_URL = "https://flasher.meshtastic.org";
const DOCS_URL = "https://meshtastic.org/docs/";

const carded =
  (Form: ComponentType<ConfigProps>): ComponentType<ConfigProps> =>
  ({ onFormInit }) => (
    <SettingsCard>
      <Form onFormInit={onFormInit} />
    </SettingsCard>
  );

const UserPage = carded(User);
const LoRaPage = carded(LoRa);
const ChannelsPage = carded(Channels);
const SecurityPage = carded(Security);

type SettingsSection = {
  /** Path segment under /settings. */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Opens in a new tab instead of rendering a page. */
  href?: string;
  component?: ComponentType<ConfigProps>;
  /** Shows Save / Reset; true for pages that edit device config. */
  edits?: boolean;
  changeCount?: number;
};

type SettingsGroup = {
  key: string;
  label: string;
  sections: SettingsSection[];
};

const ConfigPage = () => {
  const editor = useConfigEditor();
  const editorIsDirty = useSignal(editor?.isDirty ?? EMPTY_BOOLEAN_SIGNAL);
  const dirtyRadio = useSignal(
    editor?.dirtyRadioSections ?? EMPTY_DIRTY_STRING_SIGNAL,
  );
  const dirtyModule = useSignal(
    editor?.dirtyModuleSections ?? EMPTY_DIRTY_STRING_SIGNAL,
  );
  const dirtyChannels = useSignal(
    editor?.dirtyChannels ?? EMPTY_DIRTY_NUMBER_SIGNAL,
  );
  const isOwnerDirty = useSignal(editor?.isOwnerDirty ?? EMPTY_BOOLEAN_SIGNAL);
  const staged = useSignal(editor?.stagedAdminMessages ?? EMPTY_STAGED_SIGNAL);

  const [isSaving, setIsSaving] = useState(false);
  const [rhfState, setRhfState] = useState({ isDirty: false, isValid: true });
  const unsubRef = useRef<(() => void) | null>(null);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation("config");

  // Grouped like Android's Settings screen.
  const groups: SettingsGroup[] = useMemo(() => {
    const radioCount = (key: string) => (dirtyRadio.includes(key) ? 1 : 0);
    // The status message is a module field that lives on the User page.
    const statusDirty = dirtyModule.includes("statusmessage") ? 1 : 0;
    return [
      {
        key: "configuration",
        label: t("sidebar.configuration"),
        sections: [
          {
            key: "user",
            label: t("navigation.user"),
            icon: UserIcon,
            component: UserPage,
            edits: true,
            changeCount: (isOwnerDirty ? 1 : 0) + statusDirty,
          },
          {
            key: "lora",
            label: t("navigation.lora"),
            icon: RadioTowerIcon,
            component: LoRaPage,
            edits: true,
            changeCount: radioCount("lora"),
          },
          {
            key: "channels",
            label: t("navigation.channels"),
            icon: ListIcon,
            component: ChannelsPage,
            edits: true,
            changeCount: dirtyChannels.length,
          },
          {
            key: "security",
            label: t("navigation.security"),
            icon: ShieldIcon,
            component: SecurityPage,
            edits: true,
            changeCount: radioCount("security"),
          },
          {
            key: "device",
            label: t("navigation.deviceConfiguration"),
            icon: RouterIcon,
            component: DeviceConfig,
            edits: true,
            changeCount: dirtyDeviceTabs(dirtyRadio, staged.keys()).size,
          },
          {
            key: "module",
            label: t("navigation.moduleConfiguration"),
            icon: LayersIcon,
            component: ModuleConfig,
            edits: true,
            changeCount: dirtyModuleTabs(dirtyModule, staged.keys()).size,
          },
          {
            key: "administration",
            label: t("navigation.administration"),
            icon: ShieldAlertIcon,
            component: Administration,
          },
        ],
      },
      {
        key: "backupRestore",
        label: t("sidebar.backupRestore"),
        sections: [
          {
            key: "backup",
            label: t("navigation.deviceProfile"),
            icon: ArchiveRestoreIcon,
            component: BackupRestore,
          },
        ],
      },
      {
        key: "advanced",
        label: t("sidebar.advanced"),
        sections: [
          {
            key: "firmware",
            label: t("navigation.firmwareUpdate"),
            icon: HardDriveUploadIcon,
            href: FIRMWARE_FLASHER_URL,
          },
          {
            key: "clean-nodes",
            label: t("navigation.cleanNodeDb"),
            icon: EraserIcon,
            component: CleanNodeDb,
          },
          {
            key: "debug",
            label: t("navigation.debugPanel"),
            icon: BugIcon,
            component: DebugPanel,
          },
        ],
      },
      {
        key: "app",
        label: t("sidebar.app"),
        sections: [
          {
            key: "app",
            label: t("navigation.appSettings"),
            icon: PaletteIcon,
            component: AppSettings,
          },
        ],
      },
      {
        key: "information",
        label: t("sidebar.information"),
        sections: [
          {
            key: "about",
            label: t("navigation.about"),
            icon: InfoIcon,
            component: About,
          },
          {
            key: "help",
            label: t("navigation.help"),
            icon: BookOpenIcon,
            href: DOCS_URL,
          },
        ],
      },
    ];
  }, [t, dirtyRadio, dirtyModule, dirtyChannels, isOwnerDirty, staged]);

  const sections = useMemo(
    () => groups.flatMap((group) => group.sections),
    [groups],
  );
  const segment = pathname.split("/")[2] ?? "";
  const activeSection =
    sections.find((section) => section.component && section.key === segment) ??
    sections[0];

  const onFormInit = useCallback(
    <T extends FieldValues>(methods: UseFormReturn<T>) => {
      setFormMethods(methods as UseFormReturn);

      setRhfState({
        // Assume default on init, changes will be caught by subscription
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
    },
    [],
  );

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

  const openSection = useCallback(
    (section: SettingsSection) => {
      if (section.href) {
        window.open(section.href, "_blank", "noopener,noreferrer");
        return;
      }
      navigate({ to: `/settings/${section.key}` });
    },
    [navigate],
  );

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        {groups.map((group) => (
          <SidebarSection
            key={group.key}
            label={group.label}
            className="py-2 px-0"
          >
            {group.sections.map((section) => (
              <SidebarButton
                key={section.key}
                label={section.label}
                active={activeSection?.key === section.key}
                onClick={() => openSection(section)}
                Icon={section.icon}
                isDirty={(section.changeCount ?? 0) > 0}
                count={section.changeCount}
              />
            ))}
          </SidebarSection>
        ))}
      </Sidebar>
    ),
    [groups, activeSection?.key, openSection],
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
          !rhfState.isValid && hasPending
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
      // Pending edits stay visible from any page so they aren't forgotten.
      actions={activeSection?.edits || hasPending ? actions : []}
    >
      {ActiveComponent && <ActiveComponent onFormInit={onFormInit} />}
    </PageLayout>
  );
};

export default ConfigPage;
