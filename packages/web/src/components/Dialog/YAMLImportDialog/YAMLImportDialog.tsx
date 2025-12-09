import { Button } from "@components/ui/button.tsx";
import { Input } from "@components/ui/input.tsx";
import { Label } from "@components/ui/label.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet.tsx";
import { Switch } from "@components/ui/switch.tsx";
import { cn } from "@core/utils/cn.ts";
import { debounce } from "@core/utils/debounce.ts";
import {
  YAMLService,
  type ParsedYAMLField,
} from "@core/services/yamlService.ts";
import { YAMLValidationService } from "../../../validation/yaml.ts";
import { FileText, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface YAMLImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (fields: ParsedYAMLField[]) => void;
}

export function YAMLImportDialog({
  open,
  onOpenChange,
  onImport,
}: YAMLImportDialogProps) {
  const { t } = useTranslation("settings");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [yamlContent, setYamlContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [allFields, setAllFields] = useState<ParsedYAMLField[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parse YAML content and extract fields
  useEffect(() => {
    if (!yamlContent.trim()) {
      setAllFields([]);
      setValidationError(null);
      return;
    }

    const validation = YAMLValidationService.validateYAMLContent(yamlContent);

    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid YAML");
      setAllFields([]);
      return;
    }

    try {
      const fields = YAMLService.extractFields(validation.data!);
      const validationErrors =
        YAMLValidationService.getFieldValidationErrors(fields);

      if (validationErrors.length > 0) {
        setValidationError(
          `Validation errors:\n${validationErrors.map((e: any) => e.error).join("\n")}`,
        );
      } else {
        setValidationError(null);
      }

      setAllFields(fields);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Parse error",
      );
      setAllFields([]);
    }
  }, [yamlContent]);

  // Filter fields based on search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) {
      return allFields;
    }

    const query = searchQuery.toLowerCase();
    return allFields.filter((field) => {
      const searchableText = [
        field.section,
        field.field,
        field.originalPath,
        field.type,
        String(field.value),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [allFields, searchQuery]);

  // Group fields by type and section for better organization
  const groupedFields = useMemo(() => {
    const groups: Record<string, ParsedYAMLField[]> = {};

    filteredFields.forEach((field) => {
      const groupKey = `${field.type}.${field.section}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(field);
    });

    return groups;
  }, [filteredFields]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 250),
    [],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const content = await YAMLService.readYAMLFile(file);
        setYamlContent(content);
        setSelectedFields(new Set());
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : "File read error",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleFieldToggle = useCallback(
    (fieldPath: string, checked: boolean) => {
      setSelectedFields((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(fieldPath);
        } else {
          newSet.delete(fieldPath);
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(
    (groupFields: ParsedYAMLField[], checked: boolean) => {
      setSelectedFields((prev) => {
        const newSet = new Set(prev);
        groupFields.forEach((field) => {
          if (checked) {
            newSet.add(field.originalPath);
          } else {
            newSet.delete(field.originalPath);
          }
        });
        return newSet;
      });
    },
    [],
  );

  const handleImport = useCallback(() => {
    if (selectedFields.size === 0) {
      setValidationError("Please select at least one field to import");
      return;
    }

    try {
      const fieldsToImport = allFields.filter((field) =>
        selectedFields.has(field.originalPath),
      );

      const validationErrors =
        YAMLValidationService.getFieldValidationErrors(fieldsToImport);
      if (validationErrors.length > 0) {
        setValidationError(
          `Validation errors:\n${validationErrors.map((e: any) => e.error).join("\n")}`,
        );
        return;
      }

      onImport(fieldsToImport);
      onOpenChange(false);
      setYamlContent("");
      setSelectedFields(new Set());
      setValidationError(null);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Import error",
      );
    }
  }, [selectedFields, allFields, onImport, onOpenChange]);

  const isGroupSelected = useCallback(
    (groupFields: ParsedYAMLField[]) => {
      return groupFields.every((field) =>
        selectedFields.has(field.originalPath),
      );
    },
    [selectedFields],
  );

  const isGroupPartiallySelected = useCallback(
    (groupFields: ParsedYAMLField[]) => {
      return (
        groupFields.some((field) => selectedFields.has(field.originalPath)) &&
        !groupFields.every((field) => selectedFields.has(field.originalPath))
      );
    },
    [selectedFields],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("yaml.import.title", "Import YAML Configuration")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "yaml.import.description",
              "Import configuration settings from a YAML file",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {t("yaml.import.selectFile", "Select YAML File")}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* YAML Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="yaml-content">
                {t("yaml.import.yamlContent", "YAML Content")}
              </Label>
              <textarea
                id="yaml-content"
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                placeholder={t(
                  "yaml.import.placeholder",
                  "Paste or upload YAML content here...",
                )}
                className="w-full h-48 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <pre className="whitespace-pre-wrap">{validationError}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Search and Filter */}
          {allFields.length > 0 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t(
                    "yaml.import.searchPlaceholder",
                    "Search configuration fields...",
                  )}
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t("yaml.import.fieldCount", "{{count}} fields found", {
                    count: filteredFields.length,
                  })}
                </span>
                <span>
                  {t("yaml.import.selectedCount", "{{count}} selected", {
                    count: selectedFields.size,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Fields Selection */}
          {Object.entries(groupedFields).map(([groupKey, groupFields]) => {
            const [type, section] = groupKey.split(".");
            const isAllSelected = isGroupSelected(groupFields);
            const isPartiallySelected = isGroupPartiallySelected(groupFields);

            return (
              <div key={groupKey} className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isAllSelected}
                      onCheckedChange={(checked) =>
                        handleSelectAll(groupFields, checked)
                      }
                    />
                    <h3 className="font-medium">
                      {type === "config" &&
                        t("yaml.import.configSection", "Config")}
                      {type === "moduleConfig" &&
                        t("yaml.import.moduleConfigSection", "Module Config")}
                      {type === "channel" &&
                        t("yaml.import.channelSection", "Channel")}
                      : {section}
                    </h3>
                  </div>
                  {isPartiallySelected && (
                    <span className="text-sm text-muted-foreground">
                      {t("yaml.import.partiallySelected", "Partially selected")}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {groupFields.map((field) => (
                    <div
                      key={field.originalPath}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border",
                        "hover:bg-muted/50 transition-colors",
                        selectedFields.has(field.originalPath) && "bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={selectedFields.has(field.originalPath)}
                          onCheckedChange={(checked) =>
                            handleFieldToggle(field.originalPath, checked)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {field.field}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {field.originalPath}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground ml-2">
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          {String(field.value)}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Action Buttons */}
          {allFields.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("button.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFields.size === 0 || !!validationError}
              >
                {t(
                  "yaml.import.importSelected",
                  "Import Selected ({{count}})",
                  {
                    count: selectedFields.size,
                  },
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
