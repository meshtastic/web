import {
  useEffectiveConfig,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import { useUnsafeRolesDialog } from "@shared/components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog";
import { useMyNode } from "@shared/hooks";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import {
  type DeviceValidation,
  DeviceValidationSchema,
} from "../validation/config/device.ts";

export function useDeviceForm() {
  const { myNodeNum } = useMyNode();
  const { config: dbEffectiveConfig, baseConfig: dbBaseConfig } =
    useEffectiveConfig(myNodeNum, "device");
  const device = useDevice();
  const baseConfig = dbBaseConfig ?? device.config.device ?? null;
  const effectiveConfig = dbEffectiveConfig ?? baseConfig;
  const { saveChange, clearChange } = usePendingChanges(myNodeNum);
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const isReady = baseConfig !== undefined && baseConfig !== null;

  const form = useForm<DeviceValidation>({
    mode: "onChange",
    resolver: createZodResolver(DeviceValidationSchema),
    defaultValues: baseConfig as DeviceValidation | undefined,
    values: effectiveConfig as DeviceValidation | undefined,
  });

  const { watch, getValues, setValue } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<DeviceValidation | undefined>(undefined);
  // Track whether we've completed initial sync (skip first watch fire)
  const hasInitialSyncRef = useRef(false);

  // Sync form changes to database
  const onFormChange = useEffectEvent((formData: Partial<DeviceValidation>) => {
    if (!baseConfig || !formData) {
      return;
    }

    const currentValues = formData as DeviceValidation;

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

    // Process each field and save/clear changes to database
    for (const key of Object.keys(currentValues) as Array<
      keyof DeviceValidation
    >) {
      const newValue = currentValues[key];
      const originalValue = (baseConfig as DeviceValidation)[key];

      if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
        // Save change to database
        saveChange({
          changeType: "config",
          variant: "device",
          fieldPath: key,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        // Clear change from database if reverted to original
        clearChange({
          changeType: "config",
          variant: "device",
          fieldPath: key,
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
      pendingReset.variant === "device" &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<DeviceValidation>,
        pendingReset.value as DeviceValidation[keyof DeviceValidation],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form]);

  // Handle role change with validation dialog
  const handleRoleChange = useCallback(
    async (newRole: string) => {
      const isAllowed = await validateRoleSelection(newRole);

      if (isAllowed) {
        setValue("role", newRole as unknown as DeviceValidation["role"], {
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
