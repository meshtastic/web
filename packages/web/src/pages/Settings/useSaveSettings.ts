import { toBinary } from "@bufbuild/protobuf";
import { useToast } from "@core/hooks/useToast";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

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

  const [isSaving, setIsSaving] = useState(false);
  const [rhfState, setRhfState] = useState({ isDirty: false, isValid: true });
  const unsubRef = useRef<(() => void) | null>(null);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);
  const { toast } = useToast();

  const configChangeCount = getConfigChangeCount();
  const moduleConfigChangeCount = getModuleConfigChangeCount();
  const channelChangeCount = getChannelChangeCount();
  const adminMessageChangeCount = getAdminMessageChangeCount();

  const handleFormInit = useCallback((methods: UseFormReturn) => {
    setFormMethods(methods);

    setRhfState({
      isDirty: false,
      isValid: true,
    });

    unsubRef.current?.();
    unsubRef.current = methods.subscribe({
      formState: { isDirty: true, isValid: true },
      callback: ({ isValid, isDirty }) => {
        setRhfState({
          isDirty: isDirty ?? false,
          isValid: isValid ?? true,
        });
      },
    });
  }, []);

  useEffect(() => {
    return () => unsubRef.current?.();
  }, []);

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

      if (adminMessages.length > 0) {
        await Promise.all(
          adminMessages.map((message) =>
            connection?.sendPacket(
              toBinary(Protobuf.Admin.AdminMessageSchema, message),
              Protobuf.Portnums.PortNum.ADMIN_APP,
              "self",
            ),
          ),
        );
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

      if (formMethods) {
        formMethods.reset(formMethods.getValues(), {
          keepDirty: false,
          keepErrors: false,
          keepTouched: false,
          keepValues: true,
        });

        formMethods.trigger();
      }

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
    formMethods,
    addChannel,
    setConfig,
    setModuleConfig,
    clearAllChanges,
  ]);

  const handleReset = useCallback(() => {
    if (formMethods) {
      formMethods.reset();
    }
    clearAllChanges();
  }, [formMethods, clearAllChanges]);

  const hasDrafts =
    configChangeCount > 0 ||
    moduleConfigChangeCount > 0 ||
    channelChangeCount > 0 ||
    adminMessageChangeCount > 0;
  const hasPending = hasDrafts || rhfState.isDirty;
  const saveDisabled = isSaving || !rhfState.isValid || !hasPending;

  return {
    handleSave,
    handleReset,
    handleFormInit,
    isSaving,
    hasPending,
    saveDisabled,
  };
}
