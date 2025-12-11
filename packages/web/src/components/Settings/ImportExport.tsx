import { ImportConfigDialog } from "@components/Dialog/ImportConfigDialog/ImportConfigDialog.tsx";
import { Button } from "@components/ui/button.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  type ParsedYAMLField,
  YAMLService,
} from "@core/services/yamlService.ts";
import { useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { Download, Upload } from "lucide-react";
import { useState } from "react";

interface ImportExportProps {
  variant?: "default" | "sidebar";
}

export const ImportExport = ({ variant = "default" }: ImportExportProps) => {
  const { toast } = useToast();
  const device = useDevice();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const exportConfig = async () => {
    try {
      const yamlContent = await YAMLService.exportToYAML(device);
      const filename = `meshtastic_${device.hardware?.myNodeNum || "config"}.yaml`;
      YAMLService.downloadYAML(yamlContent, filename);

      toast({
        title: "Export Successful",
        description: "Configuration exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (
    fields: ParsedYAMLField[],
    onProgress: (percent: number, status: string) => void,
  ) => {
    try {
      // The first argument _parsedData is unused in applyToDevice
      await YAMLService.applyToDevice({} as any, fields, device, onProgress);

      toast({
        title: "Import Successful",
        description: "Configuration imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
      throw error; // Re-throw to let the dialog handle/show error if needed
    }
  };

  return (
    <>
      {variant === "sidebar" ? (
        <div className="flex flex-col gap-2 p-2">
          <Button
            variant={"outline"}
            onClick={exportConfig}
            className={cn(
              "flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
              "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Download className="h-4 w-4" />
            <span className="text-sm md:text-base">Export Config</span>
          </Button>
          <Button
            variant={"outline"}
            type="button"
            onClick={() => setImportDialogOpen(true)}
            className={cn(
              "flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
              "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm md:text-base">Import Config</span>
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      )}

      <ImportConfigDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </>
  );
};
