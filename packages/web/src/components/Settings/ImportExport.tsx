import { Button } from "@components/ui/button";
import { useToast } from "@core/hooks/useToast";
import * as yaml from "js-yaml";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

export const ImportExport = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportConfig = async () => {
    try {
      // TODO: Implement actual config export from device store
      const config = {
        version: "1.0",
        metadata: {
          exportedAt: new Date().toISOString(),
          deviceName: "Meshtastic Device",
          hardwareModel: "Unknown",
        },
        config: {},
        moduleConfig: {},
        channels: [],
      };

      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 120,
      });

      // Download file
      const blob = new Blob([yamlContent], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meshtastic-config.yaml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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

  const importConfig = async (file: File) => {
    try {
      const yamlText = await file.text();
      const config = yaml.load(yamlText) as any;

      // TODO: Implement actual config validation and application
      console.log("Imported config:", config);

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
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportConfig}>
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>

      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            importConfig(file);
          }
        }}
      />
    </div>
  );
};
