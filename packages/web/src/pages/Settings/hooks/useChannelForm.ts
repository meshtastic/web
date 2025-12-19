import type { Channel as DbChannel } from "@app/db";
import {
  type ChannelValidation,
  makeChannelSchema,
} from "@app/validation/channel";
import { createZodResolver } from "@components/Form/createZodResolver";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import cryptoRandomString from "crypto-random-string";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DefaultValues, type Path, useForm } from "react-hook-form";

export interface UseChannelFormOptions {
  channel: DbChannel;
}

export function useChannelForm({ channel }: UseChannelFormOptions) {
  const { trackChange, removeChange, getChange } = useFieldRegistry();

  // Memoize section to prevent unnecessary re-renders
  const section = useMemo(
    () =>
      ({
        type: "channel",
        variant: channel.channelIndex.toString(),
      }) as const,
    [channel.channelIndex],
  );
  const fieldName = `channel_${channel.channelIndex}`;

  // Convert flat DB channel to nested form structure
  const dbToFormValues = useCallback(
    (ch: DbChannel): ChannelValidation => ({
      index: ch.channelIndex,
      role: ch.role,
      settings: {
        channelNum: ch.channelIndex,
        psk: ch.psk ?? "",
        name: ch.name ?? "",
        id: 0,
        uplinkEnabled: ch.uplinkEnabled ?? false,
        downlinkEnabled: ch.downlinkEnabled ?? false,
        moduleSettings: {
          positionPrecision: ch.positionPrecision ?? 10,
        },
      },
    }),
    [],
  );

  // Convert form data back to flat DB structure
  const formToDbChannel = useCallback(
    (data: ChannelValidation): DbChannel => ({
      deviceId: channel.deviceId,
      channelIndex: data.index,
      role: data.role,
      name: data.settings.name,
      psk: data.settings.psk,
      uplinkEnabled: data.settings.uplinkEnabled,
      downlinkEnabled: data.settings.downlinkEnabled,
      positionPrecision: data.settings.moduleSettings.positionPrecision,
      updatedAt: new Date(),
    }),
    [channel.deviceId],
  );

  const defaultValues = useMemo(
    () => dbToFormValues(channel),
    [channel, dbToFormValues],
  );

  // Get working channel from field registry if there are pending changes
  const workingChannel = getChange(section, fieldName)?.newValue as
    | DbChannel
    | undefined;
  const effectiveChannel = workingChannel ?? channel;
  const formValues = useMemo(
    () => dbToFormValues(effectiveChannel),
    [effectiveChannel, dbToFormValues],
  );

  // PSK byte count state for dynamic validation
  const pskLength = effectiveChannel.psk?.length ?? 0;
  const [byteCount, setByteCount] = useState<number>(
    pskLength > 0 ? Math.floor((pskLength * 3) / 4) : 16,
  );

  const schema = useMemo(() => makeChannelSchema(byteCount), [byteCount]);

  const form = useForm<ChannelValidation>({
    mode: "onChange",
    defaultValues: defaultValues as DefaultValues<ChannelValidation>,
    resolver: createZodResolver(schema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: formValues as ChannelValidation,
  });

  const { setValue, trigger, handleSubmit, formState, watch } = form;

  // Sync byteCount when effective channel changes
  const effectivePskLength = effectiveChannel.psk?.length ?? 0;
  const effectiveByteCount =
    effectivePskLength > 0 ? Math.floor((effectivePskLength * 3) / 4) : 16;
  const lastEffectiveRef = useRef<number>(effectiveByteCount);

  useEffect(() => {
    if (effectiveByteCount !== lastEffectiveRef.current) {
      lastEffectiveRef.current = effectiveByteCount;
      setByteCount(effectiveByteCount);
      trigger("settings.psk");
    }
  }, [effectiveByteCount, trigger]);

  // Submit handler that tracks changes
  const submitChanges = useCallback(
    (data: ChannelValidation) => {
      if (!formState.isReady) {
        return;
      }

      const payload = formToDbChannel(data);

      if (JSON.stringify(payload) === JSON.stringify(channel)) {
        removeChange(section, fieldName);
        return;
      }

      trackChange(section, fieldName, payload, channel);
    },
    [
      formState.isReady,
      formToDbChannel,
      channel,
      section,
      fieldName,
      trackChange,
      removeChange,
    ],
  );

  // Track changes on form value updates
  const prevValuesRef = useRef<ChannelValidation | undefined>(undefined);
  // Track whether we've completed initial sync (skip first watch fire)
  const hasInitialSyncRef = useRef(false);

  useEffect(() => {
    // Reset initial sync flag when effect re-runs
    hasInitialSyncRef.current = false;

    const subscription = watch((formData) => {
      if (!formData) {
        return;
      }

      const currentValues = formData as ChannelValidation;

      // Skip the first watch fire - just capture initial values without tracking
      // This prevents spurious change detection during form initialization
      if (!hasInitialSyncRef.current) {
        prevValuesRef.current = currentValues;
        hasInitialSyncRef.current = true;
        return;
      }

      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;
      submitChanges(currentValues);
    });

    return () => subscription.unsubscribe();
  }, [watch, submitChanges]);

  // Regenerate PSK
  const regeneratePsk = useCallback(async () => {
    const newPsk = btoa(
      cryptoRandomString({
        length: byteCount ?? 16,
        type: "alphanumeric",
      }),
    );
    setValue("settings.psk", newPsk, { shouldDirty: true });

    const valid = await trigger("settings.psk");
    if (valid) {
      handleSubmit(submitChanges)();
    }
  }, [byteCount, setValue, trigger, handleSubmit, submitChanges]);

  // Handle byte count select change
  const handleByteCountChange = useCallback(
    (value: string) => {
      const count = Number.parseInt(value, 10);
      if (!Number.isNaN(count)) {
        setByteCount(count);
        trigger("settings.psk");
      }
    },
    [trigger],
  );

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<ChannelValidation>;
        selector?: number;
        invert?: boolean;
      }>,
      disabled?: boolean,
    ): boolean => {
      if (disabled) {
        return true;
      }
      if (!disabledBy) {
        return false;
      }

      return disabledBy.some((field) => {
        const value = form.getValues(field.fieldName);
        if (typeof value === "boolean") {
          return field.invert ? value : !value;
        }
        if (typeof value === "number") {
          return field.invert
            ? field.selector !== value
            : field.selector === value;
        }
        return false;
      });
    },
    [form],
  );

  return {
    form,
    isReady: true, // Channels always have data passed in
    isDisabledByField,
    byteCount,
    handleByteCountChange,
    regeneratePsk,
    channelIndex: channel.channelIndex,
  };
}
