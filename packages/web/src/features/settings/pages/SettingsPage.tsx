import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@shared/components/ui/sheet";
import { useRemoteAdminAuth } from "@shared/hooks";
import { cn } from "@shared/utils/cn";
import { t } from "i18next";
import {
  AlertCircleIcon,
  Archive,
  Database,
  FileEdit,
  LayersIcon,
  Menu,
  RadioTowerIcon,
  RotateCcw,
  RouterIcon,
  Save,
  Settings2,
} from "lucide-react";
import { Suspense, useState } from "react";
import { ActivityPanel } from "../components/activity/index.ts";
import { SettingsSearchBar } from "../components/SettingsSearchBar.tsx";
import { useSettingsSave } from "../hooks/useSaveSettings.ts";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";
import { AdvancedConfig } from "./AdvancedConfig.tsx";
import { AppPreferencesConfig } from "./AppPreferencesConfig.tsx";
import { BackupRestoreConfig } from "./BackupRestoreConfig.tsx";
import { DeviceConfig } from "./DeviceConfig.tsx";
import { ModuleConfig } from "./ModuleConfig.tsx";
import { RadioConfig } from "./RadioConfig.tsx";
import { SettingsLoadingSkeleton } from "./SettingsLoading.tsx";

type SettingsSection =
  | "radio"
  | "device"
  | "module"
  | "app"
  | "backup"
  | "advanced";

const configSections = [
  {
    key: "radio" as const,
    label: "Radio Config",
    icon: RadioTowerIcon,
  },
  {
    key: "device" as const,
    label: "Device Config",
    icon: RouterIcon,
  },
  {
    key: "module" as const,
    label: "Module Config",
    icon: LayersIcon,
  },
  {
    key: "backup" as const,
    label: "Backup & Restore",
    icon: Archive,
  },
  {
    key: "advanced" as const,
    label: "Advanced",
    icon: Database,
  },
  {
    key: "app" as const,
    label: "App",
    icon: Settings2,
  },
];

interface SettingsHeaderActionsProps {
  onActivityOpen: () => void;
}

/**
 * Header actions that depend on device state (useSettingsSave uses useDevice).
 * Must be rendered inside a Suspense boundary.
 */
function SettingsHeaderActions({ onActivityOpen }: SettingsHeaderActionsProps) {
  const { handleSave, handleReset, isSaving, hasPending, saveDisabled } =
    useSettingsSave();
  const { getChangeCount } = useFieldRegistry();
  const totalChangeCount = getChangeCount();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative hidden lg:flex"
        onClick={onActivityOpen}
      >
        <FileEdit className="h-4 w-4 mr-2" />
        Activity
        {totalChangeCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalChangeCount}
          </Badge>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:flex"
        onClick={handleReset}
        disabled={!hasPending}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {t("button.reset")}
      </Button>
      <Button
        size="sm"
        className="hidden sm:flex"
        onClick={handleSave}
        disabled={saveDisabled}
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? `${t("button.saving")}...` : t("button.save")}
      </Button>
    </>
  );
}

interface SettingsContentProps {
  activeSection: SettingsSection;
  searchQuery: string;
}

/**
 * Content area that depends on device state.
 * Must be rendered inside a Suspense boundary.
 */
function SettingsContent({ activeSection, searchQuery }: SettingsContentProps) {
  const { isRemoteAdmin, isAuthorized } = useRemoteAdminAuth();

  return (
    <>
      {isRemoteAdmin && !isAuthorized && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircleIcon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-destructive">Not Authorized</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Add this node's public key to your admin keys in Security settings
              to enable remote configuration.
            </p>
          </div>
        </div>
      )}
      {activeSection === "radio" && <RadioConfig searchQuery={searchQuery} />}
      {activeSection === "device" && <DeviceConfig searchQuery={searchQuery} />}
      {activeSection === "module" && <ModuleConfig searchQuery={searchQuery} />}
      {activeSection === "backup" && (
        <BackupRestoreConfig searchQuery={searchQuery} />
      )}
      {activeSection === "advanced" && (
        <AdvancedConfig searchQuery={searchQuery} />
      )}
      {activeSection === "app" && (
        <AppPreferencesConfig searchQuery={searchQuery} />
      )}
    </>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("radio");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b">
        <h2 className="font-semibold">{t("navigation.settings")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {configSections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => handleSectionChange(section.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 text-left transition-colors w-full",
                activeSection === section.key
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/50",
              )}
            >
              <section.icon className="h-4 w-4" />
              <span className="text-sm md:text-base">{section.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex h-full">
      <div className="hidden md:flex md:w-56 md:border-r md:flex-col">
        {sidebarContent}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b flex items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                {sidebarContent}
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold truncate">
              {configSections.find((s) => s.key === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SettingsSearchBar onSearch={setSearchQuery} />
            </div>
            <Suspense fallback={null}>
              <SettingsHeaderActions
                onActivityOpen={() => setActivityOpen(true)}
              />
            </Suspense>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="p-4 sm:p-6">
            <Suspense fallback={<SettingsLoadingSkeleton />}>
              <SettingsContent
                activeSection={activeSection}
                searchQuery={searchQuery}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <ActivityPanel open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}
