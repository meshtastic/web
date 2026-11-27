import { Channels } from "@components/PageComponents/Channels/Channels.tsx";
import { LoRa } from "@components/PageComponents/Settings/LoRa.tsx";
import { Security } from "@components/PageComponents/Settings/Security/Security.tsx";
import { User } from "@components/PageComponents/Settings/User.tsx";
import { MobileSettingsList } from "@components/Settings/MobileSettingsList.tsx";
import { RemoteSectionBoundary } from "@components/Settings/RemoteSectionBoundary.tsx";
import { ManagedModeBanner } from "@components/Settings/ManagedModeBanner.tsx";
import { SettingsReadOnlyContext } from "@components/Settings/SettingsReadOnly.tsx";
import { RemoteSettingsBanner } from "@components/Settings/RemoteSettingsBanner.tsx";
import {
  type SettingsNavGroup,
  SettingsNav,
} from "@components/Settings/SettingsNav.tsx";
import { SettingsPageHeader } from "@components/Settings/SettingsPageHeader.tsx";
import { UnsavedChangesBar } from "@components/Settings/UnsavedChangesBar.tsx";
import { DeviceCard } from "@components/Shell/DeviceCard.tsx";
import { ShellPage } from "@components/Shell/ShellPage.tsx";
import { useDeviceSummary } from "@components/Shell/useDeviceSummary.ts";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import { ManagedModeNotAloneError } from "@core/kmp/configEditor.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import {
  dirtyDeviceTabs,
  dirtyModuleTabs,
  sectionChangeCounts,
} from "@core/settings/dirty.ts";
import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import { useDevice } from "@core/stores";
import { summarizeSave } from "@core/settings/remoteSettings.ts";
import {
  GROUP_LABEL_KEYS,
  MANAGED_READ_ONLY_SECTION_IDS,
  moduleDocsUrl,
  REMOTE_SECTION_IDS,
  SETTINGS_GROUP_IDS,
  SETTINGS_SECTIONS,
  type SettingsSectionDef,
  type SettingsSectionId,
  DEVICE_SUBSECTION_DOCS,
  sectionFromPath,
} from "@core/settings/registry.ts";
import { filterGroups, groupBy } from "@core/settings/search.ts";
import { About } from "@pages/Settings/About.tsx";
import { Administration } from "@pages/Settings/Administration.tsx";
import { AppSettings } from "@pages/Settings/AppSettings.tsx";
import { BackupRestore } from "@pages/Settings/BackupRestore.tsx";
import { CleanNodeDb } from "@pages/Settings/CleanNodeDb.tsx";
import { DebugPanel } from "@pages/Settings/DebugPanel.tsx";
import {
  DEVICE_TABS,
  DeviceConfig,
  useDeviceSubsection,
  visibleDeviceTabs,
} from "@pages/Settings/DeviceConfig.tsx";
import { Firmware } from "@pages/Settings/Firmware.tsx";
import { Help } from "@pages/Settings/Help.tsx";
import { MessageFilter } from "@pages/Settings/MessageFilter.tsx";
import {
  MODULE_TABS,
  ModuleConfig,
  useModuleSubsection,
  useVisibleModules,
} from "@pages/Settings/ModuleConfig.tsx";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  BugIcon,
  EraserIcon,
  FilterIcon,
  HardDriveUploadIcon,
  InfoIcon,
  LayersIcon,
  ListIcon,
  type LucideIcon,
  PaletteIcon,
  RadioTowerIcon,
  RouterIcon,
  ShieldAlertIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
import {
  type ComponentType,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Result } from "better-result";
import {
  RemoteSettingsProvider,
  useNodeName,
  useRemoteNodeParam,
  useRemoteTarget,
} from "./RemoteSettingsScope.tsx";
import type { ConfigProps } from "./sectionProps.ts";
import { useSettingsListValues } from "./useSettingsListValues.ts";

