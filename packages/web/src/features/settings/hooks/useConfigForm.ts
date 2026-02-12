import {
  mergeConfigChanges,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import type { ValidConfigType } from "@features/settings/components/types.ts";
import { useMyNode } from "@shared/hooks";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { ZodType } from "zod/v4";
import { createZodResolver } from "../components/form/createZodResolver.ts";

interface UseConfigFormOptions<T extends FieldValues> {
  configType: ValidConfigType;
  schema: ZodType<T>;
}

interface UseConfigFormReturn<T extends FieldValues> {
  form: UseFormReturn<T>;
  isReady: boolean;
  isDisabledByField: (
    disabledBy?: Array<{
      fieldName: Path<T>;
      selector?: number;
      invert?: boolean;
    }>,
    disabled?: boolean,
  ) => boolean;
}

export function useConfigForm<T extends FieldValues>({
  configType,
  schema,
}: UseConfigFormOptions<T>): UseConfigFormReturn<T> {
  const { myNodeNum } = useMyNode();
  const device = useDevice();

  // Use device store config directly (most up-to-date from device)
  const baseConfig = (device?.config?.[configType] ?? null) as T | null;

  // Merge pending changes into base config
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);
  const configChanges = useMemo(
    () =>
      pendingChanges.filter(
        (c) => c.changeType === "config" && c.variant === configType,
      ),
    [pendingChanges, configType],
  );
  const effectiveConfig = useMemo(() => {
    if (!baseConfig) return null;
    return mergeConfigChanges(
      baseConfig as Record<string, unknown>,
      configChanges,
    ) as T;
  }, [baseConfig, configChanges]);

  // Check if the specific config has been received from the device
  const hasReceivedConfig =
    device?.configProgress?.receivedConfigs?.has(`config:${configType}`) ??
    false;
  const isReady = hasReceivedConfig;

  const form = useForm<T>({
    mode: "onChange",
    resolver: createZodResolver(schema),
    defaultValues: baseConfig as unknown as DefaultValues<T> | undefined,
    values: effectiveConfig as unknown as T | undefined,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<T | undefined>(undefined);
  // Track whether we've completed initial sync (skip first watch fire)
  const hasInitialSyncRef = useRef(false);

  // Sync form changes to database
  const onFormChange = useEffectEvent((formValues: Partial<T>) => {
    if (!baseConfig || !formValues) {
      return;
    }

    const currentValues = formValues as T;

    // Skip the first watch fire - just capture initial values without tracking
    // This prevents spurious change detection during form initialization
    if (!hasInitialSyncRef.current) {
      prevValuesRef.current = currentValues;
      hasInitialSyncRef.current = true;
      return;
    }

    const prevValues = prevValuesRef.current;

    // Only process if values actually changed
    if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
      return;
    }

    prevValuesRef.current = currentValues;

    // Process each field and save/clear changes to database
    for (const key of Object.keys(currentValues) as Array<keyof T>) {
      const newValue = currentValues[key];
      const originalValue = (baseConfig as unknown as T)[key];

      if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
        saveChange({
          changeType: "config",
          variant: configType,
          fieldPath: key as string,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        clearChange({
          changeType: "config",
          variant: configType,
          fieldPath: key as string,
        });
      }
    }
  });

  useEffect(() => {
    // Reset initial sync flag when effect re-runs
    hasInitialSyncRef.current = false;

    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch, onFormChange]);

  // Subscribe to pending field resets from activity undo
  const pendingReset = useUIStore((s) => s.pendingFieldReset);

  useEffect(() => {
    if (
      pendingReset?.changeType === "config" &&
      pendingReset.variant === configType &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<T>,
        pendingReset.value as T[keyof T],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form, configType]);

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<T>;
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
        const value = getValues(field.fieldName);
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
    [getValues],
  );

  return {
    form,
    isReady,
    isDisabledByField,
  };
}
