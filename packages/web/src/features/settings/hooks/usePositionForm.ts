import { AdminMessageService } from "@core/services/adminMessageService";
import { useNodes } from "@data/hooks";
import { usePositionFlags } from "@shared/hooks/usePositionFlags";
import { useDevice, useDeviceContext } from "@state/index.ts";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";
import {
  type PositionValidation,
  PositionValidationSchema,
} from "../validation/config/position.ts";

const SECTION = { type: "config", variant: "position" } as const;

export function usePositionForm() {
  const { config, getEffectiveConfig, setChange, queueAdminMessage, hardware } =
    useDevice();
  const { trackChange, removeChange } = useFieldRegistry();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);

  const effectiveConfig = getEffectiveConfig("position");
  const baseConfig = config.position;

  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    effectiveConfig?.positionFlags ?? 0,
  );

  // Get current node for position coordinates
  const myNode = useMemo(() => {
    const myNodeNum = hardware.myNodeNum;
    if (!myNodeNum) {
      return undefined;
    }
    return allNodes.find((n) => n.nodeNum === myNodeNum);
  }, [allNodes, hardware.myNodeNum]);

  // Merge config with node position data
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

  const isReady = baseConfig !== undefined;

  const form = useForm<PositionValidation>({
    mode: "onChange",
    resolver: createZodResolver(PositionValidationSchema),
    defaultValues: baseConfig,
    values: formValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<PositionValidation | undefined>(undefined);

  // Sync form changes to store and field registry (excluding position coordinates)
  useEffect(() => {
    const subscription = watch((formData) => {
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

      // Include computed flags value
      const payload = { ...configData, positionFlags: flagsValue };

      // Track per-field changes for Activity panel and build changes object
      const changes: Partial<typeof payload> = {};
      let hasChanges = false;

      for (const key of Object.keys(payload) as Array<keyof typeof payload>) {
        const newValue = payload[key];
        const originalValue = baseConfig[key as keyof typeof baseConfig];

        if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
          changes[key] = newValue;
          hasChanges = true;
          trackChange(SECTION, key as string, newValue, originalValue);
        } else {
          removeChange(SECTION, key as string);
        }
      }

      if (hasChanges) {
        setChange(SECTION, { ...baseConfig, ...changes }, baseConfig);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, baseConfig, flagsValue, setChange, trackChange, removeChange]);

  // Queue admin message for fixed position when saving
  const queueFixedPositionUpdate = useCallback(() => {
    const data = getValues();

    if (
      data.fixedPosition &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const message = AdminMessageService.createSetFixedPositionMessage({
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
