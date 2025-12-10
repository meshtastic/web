import { createZodResolver } from "@components/Form/createZodResolver";
import { create } from "@bufbuild/protobuf";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { useDevice, useDeviceContext } from "@core/stores";
import { useNodes } from "@db/hooks";
import {
  type UserValidation,
  UserValidationSchema,
} from "@app/validation/config/user";
import { Protobuf } from "@meshtastic/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type Path, useForm } from "react-hook-form";

const SECTION = { type: "config", variant: "user" } as const;

export function useUserForm() {
  const { hardware, connection, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);

  // Get user data from node, not config
  const myNode = useMemo(() => {
    return allNodes.find((n) => n.nodeNum === hardware.myNodeNum);
  }, [allNodes, hardware.myNodeNum]);

  const defaultValues = useMemo(
    (): UserValidation => ({
      longName: myNode?.longName ?? "",
      shortName: myNode?.shortName ?? "",
      isLicensed: myNode?.isLicensed ?? false,
      isUnmessageable: false,
    }),
    [myNode],
  );

  const isReady = myNode !== undefined;

  const form = useForm<UserValidation>({
    mode: "onChange",
    resolver: createZodResolver(UserValidationSchema),
    defaultValues,
    values: defaultValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<UserValidation | undefined>(undefined);
  const originalValuesRef = useRef<UserValidation>(defaultValues);

  // Store original values on mount
  useEffect(() => {
    originalValuesRef.current = defaultValues;
  }, [defaultValues]);

  // Sync form changes to store and field registry
  useEffect(() => {
    const subscription = watch((formData) => {
      if (!formData) return;

      const currentValues = formData as UserValidation;
      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;

      const original = originalValuesRef.current;

      // Track per-field changes for Activity panel
      let hasChanges = false;
      for (const key of Object.keys(currentValues) as Array<keyof UserValidation>) {
        const newValue = currentValues[key];
        const originalValue = original[key];

        if (newValue !== originalValue) {
          hasChanges = true;
          trackChange(SECTION, key, newValue, originalValue);
        } else {
          removeChange(SECTION, key);
        }
      }

      if (hasChanges) {
        setChange(SECTION, currentValues, original);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setChange, trackChange, removeChange]);

  // Send user data directly to device (called on save)
  const sendToDevice = useCallback(() => {
    const data = getValues();
    const userData = create(Protobuf.Mesh.UserSchema, {
      ...data,
    });
    connection?.setOwner(userData);
  }, [connection, getValues]);

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<UserValidation>;
        selector?: number;
        invert?: boolean;
      }>,
      disabled?: boolean,
    ): boolean => {
      if (disabled) return true;
      if (!disabledBy) return false;

      return disabledBy.some((field) => {
        const value = getValues(field.fieldName);
        if (typeof value === "boolean") {
          return field.invert ? value : !value;
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
    sendToDevice,
  };
}
