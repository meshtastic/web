import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
} from "@app/validation/config/security.ts";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import { Button } from "@components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Separator } from "@components/ui/separator";
import { Switch } from "@components/ui/switch";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { KeyIcon, LockIcon, ShieldIcon } from "lucide-react";
import { type DefaultValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const SecurityConfig = () => {
  useWaitForConfig({ configCase: "security" });

  const { config, getEffectiveConfig } = useDevice();
  const { trackChange, removeChange: removeFieldChange } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "security" } as const;

  const defaultConfig = config.security;
  const defaultValues = {
    ...defaultConfig,
    privateKey: fromByteArray(defaultConfig?.privateKey ?? new Uint8Array(0)),
    publicKey: fromByteArray(defaultConfig?.publicKey ?? new Uint8Array(0)),
    adminKey: [
      fromByteArray(defaultConfig?.adminKey?.at(0) ?? new Uint8Array(0)),
      fromByteArray(defaultConfig?.adminKey?.at(1) ?? new Uint8Array(0)),
      fromByteArray(defaultConfig?.adminKey?.at(2) ?? new Uint8Array(0)),
    ],
  };

  const effectiveConfig = getEffectiveConfig("security");
  const formValues = {
    ...effectiveConfig,
    privateKey: fromByteArray(effectiveConfig?.privateKey ?? new Uint8Array(0)),
    publicKey: fromByteArray(effectiveConfig?.publicKey ?? new Uint8Array(0)),
    adminKey: [
      fromByteArray(effectiveConfig?.adminKey?.at(0) ?? new Uint8Array(0)),
      fromByteArray(effectiveConfig?.adminKey?.at(1) ?? new Uint8Array(0)),
      fromByteArray(effectiveConfig?.adminKey?.at(2) ?? new Uint8Array(0)),
    ],
  };

  const formMethods = useForm<RawSecurity>({
    mode: "onChange",
    defaultValues: defaultValues as DefaultValues<RawSecurity>,
    resolver: createZodResolver(RawSecuritySchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: formValues as RawSecurity,
  });

  const { register, handleSubmit, watch, setValue, reset } = formMethods;

  const onSubmit = (data: RawSecurity) => {
    const payload: ParsedSecurity = {
      ...data,
      privateKey: toByteArray(data.privateKey),
      publicKey: toByteArray(data.publicKey),
      adminKey: [
        toByteArray(data.adminKey.at(0) ?? ""),
        toByteArray(data.adminKey.at(1) ?? ""),
        toByteArray(data.adminKey.at(2) ?? ""),
      ],
    };

    // Track individual field changes
    const originalData = config.security;
    if (!originalData) {
      return;
    }

    Object.keys(payload).forEach((key) => {
      const fieldName = key as keyof ParsedSecurity;
      const newValue = payload[fieldName];
      const oldValue = originalData[fieldName];

      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });
  };

  const handleReset = () => {
    reset();
    // Clear all security field changes
    const originalData = config.security;
    if (originalData) {
      Object.keys(originalData).forEach((fieldName) => {
        removeFieldChange(section, fieldName);
      });
    }
  };

  const generatePrivateKey = () => {
    const privateKey = getX25519PrivateKey();
    const privateKeyBase64 = fromByteArray(privateKey);
    const publicKey = getX25519PublicKey(privateKey);
    const publicKeyBase64 = fromByteArray(publicKey);

    setValue("privateKey", privateKeyBase64, { shouldDirty: true });
    setValue("publicKey", publicKeyBase64, { shouldDirty: true });
  };

  const generateAdminKey = (index: number) => {
    const newKey = btoa(
      cryptoRandomString({
        length: 32,
        type: "alphanumeric",
      }),
    );
    setValue(`adminKey.${index}` as any, newKey, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* PKI Encryption Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              PKI Encryption
            </CardTitle>
            <CardDescription>
              Public Key Infrastructure for secure communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privateKey">Private Key</Label>
              <div className="flex gap-2">
                <Input
                  id="privateKey"
                  type="password"
                  {...register("privateKey")}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePrivateKey}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your device's private encryption key (keep secret)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Input
                id="publicKey"
                {...register("publicKey")}
                disabled
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Derived from private key (share with others)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Keys Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5" />
              Admin Keys
            </CardTitle>
            <CardDescription>
              Configure administrative channel keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="adminChannelEnabled">
                  Admin Channel Enabled
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable administrative channel
                </p>
              </div>
              <Switch
                id="adminChannelEnabled"
                checked={watch("adminChannelEnabled")}
                onCheckedChange={(checked) =>
                  setValue("adminChannelEnabled", checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="adminKey0">Primary Admin Key</Label>
              <div className="flex gap-2">
                <Input
                  id="adminKey0"
                  type="password"
                  {...register("adminKey.0")}
                  disabled={!watch("adminChannelEnabled")}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateAdminKey(0)}
                  disabled={!watch("adminChannelEnabled")}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminKey1">Secondary Admin Key</Label>
              <div className="flex gap-2">
                <Input
                  id="adminKey1"
                  type="password"
                  {...register("adminKey.1")}
                  disabled={!watch("adminChannelEnabled")}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateAdminKey(1)}
                  disabled={!watch("adminChannelEnabled")}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminKey2">Tertiary Admin Key</Label>
              <div className="flex gap-2">
                <Input
                  id="adminKey2"
                  type="password"
                  {...register("adminKey.2")}
                  disabled={!watch("adminChannelEnabled")}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateAdminKey(2)}
                  disabled={!watch("adminChannelEnabled")}
                >
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockIcon className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Additional security and logging options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isManaged">Managed Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Device is managed by an administrator
                </p>
              </div>
              <Switch
                id="isManaged"
                checked={watch("isManaged")}
                onCheckedChange={(checked) => setValue("isManaged", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="debugLogApiEnabled">Debug Log API</Label>
                <p className="text-xs text-muted-foreground">
                  Enable debug logging API
                </p>
              </div>
              <Switch
                id="debugLogApiEnabled"
                checked={watch("debugLogApiEnabled")}
                onCheckedChange={(checked) =>
                  setValue("debugLogApiEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="serialEnabled">Serial Output</Label>
                <p className="text-xs text-muted-foreground">
                  Enable serial console output
                </p>
              </div>
              <Switch
                id="serialEnabled"
                checked={watch("serialEnabled")}
                onCheckedChange={(checked) =>
                  setValue("serialEnabled", checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};
