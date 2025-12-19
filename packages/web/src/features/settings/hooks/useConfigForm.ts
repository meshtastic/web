import { createZodResolver } from "../components/form/createZodResolver";
import { useFieldRegistry } from "../services/fieldRegistry";
import { useDevice, type ValidConfigType } from "@core/stores";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import type { ZodType } from "zod/v4";

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
  const { config, getEffectiveConfig, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();

  // Memoize section to prevent effect re-runs on every render
  const section = useMemo(
    () => ({ type: "config", variant: configType }) as const,
    [configType],
  );

  const baseConfig = config[configType] as DefaultValues<T> | undefined;
  const effectiveConfig = getEffectiveConfig(configType) as T | undefined;
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
  useEffect(() => {
    // Reset initial sync flag when effect re-runs
    hasInitialSyncRef.current = false;

    const subscription = watch((formValues) => {
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

    return () => subscription.unsubscribe();
  }, [watch, baseConfig, section, setChange, trackChange, removeChange]);

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
