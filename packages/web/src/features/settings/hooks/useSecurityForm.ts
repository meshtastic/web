import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
} from "../validation/config/security";
import { createZodResolver } from "../components/form/createZodResolver";
import { useFieldRegistry } from "../services/fieldRegistry";
import { useDevice } from "@core/stores";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519";
import { fromByteArray, toByteArray } from "base64-js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type DefaultValues, type Path, useForm } from "react-hook-form";

const SECTION = { type: "config", variant: "security" } as const;

export function useSecurityForm() {
  const { config, getEffectiveConfig, setChange } = useDevice();
  const { trackChange, removeChange } = useFieldRegistry();

  const baseConfig = config.security;
  const effectiveConfig = getEffectiveConfig("security");

  // Convert Uint8Array to base64 strings for form
  const toFormValues = useCallback(
    (cfg: ParsedSecurity | undefined): RawSecurity | undefined => {
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

  // Convert base64 strings back to Uint8Array for store
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

  const isReady = baseConfig !== undefined;

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

  // Sync form changes to store and field registry
  useEffect(() => {
    const subscription = watch((formData) => {
      if (!baseConfig || !formData || !defaultValues) {
        return;
      }

      const currentValues = formData as RawSecurity;
      const prevValues = prevValuesRef.current;

      if (JSON.stringify(currentValues) === JSON.stringify(prevValues)) {
        return;
      }

      prevValuesRef.current = currentValues;

      // Convert for store
      const parsed = fromFormValues(currentValues);

      // Track per-field changes for Activity panel
      for (const key of Object.keys(currentValues) as Array<
        keyof RawSecurity
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

    return () => subscription.unsubscribe();
  }, [
    watch,
    baseConfig,
    defaultValues,
    fromFormValues,
    setChange,
    trackChange,
    removeChange,
  ]);

  // Generate new private/public key pair
  const regenerateKeys = useCallback(() => {
    const privateKey = getX25519PrivateKey();
    const publicKey = getX25519PublicKey(privateKey);

    setValue("privateKey", fromByteArray(privateKey), { shouldDirty: true });
    setValue("publicKey", fromByteArray(publicKey), { shouldDirty: true });
    trigger(["privateKey", "publicKey"]);
  }, [setValue, trigger]);

  // Update public key when private key changes manually
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
