import {
  mergeConfigChanges,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import type { ValidModuleConfigType } from "@features/settings/components/types.ts";
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

interface UseModuleConfigFormOptions<T extends FieldValues> {
  moduleConfigType: ValidModuleConfigType;
  schema: ZodType<T>;
  /**
   * Optional transform to populate default values with nested defaults.
   * Useful for module configs with nested objects like mapReportSettings.
   */
  transformDefaults?: (config: T | undefined) => T | undefined;
}

interface UseModuleConfigFormReturn<T extends FieldValues> {
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

export function useModuleConfigForm<T extends FieldValues>({
  moduleConfigType,
  schema,
  transformDefaults,
}: UseModuleConfigFormOptions<T>): UseModuleConfigFormReturn<T> {
  const { myNodeNum } = useMyNode();
  const device = useDevice();

  // Use device store module config directly (most up-to-date from device)
  const rawBaseConfig = (device?.moduleConfig?.[moduleConfigType] ??
    null) as T | null;

  // Merge pending changes into base config
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);
  const moduleChanges = useMemo(
    () =>
      pendingChanges.filter(
        (c) =>
          c.changeType === "moduleConfig" && c.variant === moduleConfigType,
      ),
    [pendingChanges, moduleConfigType],
  );
  const rawEffectiveConfig = useMemo(() => {
    if (!rawBaseConfig) return null;
    return mergeConfigChanges(
      rawBaseConfig as Record<string, unknown>,
      moduleChanges,
    ) as T;
  }, [rawBaseConfig, moduleChanges]);

  // Apply transforms if provided
  const baseConfig = (
    transformDefaults
      ? transformDefaults(rawBaseConfig as T | undefined)
      : rawBaseConfig
  ) as DefaultValues<T> | undefined;

  const effectiveConfig = transformDefaults
    ? transformDefaults(rawEffectiveConfig as T | undefined)
    : (rawEffectiveConfig as T | undefined);

  // Check if the specific module config has been received from the device
  const hasReceivedConfig =
    device?.configProgress?.receivedConfigs?.has(
      `moduleConfig:${moduleConfigType}`,
    ) ?? false;
  const isReady = hasReceivedConfig;

  const form = useForm<T>({
    mode: "onChange",
    resolver: createZodResolver(schema),
    defaultValues: baseConfig,
    values: effectiveConfig,
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
          changeType: "moduleConfig",
          variant: moduleConfigType,
          fieldPath: key as string,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        clearChange({
          changeType: "moduleConfig",
          variant: moduleConfigType,
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
      pendingReset?.changeType === "moduleConfig" &&
      pendingReset.variant === moduleConfigType &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<T>,
        pendingReset.value as T[keyof T],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form, moduleConfigType]);

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
