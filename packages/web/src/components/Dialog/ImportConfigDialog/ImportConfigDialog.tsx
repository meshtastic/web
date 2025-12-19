import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Progress } from "@shared/components/ui/progress";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { Switch } from "@shared/components/ui/switch";
import {
  type ParsedConfigBackupField,
  ConfigBackupService,
} from "@core/services/configBackupService.ts";
import { cn } from "@shared/utils/cn";
import { debounce } from "@shared/utils/debounce";
import { FileText, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfigBackupValidationService } from "../../../validation/configBackup.ts";

interface ImportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    fields: ParsedConfigBackupField[],
    onProgress: (percent: number, status: string) => void,
  ) => Promise<void>;
}

export function ImportConfigDialog({
  open,
  onOpenChange,
  onImport,
}: ImportConfigDialogProps) {
  const { t } = useTranslation("settings");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [yamlContent, setYamlContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [allFields, setAllFields] = useState<ParsedConfigBackupField[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");

  // Parse YAML content and extract fields
  useEffect(() => {
    if (!yamlContent.trim()) {
      setAllFields([]);
      setSelectedFields(new Set());
      setValidationError(null);
      return;
    }

    try {
      // Validate structure first (ConfigBackupService.parseBackup does this internally, but we might want explicit validation step here if we were separating them, but parseBackup returns typed data)
      // Actually ConfigBackupService.parseBackup parses AND validates structure.
      // But here we want to handle the result.
      
      // Let's use ConfigBackupService.parseBackup directly to get the data, 
      // catching any structure validation errors.
      // Wait, the original code used YAMLValidationService.validateYAMLContent separately.
      // Let's see if we should keep that pattern. 
      // ConfigBackupService.parseBackup(content) returns ConfigBackupData.
      
      const data = ConfigBackupService.parseBackup(yamlContent);
      
      // If we got here, structure is valid.
      const fields = ConfigBackupService.extractFields(data);
      const validationErrors =
        ConfigBackupValidationService.getFieldValidationErrors(fields);

      if (validationErrors.length > 0) {
        setValidationError(
          `Validation errors:\n${validationErrors.map((e: any) => e.error).join("\n")}`,
        );
      } else {
        setValidationError(null);
      }

      setAllFields(fields);
      // Select all fields by default
      setSelectedFields(new Set(fields.map((f) => f.originalPath)));

    } catch (error) {
        // If ConfigBackupService.parseBackup fails, it throws an error (likely from Zod)
        setValidationError(
            error instanceof Error ? error.message : "Invalid ConfigBackup structure",
        );
        setAllFields([]);
        setSelectedFields(new Set());
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
    const groups: Record<string, ParsedConfigBackupField[]> = {};

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
      if (!file) {
        return;
      }

      setIsLoading(true);
      try {
        const content = await ConfigBackupService.readBackupFile(file);
        setYamlContent(content);
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

  const handleSelectAll = useCallback(
    (groupFields: ParsedConfigBackupField[], checked: boolean) => {
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

  const handleImport = useCallback(async () => {
    if (selectedFields.size === 0) {
      setValidationError("Please select at least one field to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("Starting import...");

    try {
      const fieldsToImport = allFields.filter((field) =>
        selectedFields.has(field.originalPath),
      );

      const validationErrors =
        ConfigBackupValidationService.getFieldValidationErrors(fieldsToImport);
      if (validationErrors.length > 0) {
        setValidationError(
          `Validation errors:\n${validationErrors.map((e: any) => e.error).join("\n")}`,
        );
        setIsImporting(false);
        return;
      }

      await onImport(fieldsToImport, (percent, status) => {
        setImportProgress(percent);
        setImportStatus(status);
      });

      onOpenChange(false);
      setYamlContent("");
      setSelectedFields(new Set());
      setValidationError(null);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Import error",
      );
    } finally {
      setIsImporting(false);
    }
  }, [selectedFields, allFields, onImport, onOpenChange]);

  const isGroupSelected = useCallback(
    (groupFields: ParsedConfigBackupField[]) => {
      return groupFields.every((field) =>
        selectedFields.has(field.originalPath),
      );
    },
    [selectedFields],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("importConfig.title", "Import Configuration")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "importConfig.description",
              "Import configuration settings from a YAML file",
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6">
          <div className="space-y-6 pr-4">
            {isImporting ? (
              <div className="space-y-4 py-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{importStatus}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Please wait while configuration is being applied...
                </p>
              </div>
            ) : (
              <>
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
                      {t("importConfig.selectFile", "Select YAML File")}
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
                      {t("importConfig.yamlContent", "YAML Content")}
                    </Label>
                    {/** biome-ignore lint/correctness/useUniqueElementIds: this is a dumb rule */}
                    <textarea
                      id="yaml-content"
                      value={yamlContent}
                      onChange={(e) => setYamlContent(e.target.value)}
                      placeholder={t(
                        "importConfig.placeholder",
                        "Paste or upload YAML content here...",
                      )}
                      className="w-full h-48 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Validation Error */}
                  {validationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                      <div className="flex items-start gap-2">
                        <X className="h-4 w-4 mt-0.5 shrink-0" />
                        <pre className="whitespace-pre-wrap">
                          {validationError}
                        </pre>
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
                          "importConfig.searchPlaceholder",
                          "Search configuration fields...",
                        )}
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t(
                          "importConfig.fieldCount",
                          "{{count}} fields found",
                          {
                            count: filteredFields.length,
                          },
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {t(
                            "importConfig.selectedCount",
                            "{{count}} selected",
                            {
                              count: selectedFields.size,
                            },
                          )}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedFields(
                                new Set(allFields.map((f) => f.originalPath)),
                              )
                            }
                            disabled={selectedFields.size === allFields.length}
                          >
                            {t("importConfig.selectAll", "Select All")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFields(new Set())}
                            disabled={selectedFields.size === 0}
                          >
                            {t("importConfig.deselectAll", "Deselect All")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fields Selection - Group level only */}
                {Object.entries(groupedFields).map(
                  ([groupKey, groupFields]) => {
                    const [type, section] = groupKey.split(".");
                    const isAllSelected = isGroupSelected(groupFields);

                    return (
                      <button
                        type="button"
                        key={groupKey}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          "hover:bg-muted/50 transition-colors cursor-pointer",
                          isAllSelected && "bg-muted",
                        )}
                        onClick={() =>
                          handleSelectAll(groupFields, !isAllSelected)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isAllSelected}
                            onCheckedChange={(checked) =>
                              handleSelectAll(groupFields, checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <h3 className="font-medium">
                              {type === "config" &&
                                t("importConfig.configSection", "Config")}
                              {type === "moduleConfig" &&
                                t(
                                  "importConfig.moduleConfigSection",
                                  "Module Config",
                                )}
                              {type === "channel" &&
                                t("importConfig.channelSection", "Channel")}
                              {type === "user" &&
                                t("importConfig.userSection", "User")}
                              : {section}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "importConfig.fieldCount",
                                "{{count}} fields",
                                {
                                  count: groupFields.length,
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t("button.cancel", "Cancel")}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={
                      allFields.length === 0 ||
                      selectedFields.size === 0 ||
                      !!validationError
                    }
                  >
                    {t(
                      "importConfig.importSelected",
                      "Import Selected ({{count}})",
                      {
                        count: selectedFields.size,
                      },
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}