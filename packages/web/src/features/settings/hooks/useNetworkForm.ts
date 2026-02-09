import { create } from "@bufbuild/protobuf";
import {
  useEffectiveConfig,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import { Protobuf } from "@meshtastic/core";
import { useMyNode } from "@shared/hooks";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { convertIntToIpAddress, convertIpAddressToInt } from "@shared/utils/ip";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { DeepPartial } from "react-hook-form";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import {
  type NetworkValidation,
  NetworkValidationSchema,
} from "../validation/config/network.ts";

export function useNetworkForm() {
  const { myNodeNum } = useMyNode();
  const {
    config: dbEffectiveConfig,
    baseConfig: dbBaseConfig,
    isLoading,
  } = useEffectiveConfig(myNodeNum, "network");
  const device = useDevice();
  const baseConfig = dbBaseConfig ?? device.config.network ?? null;
  const effectiveConfig = dbEffectiveConfig ?? baseConfig;
  const { saveChange, clearChange } = usePendingChanges(myNodeNum);

  // Convert integer IPs to string for form display
  const toFormValues = useCallback(
    (
      cfg: Protobuf.Config.Config_NetworkConfig | null,
    ): NetworkValidation | undefined => {
      if (!cfg) {
        return undefined;
      }
      return {
        ...cfg,
        ipv4Config: {
          ip: convertIntToIpAddress(cfg.ipv4Config?.ip ?? 0),
          gateway: convertIntToIpAddress(cfg.ipv4Config?.gateway ?? 0),
          subnet: convertIntToIpAddress(cfg.ipv4Config?.subnet ?? 0),
          dns: convertIntToIpAddress(cfg.ipv4Config?.dns ?? 0),
        },
        enabledProtocols:
          cfg.enabledProtocols ??
          Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
      };
    },
    [],
  );

  // Convert string IPs back to integers for store
  const fromFormValues = useCallback((data: NetworkValidation) => {
    return {
      ...data,
      ipv4Config: create(
        Protobuf.Config.Config_NetworkConfig_IpV4ConfigSchema,
        {
          ip: convertIpAddressToInt(data.ipv4Config?.ip ?? ""),
          gateway: convertIpAddressToInt(data.ipv4Config?.gateway ?? ""),
          subnet: convertIpAddressToInt(data.ipv4Config?.subnet ?? ""),
          dns: convertIpAddressToInt(data.ipv4Config?.dns ?? ""),
        },
      ),
    };
  }, []);

  const defaultValues = useMemo(
    () => toFormValues(baseConfig ?? null),
    [baseConfig, toFormValues],
  );

  const formValues = useMemo(
    () => toFormValues(effectiveConfig ?? null),
    [effectiveConfig, toFormValues],
  );

  const isReady = baseConfig !== undefined && baseConfig !== null && !isLoading;

  const form = useForm<NetworkValidation>({
    mode: "onChange",
    resolver: createZodResolver(NetworkValidationSchema),
    defaultValues,
    values: formValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<NetworkValidation | undefined>(undefined);
  // Track whether we've completed initial sync (skip first watch fire)
  const hasInitialSyncRef = useRef(false);

  // Sync form changes to database
  const onFormChange = useEffectEvent(
    (formData: DeepPartial<NetworkValidation>) => {
      if (!baseConfig || !formData || !defaultValues) {
        return;
      }

      const currentValues = formData as NetworkValidation;

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

      // Convert form values to store format (with integer IPs)
      const parsed = fromFormValues(currentValues);
      const originalParsed = fromFormValues(defaultValues);

      // Process each field and save/clear changes to database
      for (const key of Object.keys(parsed) as Array<keyof typeof parsed>) {
        const newValue = parsed[key];
        const originalValue = originalParsed[key];

        if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
          // Save change to database
          saveChange({
            changeType: "config",
            variant: "network",
            fieldPath: key,
            value: newValue,
            originalValue: originalValue,
          });
        } else {
          // Clear change from database if reverted to original
          clearChange({
            changeType: "config",
            variant: "network",
            fieldPath: key,
          });
        }
      }
    },
  );

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
      pendingReset.variant === "network" &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<NetworkValidation>,
        pendingReset.value as NetworkValidation[keyof NetworkValidation],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form]);

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<NetworkValidation>;
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