const NO_STRINGS = constantSignal<readonly string[]>([]);
const NO_NUMBERS = constantSignal<readonly number[]>([]);
const NO_STAGED = constantSignal<ReadonlyMap<string, unknown>>(new Map());
const NO_FLAG = constantSignal(false);

/** Sidebar icon and page body of each section. */
const SECTION_VIEWS = {
  user: { icon: UserIcon, component: User },
  lora: { icon: RadioTowerIcon, component: LoRa },
  channels: { icon: ListIcon, component: Channels },
  security: { icon: ShieldIcon, component: Security },
  device: { icon: RouterIcon, component: DeviceConfig },
  module: { icon: LayersIcon, component: ModuleConfig },
  administration: { icon: ShieldAlertIcon, component: Administration },
  backup: { icon: ArchiveRestoreIcon, component: BackupRestore },
  firmware: { icon: HardDriveUploadIcon, component: Firmware },
  "clean-nodes": { icon: EraserIcon, component: CleanNodeDb },
  debug: { icon: BugIcon, component: DebugPanel },
  app: { icon: PaletteIcon, component: AppSettings },
  "message-filter": { icon: FilterIcon, component: MessageFilter },
  about: { icon: InfoIcon, component: About },
  help: { icon: BookOpenIcon, component: Help },
} as const satisfies Record<
  SettingsSectionId,
  { icon: LucideIcon; component: ComponentType<ConfigProps> }
>;

/** What the page's Save and Reset act on: the open section's form. */
interface FormHandle {
  reset: () => void;
  /** Takes the saved values as the new baseline, clearing dirty marks. */
  markSaved: () => void;
}

const REMOTE_SECTIONS = SETTINGS_SECTIONS.filter((section) =>
  REMOTE_SECTION_IDS.has(section.id),
);

