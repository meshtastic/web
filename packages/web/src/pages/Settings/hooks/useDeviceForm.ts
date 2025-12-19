import {
  type DeviceValidation,
  DeviceValidationSchema,
} from "@app/validation/config/device";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog";
import { createZodResolver } from "@components/Form/createZodResolver";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { useCallback, useEffect, useRef } from "react";
import { type Path, useForm } from "react-hook-form";

const SECTION = { type: "config", variant: "device" } as const;

export function useDeviceForm() {
  const { config, getEffectiveConfig, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const baseConfig = config.device;
  const effectiveConfig = getEffectiveConfig("device");

  const isReady = baseConfig !== undefined;

  const form = useForm<DeviceValidation>({
    mode: "onChange",
    resolver: createZodResolver(DeviceValidationSchema),
    defaultValues: baseConfig,
    values: effectiveConfig,
  });

  const { watch, getValues, setValue } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<DeviceValidation | undefined>(undefined);

  // Sync form changes to store and field registry
  useEffect(() => {
    const subscription = watch((formData) => {
      if (!baseConfig || !formData) {
        return;
      }

      const currentValues = formData as DeviceValidation;
      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;

      // Track per-field changes for Activity panel and build changes object
      const changes: Partial<DeviceValidation> = {};
      let hasChanges = false;

      for (const key of Object.keys(currentValues) as Array<
        keyof DeviceValidation
      >) {
        const newValue = currentValues[key];
        const originalValue = baseConfig[key];

        if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
          (changes as Record<string, unknown>)[key] = newValue;
          hasChanges = true;
          trackChange(SECTION, key, newValue, originalValue);
        } else {
          removeChange(SECTION, key);
        }
      }

      if (hasChanges) {
        setChange(SECTION, { ...baseConfig, ...changes }, baseConfig);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, baseConfig, setChange, trackChange, removeChange]);

  // Handle role change with validation dialog
  const handleRoleChange = useCallback(
    async (newRole: string) => {
      const isAllowed = await validateRoleSelection(newRole);

      if (isAllowed) {
        setValue("role", newRole as DeviceValidation["role"], {
          shouldDirty: true,
        });
      }
    },
    [validateRoleSelection, setValue],
  );

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<DeviceValidation>;
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
    handleRoleChange,
  };
}
