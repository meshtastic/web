import { Button } from "@components/ui/button.tsx";
import { Checkbox } from "@components/ui/checkbox.tsx";
import { Label } from "@components/ui/label.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet.tsx";
import { cn } from "@core/utils/cn.ts";
import {
  YAMLService,
  type ParsedYAMLField,
} from "@core/services/yamlService.ts";
import { Download, Eye, EyeOff, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceStore } from "@core/stores/deviceStore/index.ts";

interface YAMLExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportSection {
  key: string;
  label: string;
  description: string;
  fields: ParsedYAMLField[];
  enabled: boolean;
}

export function YAMLExportDialog({
  open,
  onOpenChange,
}: YAMLExportDialogProps) {
  const { t } = useTranslation("settings");
  const device = useDeviceStore((state) =>
    state.getDevice(state.getActiveConnectionId() || 0),
  );

  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(),
  );
  const [previewContent, setPreviewContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Generate all available fields from current device configuration
  const allFields = useMemo(() => {
    if (!device) return [];

    const yamlData = YAMLService.exportToYAML(device);
    const parsed = YAMLService.parseYAML(yamlData);
    return YAMLService.extractFields(parsed);
  }, [device]);

  // Group fields into sections
  const sections = useMemo(() => {
    const grouped: Record<string, ParsedYAMLField[]> = {};

    allFields.forEach((field) => {
      const sectionKey = `${field.type}.${field.section}`;
      if (!grouped[sectionKey]) {
        grouped[sectionKey] = [];
      }
      grouped[sectionKey].push(field);
    });

    const sectionList: ExportSection[] = Object.entries(grouped).map(
      ([key, fields]) => {
        const [type, section] = key.split(".");
        let label = section;
        let description = "";

        switch (type) {
          case "config":
            label = section || "Config";
            description = `Device ${section} configuration`;
            break;
          case "moduleConfig":
            label = section || "Module";
            description = `${section} module configuration`;
            break;
          case "channel":
            label = `Channel ${section}`;
            description = `Channel ${section} settings`;
            break;
          default:
            label = section || "Unknown";
            description = `${section} configuration`;
        }

        return {
          key,
          label,
          description,
          fields,
          enabled: selectedSections.has(key),
        };
      },
    );

    // Sort sections by type and label
    return sectionList.sort((a, b) => {
      const typeOrder = { config: 0, moduleConfig: 1, channel: 2 };
      const aType = a.key.split(".")[0] as keyof typeof typeOrder;
      const bType = b.key.split(".")[0] as keyof typeof typeOrder;

      if (typeOrder[aType] !== typeOrder[bType]) {
        return typeOrder[aType] - typeOrder[bType];
      }

      return String(a.label || "").localeCompare(String(b.label || ""));
    });
  }, [allFields, selectedSections, t]);

  // Initialize with all sections selected
  useEffect(() => {
    if (sections.length > 0 && selectedSections.size === 0) {
      setSelectedSections(new Set(sections.map((s) => s.key)));
    }
  }, [sections]);

  // Generate preview content
  useEffect(() => {
    if (!device || selectedSections.size === 0) {
      setPreviewContent("");
      return;
    }

    try {
      const yamlData = YAMLService.exportToYAML(device);
      const parsed = YAMLService.parseYAML(yamlData);
      const allExtractedFields = YAMLService.extractFields(parsed);

      // Filter fields based on selected sections
      const selectedFields = allExtractedFields.filter((field) => {
        const sectionKey = `${field.type}.${field.section}`;
        return selectedSections.has(sectionKey);
      });

      if (selectedFields.length === 0) {
        setPreviewContent("# No sections selected for export");
        return;
      }

      // Create a filtered YAML structure
      const filteredYAML: any = {
        version: parsed.version,
        metadata: parsed.metadata,
        config: {},
        moduleConfig: {},
        channels: [],
      };

      // Add selected config fields
      selectedFields
        .filter((f) => f.type === "config")
        .forEach((field) => {
          if (!filteredYAML.config[field.section]) {
            filteredYAML.config[field.section] = {};
          }
          (filteredYAML.config[field.section] as any)[field.field] =
            field.value;
        });

      // Add selected module config fields
      selectedFields
        .filter((f) => f.type === "moduleConfig")
        .forEach((field) => {
          if (!filteredYAML.moduleConfig[field.section]) {
            filteredYAML.moduleConfig[field.section] = {};
          }
          (filteredYAML.moduleConfig[field.section] as any)[field.field] =
            field.value;
        });

      // Add selected channel fields
      const channelMap = new Map<number, any>();
      selectedFields
        .filter((f) => f.type === "channel")
        .forEach((field) => {
          const channelIndex = parseInt(field.path[1]);
          if (!channelMap.has(channelIndex)) {
            channelMap.set(channelIndex, { index: channelIndex, settings: {} });
          }
          (channelMap.get(channelIndex).settings as any)[field.field] =
            field.value;
        });

      filteredYAML.channels = Array.from(channelMap.values());

      const yaml = require("js-yaml");
      setPreviewContent(
        yaml.dump(filteredYAML, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
          sortKeys: false,
        }),
      );
    } catch (error) {
      setPreviewContent(
        `# Error generating preview: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [device, selectedSections]);

  const handleSectionToggle = useCallback(
    (sectionKey: string, checked: boolean) => {
      setSelectedSections((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(sectionKey);
        } else {
          newSet.delete(sectionKey);
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedSections(new Set(sections.map((s) => s.key)));
      } else {
        setSelectedSections(new Set());
      }
    },
    [sections],
  );

  const handleExport = useCallback(async () => {
    if (!device || selectedSections.size === 0) return;

    setIsExporting(true);
    try {
      const filename = `meshtastic-config-${new Date().toISOString().split("T")[0] || "export"}.yaml`;
      YAMLService.downloadYAML(previewContent, filename);
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [device, selectedSections, previewContent, onOpenChange]);

  const isAllSelected =
    sections.length > 0 && selectedSections.size === sections.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("yaml.export.title", "Export YAML Configuration")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "yaml.export.description",
              "Export configuration settings to a YAML file",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Section Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {t("yaml.export.selectSections", "Select Sections to Export")}
              </h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  {t("yaml.export.selectAll", "Select All")}
                </Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {sections.map((section) => (
                <div
                  key={section.key}
                  className={cn(
                    "border rounded-lg p-4 space-y-3 cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    section.enabled && "bg-muted/30 border-primary/50",
                  )}
                  onClick={() =>
                    handleSectionToggle(section.key, !section.enabled)
                  }
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={section.enabled}
                      onChange={(checked: boolean) =>
                        handleSectionToggle(section.key, checked)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {section.label}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {section.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("yaml.export.fieldCount", "{{count}} fields", {
                          count: section.fields.length,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showPreview
                  ? t("yaml.export.hidePreview", "Hide Preview")
                  : t("yaml.export.showPreview", "Show Preview")}
              </Button>

              {selectedSections.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t(
                    "yaml.export.selectedSections",
                    "{{count}} sections selected",
                    {
                      count: selectedSections.size,
                    },
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="space-y-2">
              <Label htmlFor="yaml-preview">
                {t("yaml.export.preview", "Preview")}
              </Label>
              <pre
                id="yaml-preview"
                className="w-full h-64 p-3 border rounded-md bg-muted/50 text-sm font-mono overflow-auto whitespace-pre-wrap"
              >
                {previewContent ||
                  t("yaml.export.noPreview", "No preview available")}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("button.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleExport}
              disabled={
                selectedSections.size === 0 || isExporting || !previewContent
              }
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting
                ? t("yaml.export.exporting", "Exporting...")
                : t("yaml.export.export", "Export YAML")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
