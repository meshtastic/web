import { useDevice, type ValidModuleConfigType } from "@state/index.ts";
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
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";

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
  const { moduleConfig, getEffectiveModuleConfig, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();

  // Memoize section to prevent effect re-runs on every render
  const section = useMemo(
    () => ({ type: "moduleConfig", variant: moduleConfigType }) as const,
    [moduleConfigType],
  );

  const rawBaseConfig = moduleConfig[moduleConfigType] as T | undefined;
  const rawEffectiveConfig = getEffectiveModuleConfig(moduleConfigType) as
    | T
    | undefined;

  // Apply transforms if provided
  const baseConfig = (
    transformDefaults ? transformDefaults(rawBaseConfig) : rawBaseConfig
  ) as DefaultValues<T> | undefined;
  const effectiveConfig = transformDefaults
    ? transformDefaults(rawEffectiveConfig)
    : rawEffectiveConfig;

  const isReady = baseConfig !== undefined;

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

  // Sync form changes to store and field registry
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

    // Build the change object with only modified fields
    const changes: Partial<T> = {};
    let hasChanges = false;

    for (const key of Object.keys(currentValues) as Array<keyof T>) {
      const newValue = currentValues[key];
      const originalValue = (baseConfig as T)[key];

      if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
        changes[key] = newValue;
        hasChanges = true;
        // Track per-field change for Activity panel
        trackChange(section, key as string, newValue, originalValue);
      } else {
        // Remove from Activity if reverted to original
        removeChange(section, key as string);
      }
    }

    if (hasChanges) {
      setChange(section, { ...baseConfig, ...changes }, baseConfig);
    }
  });

  useEffect(() => {
    // Reset initial sync flag when effect re-runs
    hasInitialSyncRef.current = false;

    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch]);

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
