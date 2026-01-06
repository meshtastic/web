import { adminCommands } from "@core/services/adminCommands";
import { useToast } from "@shared/hooks/useToast";
import { useDevice } from "@state/index.ts";
import { useCallback, useState } from "react";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";

export function useSettingsSave() {
  const {
    getAllConfigChanges,
    getAllModuleConfigChanges,
    getAllChannelChanges,
    getAllQueuedAdminMessages,
    connection,
    clearAllChanges,
    setConfig,
    setModuleConfig,
    addChannel,
    getConfigChangeCount,
    getModuleConfigChangeCount,
    getChannelChangeCount,
    getAdminMessageChangeCount,
  } = useDevice();

  const { clearAllChanges: clearRegistryChanges } = useFieldRegistry();

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const configChangeCount = getConfigChangeCount();
  const moduleConfigChangeCount = getModuleConfigChangeCount();
  const channelChangeCount = getChannelChangeCount();
  const adminMessageChangeCount = getAdminMessageChangeCount();

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const channelChanges = getAllChannelChanges();
      const configChanges = getAllConfigChanges();
      const moduleConfigChanges = getAllModuleConfigChanges();
      const adminMessages = getAllQueuedAdminMessages();

      await Promise.all(
        channelChanges.map((channel) =>
          connection?.setChannel(channel).then(() => {
            toast({
              title: `Saved channel: ${channel.settings?.name}`,
            });
          }),
        ),
      );

      await Promise.all(
        configChanges.map((newConfig) =>
          connection?.setConfig(newConfig).then(() => {
            toast({
              title: "Configuration saved",
              description: `Saved ${newConfig.payloadVariant.case}`,
            });
          }),
        ),
      );

      await Promise.all(
        moduleConfigChanges.map((newModuleConfig) =>
          connection?.setModuleConfig(newModuleConfig).then(() =>
            toast({
              title: "Module configuration saved",
              description: `Saved ${newModuleConfig.payloadVariant.case}`,
            }),
          ),
        ),
      );

      if (configChanges.length > 0 || moduleConfigChanges.length > 0) {
        await connection?.commitEditSettings();
      }

      if (adminMessages.length > 0 && connection) {
        await adminCommands.sendQueuedMessages(adminMessages);
      }

      channelChanges.forEach((newChannel) => {
        addChannel(newChannel);
      });
      configChanges.forEach((newConfig) => {
        setConfig(newConfig);
      });
      moduleConfigChanges.forEach((newModuleConfig) => {
        setModuleConfig(newModuleConfig);
      });

      clearAllChanges();
      clearRegistryChanges();

      toast({
        title: "All changes saved",
        description: "Your settings have been applied to the device",
      });
    } catch (_error) {
      toast({
        title: "Error saving configuration",
        description: "Failed to save changes to the device",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    toast,
    getAllConfigChanges,
    connection,
    getAllModuleConfigChanges,
    getAllChannelChanges,
    getAllQueuedAdminMessages,
    addChannel,
    setConfig,
    setModuleConfig,
    clearAllChanges,
    clearRegistryChanges,
  ]);

  const handleReset = useCallback(() => {
    clearAllChanges();
    clearRegistryChanges();
  }, [clearAllChanges, clearRegistryChanges]);

  const hasPending =
    configChangeCount > 0 ||
    moduleConfigChangeCount > 0 ||
    channelChangeCount > 0 ||
    adminMessageChangeCount > 0;

  const saveDisabled = isSaving || !hasPending;

  return {
    handleSave,
    handleReset,
    isSaving,
    hasPending,
    saveDisabled,
  };
}
