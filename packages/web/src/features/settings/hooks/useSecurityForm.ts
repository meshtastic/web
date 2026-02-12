import {
  mergeConfigChanges,
  usePendingChanges,
} from "@data/hooks/usePendingChanges.ts";
import type { Protobuf } from "@meshtastic/core";
import { useMyNode } from "@shared/hooks";
import { getX25519PrivateKey, getX25519PublicKey } from "@shared/utils/x25519";
import { useDevice } from "@state/index.ts";
import { useUIStore } from "@state/ui/store.ts";
import { fromByteArray, toByteArray } from "base64-js";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { DeepPartial } from "react-hook-form";
import { type DefaultValues, type Path, useForm } from "react-hook-form";
import { createZodResolver } from "../components/form/createZodResolver.ts";
import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
} from "../validation/config/security.ts";

export function useSecurityForm() {
  const { myNodeNum } = useMyNode();
  const device = useDevice();

  // Use device store config directly (most up-to-date from device)
  const baseConfig = device?.config?.security ?? null;

  // Merge pending changes into base config
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);
  const securityChanges = useMemo(
    () =>
      pendingChanges.filter(
        (c) => c.changeType === "config" && c.variant === "security",
      ),
    [pendingChanges],
  );
  const effectiveConfig = useMemo(() => {
    if (!baseConfig) return null;
    return mergeConfigChanges(
      baseConfig as Record<string, unknown>,
      securityChanges,
    ) as typeof baseConfig;
  }, [baseConfig, securityChanges]);

  const toFormValues = useCallback(
    (
      cfg: Protobuf.Config.Config_SecurityConfig | null | undefined,
    ): RawSecurity | undefined => {
      if (!cfg) {
        return undefined;
      }
      return {
        ...cfg,
        privateKey: fromByteArray(cfg.privateKey ?? new Uint8Array(0)),
        publicKey: fromByteArray(cfg.publicKey ?? new Uint8Array(0)),
        adminKey: [
          fromByteArray(cfg.adminKey?.[0] ?? new Uint8Array(0)),
          fromByteArray(cfg.adminKey?.[1] ?? new Uint8Array(0)),
          fromByteArray(cfg.adminKey?.[2] ?? new Uint8Array(0)),
        ],
      };
    },
    [],
  );

  const fromFormValues = useCallback((data: RawSecurity): ParsedSecurity => {
    return {
      ...data,
      privateKey: toByteArray(data.privateKey),
      publicKey: toByteArray(data.publicKey),
      adminKey: [
        toByteArray(data.adminKey[0] ?? ""),
        toByteArray(data.adminKey[1] ?? ""),
        toByteArray(data.adminKey[2] ?? ""),
      ],
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

  // Check if security config has been received from the device
  const hasReceivedConfig =
    device?.configProgress?.receivedConfigs?.has("config:security") ?? false;
  const isReady = hasReceivedConfig;

  const form = useForm<RawSecurity>({
    mode: "onChange",
    resolver: createZodResolver(RawSecuritySchema),
    defaultValues: defaultValues as DefaultValues<RawSecurity>,
    values: formValues,
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
  });

  const { setValue, trigger, watch } = form;

  // Track previous values to detect actual changes
  const prevValuesRef = useRef<RawSecurity | undefined>(undefined);

  // Sync form changes to database
  const onFormChange = useEffectEvent((formData: DeepPartial<RawSecurity>) => {
    if (!baseConfig || !formData || !defaultValues) {
      return;
    }

    const currentValues = formData as RawSecurity;
    const prevValues = prevValuesRef.current;

    if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
      return;
    }

    prevValuesRef.current = currentValues;

    const parsed = fromFormValues(currentValues);
    const originalParsed = fromFormValues(defaultValues);

    // Process each field and save/clear changes to database
    for (const key of Object.keys(parsed) as Array<keyof typeof parsed>) {
      const newValue = parsed[key];
      const originalValue = originalParsed[key];

      if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
        saveChange({
          changeType: "config",
          variant: "security",
          fieldPath: key,
          value: newValue,
          originalValue: originalValue,
        });
      } else {
        clearChange({
          changeType: "config",
          variant: "security",
          fieldPath: key,
        });
      }
    }
  });

  useEffect(() => {
    prevValuesRef.current = form.getValues() as RawSecurity;
    const subscription = watch(onFormChange);
    return () => subscription.unsubscribe();
  }, [watch, onFormChange]);

  // Subscribe to pending field resets from activity undo
  const pendingReset = useUIStore((s) => s.pendingFieldReset);

  useEffect(() => {
    if (
      pendingReset?.changeType === "config" &&
      pendingReset.variant === "security" &&
      pendingReset.fieldPath
    ) {
      form.setValue(
        pendingReset.fieldPath as Path<RawSecurity>,
        pendingReset.value as RawSecurity[keyof RawSecurity],
      );
      useUIStore.getState().clearPendingReset();
    }
  }, [pendingReset, form]);

  // Generate new private/public key pair
  const regenerateKeys = useCallback(() => {
    const privateKey = getX25519PrivateKey();
    const publicKey = getX25519PublicKey(privateKey);

    setValue("privateKey", fromByteArray(privateKey), { shouldDirty: true });
    setValue("publicKey", fromByteArray(publicKey), { shouldDirty: true });
    trigger(["privateKey", "publicKey"]);
  }, [setValue, trigger]);

  const updatePublicKeyFromPrivate = useCallback(
    async (privateKeyBase64: string) => {
      try {
        const privateKey = toByteArray(privateKeyBase64);
        const publicKey = getX25519PublicKey(privateKey);

        setValue("privateKey", privateKeyBase64, { shouldDirty: true });
        setValue("publicKey", fromByteArray(publicKey), { shouldDirty: true });
      } catch {
        // Invalid key format, just set the private key
        setValue("privateKey", privateKeyBase64, { shouldDirty: true });
      }
      await trigger(["privateKey", "publicKey"]);
    },
    [setValue, trigger],
  );

  const isDisabledByField = useCallback(
    (
      disabledBy?: Array<{
        fieldName: Path<RawSecurity>;
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
        const value = form.getValues(field.fieldName);
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
    [form],
  );

  return {
    form,
    isReady,
    isDisabledByField,
    regenerateKeys,
    updatePublicKeyFromPrivate,
  };
}
