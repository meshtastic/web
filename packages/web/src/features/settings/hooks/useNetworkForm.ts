import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { convertIntToIpAddress, convertIpAddressToInt } from "@shared/utils/ip";
import { useDevice } from "@state/index.ts";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";
import {
  type NetworkValidation,
  NetworkValidationSchema,
} from "../validation/config/network.ts";

const SECTION = { type: "config", variant: "network" } as const;

export function useNetworkForm() {
  const { config, getEffectiveConfig, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();

  const baseConfig = config.network;
  const effectiveConfig = getEffectiveConfig("network");

  // Convert integer IPs to string for form display
  const toFormValues = useCallback(
    (cfg: typeof baseConfig): NetworkValidation | undefined => {
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
    () => toFormValues(baseConfig),
    [baseConfig, toFormValues],
  );

  const formValues = useMemo(
    () => toFormValues(effectiveConfig),
    [effectiveConfig, toFormValues],
  );

  const isReady = baseConfig !== undefined;

  const form = useForm<NetworkValidation>({
    mode: "onChange",
    resolver: createZodResolver(NetworkValidationSchema),
    defaultValues,
    values: formValues,
  });

  const { watch, getValues } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<NetworkValidation | undefined>(undefined);

  // Sync form changes to store and field registry
  const onFormChange = useEffectEvent((formData: Partial<NetworkValidation>) => {
    if (!baseConfig || !formData || !defaultValues) {
      return;
    }

    const currentValues = formData as NetworkValidation;
    const prevValues = prevValuesRef.current;

    if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
      return;
    }

    prevValuesRef.current = currentValues;

    // Convert for store
    const parsed = fromFormValues(currentValues);

    // Track per-field changes for Activity panel
    for (const key of Object.keys(currentValues) as Array<
      keyof NetworkValidation
    >) {
      const newValue = currentValues[key];
      const originalValue = defaultValues[key];

      if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
        trackChange(SECTION, key, newValue, originalValue);
      } else {
        removeChange(SECTION, key);
      }
    }

    // Send full config to device store
    const hasChanges = JSON.stringify(parsed) !== JSON.stringify(baseConfig);

    if (hasChanges) {
      setChange(SECTION, parsed, baseConfig);
    }
  });

  useEffect(() => {
    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch]);

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