const SettingsScreen = () => {
  const { t } = useTranslation("config");
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const device = useDeviceSummary();
  const listValues = useSettingsListValues();

  const remote = useRemoteSettings();
  const localDevice = useDevice();
  const sections: readonly SettingsSectionDef[] = remote
    ? REMOTE_SECTIONS
    : SETTINGS_SECTIONS;
  const editor = useConfigEditor();
  const editorDirty = useSignal(editor?.isDirty ?? NO_FLAG);
  const dirtyRadio = useSignal(editor?.dirtyRadioSections ?? NO_STRINGS);
  const dirtyModule = useSignal(editor?.dirtyModuleSections ?? NO_STRINGS);
  const dirtyChannels = useSignal(editor?.dirtyChannels ?? NO_NUMBERS);
  const ownerDirty = useSignal(editor?.isOwnerDirty ?? NO_FLAG);
  const staged = useSignal(editor?.stagedAdminMessages ?? NO_STAGED);

  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [formState, setFormState] = useState({ isDirty: false, isValid: true });
  const [form, setForm] = useState<FormHandle | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const routeSection = sectionFromPath(pathname);
  // Desktop opens the first section for a bare /settings; mobile shows the list.
  const activeSection: SettingsSectionDef | undefined =
    sections.find((section) => section.id === routeSection) ??
    (isMobile ? undefined : sections[0]);
  // A section the remote node doesn't offer opens its first one instead.
  const unsupported =
    routeSection !== undefined &&
    !sections.some((section) => section.id === routeSection);
  useEffect(() => {
    if (unsupported) void navigate({ to: "/settings/user", replace: true });
  }, [unsupported, navigate]);
  const deviceSubsection = useDeviceSubsection();
  const moduleSubsection = useModuleSubsection();
  const { metadata } = useDeviceCapabilities();
  const visibleModules = useVisibleModules();

  const changeCounts = useMemo(
    () =>
      sectionChangeCounts({
        dirtyRadio,
        dirtyModule,
        dirtyChannels,
        ownerDirty,
        stagedKeys: [...staged.keys()],
      }),
    [dirtyRadio, dirtyModule, dirtyChannels, ownerDirty, staged],
  );

  const navGroups: SettingsNavGroup<SettingsSectionId>[] = useMemo(() => {
    const dirtyDevice = dirtyDeviceTabs(dirtyRadio, staged.keys());
    // Device configuration lists its pages under it, as Android does.
    const deviceSubitems = visibleDeviceTabs(metadata).map((tab) => ({
      id: tab.key,
      label: t(tab.labelKey),
      dirty: dirtyDevice.has(tab.key),
    }));
    // And Module configuration lists the modules this node offers.
    const dirtyModules = dirtyModuleTabs(dirtyModule, staged.keys());
    const moduleSubitems = visibleModules.map((tab) => ({
      id: tab.key,
      label: t(tab.labelKey, { ns: "moduleConfig" }),
      dirty: dirtyModules.has(tab.key),
    }));
    const items = sections.map((section) => ({
      id: section.id,
      group: section.group,
      label: t(section.labelKey),
      icon: SECTION_VIEWS[section.id].icon,
      dirty: (changeCounts[section.id] ?? 0) > 0,
      subitems:
        section.id === "device"
          ? deviceSubitems
          : section.id === "module"
            ? moduleSubitems
            : undefined,
      // Subsections are found by name too ("Position" finds Device configuration).
      terms:
        section.id === "device"
          ? DEVICE_TABS.map((tab) => t(tab.labelKey))
          : section.id === "module"
            ? MODULE_TABS.map((tab) => t(tab.labelKey, { ns: "moduleConfig" }))
            : [],
    }));
    return filterGroups(groupBy(items, SETTINGS_GROUP_IDS), query).map(
      (group) => ({
        id: group.group,
        label: t(GROUP_LABEL_KEYS[group.group]),
        items: group.items,
      }),
    );
  }, [
    t,
    sections,
    changeCounts,
    query,
    metadata,
    dirtyRadio,
    dirtyModule,
    staged,
    visibleModules,
  ]);

  const onFormInit = useCallback(
    <T extends object>(methods: UseFormReturn<T>) => {
      setForm({
        reset: () => methods.reset(),
        markSaved: () => {
          methods.reset(methods.getValues(), {
            keepDirty: false,
            keepErrors: false,
            keepTouched: false,
            keepValues: true,
          });
          void methods.trigger();
        },
      });
      // Assume a clean, valid form until the subscription reports otherwise.
      setFormState({ isDirty: false, isValid: true });
      unsubRef.current?.();
      unsubRef.current = methods.subscribe({
        formState: { isDirty: true, isValid: true },
        callback: ({ isValid, isDirty }) => {
          setFormState({
            isDirty: isDirty ?? false,
            isValid: isValid ?? true,
          });
        },
      });
    },
    [],
  );

  useEffect(() => () => unsubRef.current?.(), []);

  // A section without a form must not keep the last form's state.
  const sectionKey = `${activeSection?.id}|${deviceSubsection?.key}|${moduleSubsection?.key}`;
  const [formSectionKey, setFormSectionKey] = useState(sectionKey);
  if (formSectionKey !== sectionKey) {
    setFormSectionKey(sectionKey);
    setFormState({ isDirty: false, isValid: true });
    setForm(null);
  }

  const deviceName = remote
    ? remote.name
    : device.connected
      ? device.name
      : t("settingsLayout.thisRadio");

  // Each changed section goes to the node on its own; say which made it.
  const handleRemoteSave = useCallback(async () => {
    if (!remote) return;
    setIsSaving(true);
    try {
      const result = await remote.remote.save();
      const summary = Result.isOk(result)
        ? summarizeSave(result.value)
        : { saved: 0, failed: 1, skipped: 0, reason: "unreachable" as const };
      const name = remote.name;
      if (summary.failed === 0) {
        toast({
          variant: "success",
          title: t("settingsLayout.savedTitle"),
          description: t("remoteSettings.savedDescription", { name }),
        });
        form?.markSaved();
        titleRef.current?.focus();
        return;
      }
      const reasonKey =
        summary.reason === "unauthorized"
          ? "remoteSettings.failedUnauthorized"
          : summary.reason === "unreachable"
            ? "remoteSettings.failedUnreachable"
            : "remoteSettings.failedError";
      toast({
        variant: "destructive",
        title:
          summary.saved > 0
            ? t("remoteSettings.partialTitle")
            : t("remoteSettings.failedTitle", { name }),
        description:
          summary.saved > 0
            ? t("remoteSettings.partialDescription", {
                name,
                saved: summary.saved,
                total: summary.saved + summary.failed + summary.skipped,
              })
            : t(reasonKey, { name }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [remote, toast, t, form]);

  const handleSave = useCallback(async () => {
    if (remote) {
      await handleRemoteSave();
      return;
    }
    if (!editor) return;
    setIsSaving(true);
    const enablesManaged = editor.enablesManagedMode();
    try {
      const result = await editor.commit();
      if (result.status === "error") {
        throw result.error;
      }
      // Edits made while the save was in flight are still pending.
      if (editor.isDirty.value) {
        toast({
          title: t("toast.savePending.title", { ns: "ui" }),
          description: t("toast.savePending.description", { ns: "ui" }),
        });
        return;
      }
      toast({
        variant: "success",
        title: t("settingsLayout.savedTitle"),
        // Older firmware saves managed mode without restarting.
        description: t(
          enablesManaged
            ? "settingsLayout.savedManaged"
            : "settingsLayout.savedRestarting",
          { device: deviceName },
        ),
      });
      form?.markSaved();
      // The bar or Save button that had focus is going away.
      titleRef.current?.focus();
    } catch (error) {
      if (error instanceof ManagedModeNotAloneError) {
        toast({
          variant: "destructive",
          title: t("settingsLayout.managedNotAloneTitle"),
          description: t("settingsLayout.managedNotAloneDescription", {
            device: deviceName,
          }),
        });
        return;
      }
      toast({
        variant: "destructive",
        title: t("toast.configSaveError.title", { ns: "ui" }),
        description: t("toast.configSaveError.description", { ns: "ui" }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [remote, handleRemoteSave, editor, toast, t, deviceName, form]);

  const handleReset = useCallback(() => {
    form?.reset();
    editor?.reset();
    titleRef.current?.focus();
  }, [editor, form]);

  const openSection = useCallback(
    (id: SettingsSectionId) => {
      void navigate({ to: `/settings/${id}` });
    },
    [navigate],
  );

  const openSubsection = useCallback(
    (id: SettingsSectionId, subId: string) => {
      // The Device form is the section's own page, without `?tab=`.
      void navigate(
        id === "device" && subId === "device"
          ? { to: "/settings/device" }
          : { to: `/settings/${id}`, search: { tab: subId } },
      );
    },
    [navigate],
  );

  // A managed radio ignores admin messages from this app, so its own
  // settings are shown read-only. A remote node takes ours regardless.
  const managed = !remote && localDevice.config?.security?.isManaged === true;
  const readOnly =
    managed &&
    activeSection !== undefined &&
    MANAGED_READ_ONLY_SECTION_IDS.has(activeSection.id);
  const hasPending = !readOnly && (editorDirty || formState.isDirty);

  const exitRemote = useCallback(() => {
    void navigate({ to: "/settings", search: { node: undefined } });
  }, [navigate]);
  const banner = remote ? (
    <RemoteSettingsBanner name={remote.name} onExit={exitRemote} />
  ) : managed ? (
    <ManagedModeBanner />
  ) : null;

  const sidebar = (
    <SettingsNav
      title={t("page.title")}
      groups={navGroups}
      activeId={activeSection?.id}
      activeSubId={
        activeSection?.id === "device"
          ? (deviceSubsection?.key ?? "device")
          : activeSection?.id === "module"
            ? moduleSubsection?.key
            : undefined
      }
      onSelect={openSection}
      onSelectSub={openSubsection}
      query={query}
      onQueryChange={setQuery}
    />
  );

  if (!activeSection) {
    return (
      <ShellPage label={t("page.title")} contentClassName="overflow-auto">
        <MobileSettingsList
          title={t("page.title")}
          header={
            remote ? (
              banner
            ) : (
              <>
                {banner}
                <DeviceCard />
              </>
            )
          }
          groups={navGroups}
          values={listValues}
          onSelect={openSection}
        />
      </ShellPage>
    );
  }

  const sectionLabel = t(activeSection.labelKey);
  const groupLabel = t(GROUP_LABEL_KEYS[activeSection.group]);
  const crumbs: ReactNode[] =
    activeSection.scope === "radio" ? [groupLabel, deviceName] : [groupLabel];

  // Device subsections and modules have their own title, text and docs,
  // with a way back to the list they were opened from.
  const subsection = deviceSubsection
    ? {
        title: t(deviceSubsection.labelKey),
        description: t(deviceSubsection.descriptionKey),
        docsUrl: DEVICE_SUBSECTION_DOCS[deviceSubsection.key],
      }
    : moduleSubsection
      ? {
          title: t(moduleSubsection.labelKey, { ns: "moduleConfig" }),
          description: t(`summary.${moduleSubsection.key}`, {
            ns: "moduleConfig",
          }),
          docsUrl: moduleDocsUrl(moduleSubsection.key),
        }
      : undefined;

  const backLink = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit cursor-pointer items-center gap-1.5 rounded-control py-1 text-help text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
  const goBack = subsection
    ? {
        label: t("settingsLayout.backTo", { section: sectionLabel }),
        onClick: () => openSection(activeSection.id),
      }
    : {
        label: t("settingsLayout.backToSettings"),
        onClick: () => void navigate({ to: "/settings" }),
      };

  const title = subsection?.title ?? sectionLabel;
  const note = remote
    ? t("remoteSettings.restartNote", { name: remote.name })
    : t("settingsLayout.restartNote", { device: deviceName });
  const error = formState.isValid ? undefined : t("settingsLayout.fixErrors");
  const Body = SECTION_VIEWS[activeSection.id].component;

  // Mobile, as drawn: back and Save in the header, the note at the bottom.
  const mobileHeader = isMobile
    ? {
        leading: (
          <IconButton
            aria-label={goBack.label}
            variant="rail"
            size="touch"
            icon={<ArrowLeftIcon className="size-5" />}
            onClick={goBack.onClick}
          />
        ),
        trailing: (
          <Button
            size="sm"
            variant={hasPending ? "primary" : "secondary"}
            className="relative rounded-full pointer-coarse:touch-target"
            disabled={!hasPending || isSaving || !formState.isValid}
            aria-busy={isSaving || undefined}
            onClick={() => void handleSave()}
          >
            {t("button.save", { ns: "common" })}
          </Button>
        ),
      }
    : undefined;

  return (
    <ShellPage
      label={title}
      hideLabel={!isMobile}
      leading={mobileHeader?.leading}
      trailing={mobileHeader?.trailing}
      sidebar={isMobile ? undefined : sidebar}
      sidebarLabel={t("page.title")}
      noPadding
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Outside the scroller, so it stays in view on long forms. */}
        {banner ? (
          <div className="px-4 pt-3 md:px-10 md:pt-4">
            <div className="mx-auto max-w-[760px]">{banner}</div>
          </div>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto px-4 pt-4 md:px-10 md:pt-8",
            isMobile ? "pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "pb-32",
          )}
        >
          <div className="mx-auto flex max-w-[760px] flex-col gap-5">
            <SettingsPageHeader
              leading={
                subsection && !isMobile
                  ? backLink(goBack.label, goBack.onClick)
                  : undefined
              }
              crumbs={crumbs}
              title={title}
              hideTitle={isMobile}
              titleRef={titleRef}
              description={
                subsection?.description ?? t(activeSection.descriptionKey)
              }
              docsUrl={subsection?.docsUrl ?? activeSection.docsUrl}
            />
            {remote ? (
              <RemoteSectionBoundary key={sectionKey} scope={remote}>
                <Body onFormInit={onFormInit} />
              </RemoteSectionBoundary>
            ) : (
              <Suspense fallback={<Spinner size="lg" className="my-5" />}>
                {/* Forms and actions honour it; navigation stays usable. */}
                <SettingsReadOnlyContext.Provider value={readOnly}>
                  <Body onFormInit={onFormInit} />
                </SettingsReadOnlyContext.Provider>
              </Suspense>
            )}
          </div>
        </div>
        {hasPending && isMobile ? (
          <div className="flex flex-col gap-2 rounded-card border border-warning-subtle bg-warning mx-3 mb-[max(1rem,env(safe-area-inset-bottom))] px-3.5 py-3 text-help text-warning">
            <output>{error ?? note}</output>
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={isSaving}
              onClick={handleReset}
            >
              {t("button.reset", { ns: "common" })}
            </Button>
          </div>
        ) : null}
        {hasPending && !isMobile ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-3">
            <UnsavedChangesBar
              className="pointer-events-auto"
              note={note}
              error={error}
              saving={isSaving}
              saveDisabled={!formState.isValid}
              onReset={handleReset}
              onSave={() => void handleSave()}
            />
          </div>
        ) : null}
      </div>
    </ShellPage>
  );
};

/** Why `?node=` can't open remote settings, with the way back. */
const RemoteUnavailable = ({
  nodeNum,
  reason,
}: {
  nodeNum: number;
  reason: "noRadio" | "notSetUp";
}) => {
  const { t } = useTranslation("config");
  const navigate = useNavigate();
  const name = useNodeName(nodeNum);
  return (
    <ShellPage label={t("page.title")} contentClassName="overflow-auto">
      <div className="mx-auto flex max-w-[760px] flex-col gap-3 p-4 md:p-10">
        <Callout tone="warning" title={t("remoteSettings.unavailableTitle")}>
          {t(`remoteSettings.${reason}`, { name })}
        </Callout>
        <Button
          variant="secondary"
          className="self-start"
          onClick={() =>
            void navigate({ to: "/settings", search: { node: undefined } })
          }
        >
          {t("remoteSettings.openLocal")}
        </Button>
      </div>
    </ShellPage>
  );
};

/** Settings for `?node=`, once it's clear this radio can manage it. */
const RemoteConfigPage = ({ node }: { node: number }) => {
  const { t } = useTranslation("config");
  const target = useRemoteTarget(node);
  switch (target.kind) {
    case "local":
      return <SettingsScreen />;
    case "waiting":
      return (
        <ShellPage label={t("page.title")}>
          <output className="m-auto flex items-center gap-2 text-help text-secondary">
            <Spinner />
            {t("remoteSettings.waiting")}
          </output>
        </ShellPage>
      );
    case "unavailable":
      return (
        <RemoteUnavailable nodeNum={target.nodeNum} reason={target.reason} />
      );
    case "remote":
      return (
        <RemoteSettingsProvider key={target.nodeNum} nodeNum={target.nodeNum}>
          <SettingsScreen />
        </RemoteSettingsProvider>
      );
  }
};

/**
 * This radio's settings, or with `?node=` another node's, managed over
 * the mesh when this radio is one of its admins.
 */
const ConfigPage = () => {
  const node = useRemoteNodeParam();
  return node === undefined ? (
    <SettingsScreen />
  ) : (
    <RemoteConfigPage node={node} />
  );
};

export default ConfigPage;
