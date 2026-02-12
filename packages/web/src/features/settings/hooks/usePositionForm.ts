import { adminCommands } from "@core/services/adminCommands";
import { useNodes } from "@data/hooks";
import {
  mergeConfigChanges,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import { useMyNode } from "@shared/hooks";
import { usePositionFlags } from "@shared/hooks/usePositionFlags";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import {
  type PositionValidation,
  PositionValidationSchema,
} from "../validation/config/position.ts";

export function usePositionForm() {
  const { myNodeNum } = useMyNode();
  const { nodes: allNodes } = useNodes(myNodeNum);

  // Keep queueAdminMessage from device store for admin message queueing
  const device = useDevice();
  const { queueAdminMessage } = device;

  // Use device store config directly (most up-to-date from device)
  const baseConfig = device?.config?.position ?? null;

  // Merge pending changes into base config
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);
  const positionChanges = useMemo(
    () =>
      pendingChanges.filter(
        (c) => c.changeType === "config" && c.variant === "position",
      ),
    [pendingChanges],
  );
  const effectiveConfig = useMemo(() => {
    if (!baseConfig) return null;
    return mergeConfigChanges(
      baseConfig as Record<string, unknown>,
      positionChanges,
    ) as typeof baseConfig;
  }, [baseConfig, positionChanges]);

  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    effectiveConfig?.positionFlags ?? 0,
  );

  const myNode = useMemo(() => {
    if (!myNodeNum) {
      return undefined;
    }
    return allNodes.find((n) => n.nodeNum === myNodeNum);
  }, [allNodes, myNodeNum]);

  // Merge config with node position data for form values
  const formValues = useMemo((): PositionValidation | undefined => {
    if (!effectiveConfig) {
      return undefined;
    }
    return {
      ...effectiveConfig,
      latitude: myNode?.latitudeI ? myNode.latitudeI / 1e7 : undefined,
      longitude: myNode?.longitudeI ? myNode.longitudeI / 1e7 : undefined,
      altitude: myNode?.altitude ?? 0,
    };
  }, [effectiveConfig, myNode]);

  // Base config merged with node position for default values
  const defaultFormValues = useMemo((): PositionValidation | undefined => {
    if (!baseConfig) {
      return undefined;
    }
    return {
      ...baseConfig,
      latitude: myNode?.latitudeI ? myNode.latitudeI / 1e7 : undefined,
      longitude: myNode?.longitudeI ? myNode.longitudeI / 1e7 : undefined,
      altitude: myNode?.altitude ?? 0,
    };
  }, [baseConfig, myNode]);

  // Check if position config has been received from the device
  const hasReceivedConfig =
    device?.configProgress?.receivedConfigs?.has("config:position") ?? false;
  const isReady = hasReceivedConfig;

  const form = useForm<PositionValidation>({
    mode: "onChange",
    resolver: createZodResolver(PositionValidationSchema),
    defaultValues: defaultFormValues,
    values: formValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<PositionValidation | undefined>(undefined);

  // Sync form changes to database (excluding position coordinates)
  const onFormChange = useEffectEvent(
    (formData: Partial<PositionValidation>) => {
      if (!baseConfig || !formData) {
        return;
      }

      const currentValues = formData as PositionValidation;
      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;

      // Exclude position coordinates - they're handled via admin message
      const {
        latitude: _lat,
        longitude: _lon,
        altitude: _alt,
        ...configData
      } = currentValues;

      const payload = { ...configData, positionFlags: flagsValue };

      // Process each field and save/clear changes to database
      for (const key of Object.keys(payload) as Array<keyof typeof payload>) {
        const newValue = payload[key];
        const originalValue = baseConfig[key as keyof typeof baseConfig];

        if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
          saveChange({
            changeType: "config",
            variant: "position",
            fieldPath: key,
            value: newValue,
            originalValue: originalValue,
          });
        } else {
          clearChange({
            changeType: "config",
            variant: "position",
            fieldPath: key,
          });
        }
      }
    },
  );

  useEffect(() => {
    prevValuesRef.current = form.getValues() as PositionValidation;
    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch, onFormChange]);

  // Subscribe to pending field resets from activity undo
  const pendingReset = useUIStore((s) => s.pendingFieldReset);

  useEffect(() => {
    if (
      pendingReset?.changeType === "config" &&
      pendingReset.variant === "position" &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<PositionValidation>,
        pendingReset.value as PositionValidation[keyof PositionValidation],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form]);

  // Queue admin message for fixed position when saving
  const queueFixedPositionUpdate = useCallback(() => {
    const data = getValues();

    if (
      data.fixedPosition &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const message = adminCommands.createSetFixedPositionMessage({
        latitudeI: Math.round(data.latitude * 1e7),
        longitudeI: Math.round(data.longitude * 1e7),
        altitude: data.altitude || 0,
        time: Math.floor(Date.now() / 1000),
      });

      queueAdminMessage(message);
    }
  }, [getValues, queueAdminMessage]);

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<PositionValidation>;
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
    // Position flags helpers
    flagsValue,
    activeFlags,
    toggleFlag,
    getAllFlags,
    // Fixed position
    queueFixedPositionUpdate,
  };
}
