import {
  useEffectiveConfig,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import type { ValidConfigType } from "@features/settings/components/types.ts";
import { useMyNode } from "@shared/hooks";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
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
  // Get myNodeNum for database lookups
  const { myNodeNum } = useMyNode();

  // Load config from database (base + pending changes merged)
  const { config: dbEffectiveConfig, baseConfig: dbBaseConfig } =
    useEffectiveConfig(myNodeNum, configType);

  // Fall back to device store config when DB has no cached row yet.
  // The device store always has config with protobuf defaults, populated
  // with real values as config packets arrive from the device.
  const device = useDevice();
  const baseConfig = dbBaseConfig ?? device.config[configType] ?? null;
  const effectiveConfig = dbEffectiveConfig ?? baseConfig;

  // Get pending changes methods
  const { saveChange, clearChange } = usePendingChanges(myNodeNum);

  const isReady = baseConfig !== undefined && baseConfig !== null;

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
        // Save change to database
        saveChange({
          changeType: "config",
          variant: configType,
          fieldPath: key as string,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        // Clear change from database if reverted to original
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
  }, [watch]);

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
