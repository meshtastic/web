import { create } from "@bufbuild/protobuf";
import { adminCommands } from "@core/services/adminCommands";
import { useNodes } from "@data/hooks";
import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import { Protobuf } from "@meshtastic/core";
import { useMyNode } from "@shared/hooks";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import {
  type UserValidation,
  UserValidationSchema,
} from "../validation/config/user.ts";

export function useUserForm() {
  const { myNodeNum } = useMyNode();
  const { nodes: allNodes } = useNodes(myNodeNum);
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);

  const myNode = useMemo(() => {
    if (!myNodeNum) {
      return undefined;
    }
    return allNodes.find((n) => n.nodeNum === myNodeNum);
  }, [allNodes, myNodeNum]);

  const baseValues = useMemo(
    (): UserValidation => ({
      longName: myNode?.longName ?? "",
      shortName: myNode?.shortName ?? "",
      isLicensed: myNode?.isLicensed ?? false,
      isUnmessageable: false,
    }),
    [myNode],
  );

  // Merge pending changes into base values
  // Always create a new object to ensure react-hook-form detects changes
  const effectiveValues = useMemo((): UserValidation => {
    const userChanges = pendingChanges.filter((c) => c.changeType === "user");

    const merged = { ...baseValues };
    for (const change of userChanges) {
      if (change.fieldPath && change.fieldPath in merged) {
        (merged as Record<string, unknown>)[change.fieldPath] = change.value;
      }
    }
    return merged;
  }, [baseValues, pendingChanges]);

  const isReady = myNodeNum !== undefined;

  const form = useForm<UserValidation>({
    mode: "onChange",
    resolver: createZodResolver(UserValidationSchema),
    defaultValues: baseValues,
    values: effectiveValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<UserValidation | undefined>(undefined);
  const originalValuesRef = useRef<UserValidation>(baseValues);
  // Track whether we've completed initial sync (skip first watch fire)
  const hasInitialSyncRef = useRef(false);

  // Store original values on mount
  useEffect(() => {
    originalValuesRef.current = baseValues;
  }, [baseValues]);

  // Sync form changes to database
  const onFormChange = useEffectEvent((formData: Partial<UserValidation>) => {
    if (!formData) {
      return;
    }

    const currentValues = formData as UserValidation;

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

    const original = originalValuesRef.current;

    // Process each field and save/clear changes to database
    for (const key of Object.keys(currentValues) as Array<
      keyof UserValidation
    >) {
      const newValue = currentValues[key];
      const originalValue = original[key];

      if (newValue !== originalValue) {
        saveChange({
          changeType: "user",
          fieldPath: key,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        clearChange({
          changeType: "user",
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
    if (pendingReset?.changeType === "user" && pendingReset.fieldPath) {
      form.setValue(
        pendingReset.fieldPath as Path<UserValidation>,
        pendingReset.value as UserValidation[keyof UserValidation],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form]);

  const sendToDevice = useCallback(async () => {
    const data = getValues();
    const userData = create(Protobuf.Mesh.UserSchema, {
      ...data,
    });
    await adminCommands.setOwner(userData);
  }, [getValues]);

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<UserValidation>;
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
