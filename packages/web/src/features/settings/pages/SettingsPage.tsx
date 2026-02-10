import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@shared/components/ui/sheet";
import { useMyNode, useRemoteAdminAuth } from "@shared/hooks";
import { cn } from "@shared/utils/cn";
import { t } from "i18next";
import {
  AlertCircleIcon,
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
import { useState } from "react";
import { SettingsSearchBar } from "../components/SettingsSearchBar.tsx";
import { ActivityPanel } from "../components/activity/index.ts";
import { useSettingsSave } from "../hooks/useSaveSettings.ts";
import {
  SettingsNavigationProvider,
  type SettingsSection,
  useSettingsNavigation,
} from "../search/index.ts";
import { AdvancedConfig } from "./AdvancedConfig.tsx";
import { AppPreferencesConfig } from "./AppPreferencesConfig.tsx";
import { DeviceConfig } from "./DeviceConfig.tsx";
import { ModuleConfig } from "./ModuleConfig.tsx";
import { RadioConfig } from "./RadioConfig.tsx";

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
 */
function SettingsHeaderActions({ onActivityOpen }: SettingsHeaderActionsProps) {
  const { handleSave, handleReset, isSaving, hasPending, saveDisabled } =
    useSettingsSave();
  const { myNodeNum } = useMyNode();
  const { changeCount: totalChangeCount } = usePendingChanges(myNodeNum);

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

/**
 * Content area that depends on device state.
 */
function SettingsContent() {
  const { isRemoteAdmin, isAuthorized } = useRemoteAdminAuth();
  const { activeSection } = useSettingsNavigation();

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
      {activeSection === "radio" && <RadioConfig />}
      {activeSection === "device" && <DeviceConfig />}
      {activeSection === "module" && <ModuleConfig />}
      {activeSection === "advanced" && <AdvancedConfig />}
      {activeSection === "app" && <AppPreferencesConfig />}
    </>
  );
}

interface SettingsSidebarProps {
  onSectionChange?: () => void;
}

function SettingsSidebar({ onSectionChange }: SettingsSidebarProps) {
  const { activeSection, setActiveSection } = useSettingsNavigation();

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    onSectionChange?.();
  };

  return (
    <>
      <div className="p-4 border-b">
        <h2 className="font-semibold">{t("navigation.settings")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {configSections.map((section) => (
            <Button
              key={section.key}
              variant="ghost"
              onClick={() => handleSectionChange(section.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 text-left w-full h-auto justify-start",
                activeSection === section.key && "bg-sidebar-accent",
              )}
            >
              <section.icon className="h-4 w-4" />
              <span className="text-sm md:text-base">{section.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

function SettingsPageContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { activeSection } = useSettingsNavigation();

  return (
    <div className="flex h-full">
      <div className="hidden md:flex md:w-56 md:border-r md:flex-col">
        <SettingsSidebar />
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
                <SettingsSidebar
                  onSectionChange={() => setMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold truncate">
              {configSections.find((s) => s.key === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SettingsSearchBar />
            </div>
            <SettingsHeaderActions
              onActivityOpen={() => setActivityOpen(true)}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="p-4 sm:p-6">
            <SettingsContent />
          </div>
        </div>
      </div>

      <ActivityPanel open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SettingsNavigationProvider>
      <SettingsPageContent />
    </SettingsNavigationProvider>
  );
}
