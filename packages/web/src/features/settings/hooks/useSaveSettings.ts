import { adminCommands } from "@core/services/adminCommands";
import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import { useMyNode } from "@shared/hooks";
import { useToast } from "@shared/hooks/useToast";
import { useCallback, useState } from "react";

export function useSettingsSave() {
  const { myNodeNum } = useMyNode();
  const { hasChanges, clearAllChanges } = usePendingChanges(myNodeNum);

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    if (!myNodeNum) {
      toast({
        title: "Error",
        description: "No device connected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await adminCommands.saveAllPendingChanges(myNodeNum);

      const totalSaved =
        result.configCount + result.moduleConfigCount + result.channelCount;

      if (totalSaved > 0) {
        toast({
          title: "All changes saved",
          description: `Saved ${result.configCount} config(s), ${result.moduleConfigCount} module config(s), ${result.channelCount} channel(s)`,
        });
      } else {
        toast({
          title: "No changes to save",
          description: "All settings are up to date",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving configuration",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save changes to the device",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [myNodeNum, toast]);

  const handleReset = useCallback(async () => {
    await clearAllChanges();
    toast({
      title: "Changes reset",
      description: "All pending changes have been discarded",
    });
  }, [clearAllChanges, toast]);

  const saveDisabled = isSaving || !hasChanges;

  return {
    handleSave,
    handleReset,
    isSaving,
    hasPending: hasChanges,
    saveDisabled,
  };
}
