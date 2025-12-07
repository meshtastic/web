import { SettingsSearchBar } from "@app/components/Settings/SettingsSearchBar";
import { ActivityPanel } from "@components/Settings/Activity";
import { ImportExport } from "@components/Settings/ImportExport";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { ScrollArea } from "@components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@components/ui/sheet";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { cn } from "@core/utils/cn";
import { DeviceConfig } from "@pages/Settings/DeviceConfig";
import { ModuleConfig } from "@pages/Settings/ModuleConfig";
import { RadioConfig } from "@pages/Settings/RadioConfig";
import { useSettingsSave } from "@pages/Settings/useSaveSettings";
import {
  FileEdit,
  LayersIcon,
  Menu,
  RadioTowerIcon,
  RotateCcw,
  RouterIcon,
  Save,
} from "lucide-react";
import { useState } from "react";

type SettingsSection = "radio" | "device" | "module";

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
];

export default function SettingsPage() {
  const {
    handleSave,
    handleReset,
    handleFormInit,
    isSaving,
    hasPending,
    saveDisabled,
  } = useSettingsSave();

  const { getChangeCount } = useFieldRegistry();

  const [activeSection, setActiveSection] = useState<SettingsSection>("radio");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const totalChangeCount = getChangeCount();

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b">
        <h2 className="font-semibold">Configuration</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {configSections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => handleSectionChange(section.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                activeSection === section.key
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/50",
              )}
            >
              <section.icon className="h-4 w-4" />
              <span className="text-sm">{section.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-56 md:border-r md:flex-col">
        {sidebarContent}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Config Header */}
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
            <Button
              variant="outline"
              size="sm"
              className="relative hidden lg:flex"
              onClick={() => setActivityOpen(true)}
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
              Reset
            </Button>
            <Button
              size="sm"
              className="hidden sm:flex"
              onClick={handleSave}
              disabled={saveDisabled}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <div className="hidden lg:block">
              <ImportExport />
            </div>
          </div>
        </div>

        {/* Config Content */}
        <div className="flex-1">
          <div className="p-4 sm:p-6">
            {activeSection === "radio" && (
              <RadioConfig
                onFormInit={handleFormInit}
                searchQuery={searchQuery}
              />
            )}
            {activeSection === "device" && (
              <DeviceConfig
                onFormInit={handleFormInit}
                searchQuery={searchQuery}
              />
            )}
            {activeSection === "module" && (
              <ModuleConfig
                onFormInit={handleFormInit}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>
      </div>

      {/* Activity Panel */}
      <ActivityPanel open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}
