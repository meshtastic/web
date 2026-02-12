import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import type { Channel as DbChannel } from "@data/index";
import { useMyNode } from "@shared/hooks";
import { useUIStore } from "@state/ui/store.ts";
import cryptoRandomString from "crypto-random-string";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DeepPartial } from "react-hook-form";
import { type DefaultValues, type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver";
import {
  type ChannelValidation,
  makeChannelSchema,
} from "../components/panels/Channels/validation";

export interface UseChannelFormOptions {
  channel: DbChannel;
}

export function useChannelForm({ channel }: UseChannelFormOptions) {
  const { myNodeNum } = useMyNode();
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);

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

  const formToDbChannel = useCallback(
    (data: ChannelValidation): DbChannel => ({
      ownerNodeNum: channel.ownerNodeNum,
      channelIndex: data.index,
      role: data.role,
      name: data.settings.name,
      psk: data.settings.psk,
      uplinkEnabled: data.settings.uplinkEnabled,
      downlinkEnabled: data.settings.downlinkEnabled,
      positionPrecision: data.settings.moduleSettings.positionPrecision,
      createdAt: channel.createdAt,
      updatedAt: new Date(),
    }),
    [channel.ownerNodeNum, channel.createdAt],
  );

  const defaultValues = useMemo(
    () => dbToFormValues(channel),
    [channel, dbToFormValues],
  );

  const workingChannelChange = useMemo(() => {
    return pendingChanges.find(
      (c) =>
        c.changeType === "channel" && c.channelIndex === channel.channelIndex,
    );
  }, [pendingChanges, channel.channelIndex]);

  const workingChannel = workingChannelChange?.value as DbChannel | undefined;
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

  // Submit handler that tracks changes to database
  const submitChanges = useCallback(
    (data: ChannelValidation) => {
      if (!formState.isReady) {
        return;
      }

      const payload = formToDbChannel(data);

      if (JSON.stringify(payload) === JSON.stringify(channel)) {
        // Reverted to original - clear the change
        clearChange({
          changeType: "channel",
          channelIndex: channel.channelIndex,
        });
        return;
      }

      saveChange({
        changeType: "channel",
        channelIndex: channel.channelIndex,
        value: payload,
        originalValue: channel,
      });
    },
    [formState.isReady, formToDbChannel, channel, saveChange, clearChange],
  );

  // Track changes on form value updates
  const prevValuesRef = useRef<ChannelValidation | undefined>(undefined);

  const onFormChange = useEffectEvent(
    (formData: DeepPartial<ChannelValidation>) => {
      if (!formData) {
        return;
      }

      const currentValues = formData as ChannelValidation;
      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;
      submitChanges(currentValues);
    },
  );

  useEffect(() => {
    prevValuesRef.current = form.getValues() as ChannelValidation;
    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch]);

  // Subscribe to pending field resets from activity undo
  const pendingReset = useUIStore((s) => s.pendingFieldReset);

  useEffect(() => {
    // Channel resets come with the whole original channel as value
    if (pendingReset?.changeType === "channel" && !pendingReset.fieldPath) {
      const originalChannel = pendingReset.value as DbChannel | undefined;
      if (
        originalChannel &&
        originalChannel.channelIndex === channel.channelIndex
      ) {
        form.reset(dbToFormValues(originalChannel));
        useUIStore.getState().clearPendingReset();
      }
    }
  }, [pendingReset, form, channel.channelIndex, dbToFormValues]);

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
