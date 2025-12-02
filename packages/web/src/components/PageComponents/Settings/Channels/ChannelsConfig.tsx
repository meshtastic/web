import {
  type ChannelValidation,
  makeChannelSchema,
} from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Separator } from "@components/ui/separator";
import { Slider } from "@components/ui/slider";
import { Switch } from "@components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/ui/tabs";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { Hash, LockIcon, MapPinIcon, QrCodeIcon, UploadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const getChannelName = (channel: Protobuf.Channel.Channel) => {
  return channel.settings?.name.length
    ? channel.settings?.name
    : channel.index === 0
      ? "Primary"
      : `Channel ${channel.index}`;
};

interface ChannelFormProps {
  channel: Protobuf.Channel.Channel;
}

const ChannelForm = ({ channel }: ChannelFormProps) => {
  const { setChange, getChange, removeChange } = useDevice();
  const { t } = useTranslation(["channels", "config"]);

  const workingChannel = getChange({
    type: "channels",
    index: channel.index,
  }) as Protobuf.Channel.Channel | undefined;
  const effectiveConfig = workingChannel ?? channel;

  const defaultValues = {
    ...channel,
    settings: {
      ...channel.settings,
      psk: fromByteArray(channel.settings?.psk ?? new Uint8Array(0)),
      moduleSettings: {
        ...channel.settings?.moduleSettings,
        positionPrecision:
          channel.settings?.moduleSettings?.positionPrecision === undefined
            ? 10
            : channel.settings?.moduleSettings?.positionPrecision,
      },
    },
  };

  const formValues = {
    ...effectiveConfig,
    settings: {
      ...effectiveConfig.settings,
      psk: fromByteArray(effectiveConfig.settings?.psk ?? new Uint8Array(0)),
      moduleSettings: {
        ...effectiveConfig.settings?.moduleSettings,
        positionPrecision:
          effectiveConfig.settings?.moduleSettings?.positionPrecision ===
          undefined
            ? 10
            : effectiveConfig.settings?.moduleSettings?.positionPrecision,
      },
    },
  };

  const [byteCount, setByteCount] = useState<number>(
    effectiveConfig.settings?.psk.length ?? 16,
  );

  const ChannelValidationSchema = useMemo(() => {
    return makeChannelSchema(byteCount);
  }, [byteCount]);

  const formMethods = useForm<ChannelValidation>({
    mode: "onChange",
    defaultValues: defaultValues as DefaultValues<ChannelValidation>,
    resolver: createZodResolver(ChannelValidationSchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: formValues as ChannelValidation,
  });

  const { register, handleSubmit, watch, setValue, reset } = formMethods;

  const onSubmit = (data: ChannelValidation) => {
    const payload = create(Protobuf.Channel.ChannelSchema, {
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(data.settings.psk),
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          ...data.settings.moduleSettings,
          positionPrecision: data.settings.moduleSettings.positionPrecision,
        }),
      },
    });

    if (deepCompareConfig(channel, payload, true)) {
      removeChange({ type: "channel", index: channel.index });
      return;
    }

    setChange({ type: "channel", index: channel.index }, payload, channel);
  };

  const handleReset = () => {
    reset();
    removeChange({ type: "channel", index: channel.index });
  };

  const generatePSK = () => {
    const newPsk = btoa(
      cryptoRandomString({
        length: byteCount ?? 16,
        type: "alphanumeric",
      }),
    );
    setValue("settings.psk", newPsk, { shouldDirty: true });
  };

  const positionPrecision = watch("settings.moduleSettings.positionPrecision");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Channel Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Channel Settings
            </CardTitle>
            <CardDescription>
              Configure channel name and basic settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                placeholder="Enter channel name"
                {...register("settings.name")}
              />
              <p className="text-xs text-muted-foreground">
                Display name for this channel
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Channel Role</Label>
              <Select
                value={String(watch("role"))}
                onValueChange={(val) => setValue("role", Number(val))}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(Protobuf.Channel.Channel_Role)
                    .filter(([key]) => isNaN(Number(key)))
                    .map(([name, value]) => (
                      <SelectItem key={name} value={String(value)}>
                        {name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role determines channel behavior
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="uplinkEnabled">Uplink Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow messages to be sent on this channel
                </p>
              </div>
              <Switch
                id="uplinkEnabled"
                checked={watch("settings.uplinkEnabled")}
                onCheckedChange={(checked) =>
                  setValue("settings.uplinkEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="downlinkEnabled">Downlink Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow messages to be received on this channel
                </p>
              </div>
              <Switch
                id="downlinkEnabled"
                checked={watch("settings.downlinkEnabled")}
                onCheckedChange={(checked) =>
                  setValue("settings.downlinkEnabled", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Encryption Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockIcon className="h-5 w-5" />
              Encryption Settings
            </CardTitle>
            <CardDescription>
              Configure channel encryption and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="psk">Pre-Shared Key</Label>
              <div className="flex gap-2">
                <Input
                  id="psk"
                  type="password"
                  {...register("settings.psk")}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generatePSK}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encryption key for this channel ({byteCount} bytes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pskLength">Key Length</Label>
              <Select
                value={String(byteCount)}
                onValueChange={(val) => setByteCount(Number(val))}
              >
                <SelectTrigger id="pskLength">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Default (AES-128)</SelectItem>
                  <SelectItem value="16">128 bit</SelectItem>
                  <SelectItem value="32">256 bit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Encryption key bit length
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Module Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Module Settings
            </CardTitle>
            <CardDescription>
              Configure position precision and module behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="positionPrecision">Position Precision</Label>
                <span className="text-sm text-muted-foreground">
                  {positionPrecision} bits
                </span>
              </div>
              <Slider
                id="positionPrecision"
                value={[positionPrecision]}
                onValueChange={([val]) =>
                  setValue("settings.moduleSettings.positionPrecision", val)
                }
                min={0}
                max={32}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Number of bits used for position precision (0 = full precision)
              </p>
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

export const ChannelsConfig = () => {
  const { channels, hasChannelChange, setDialogOpen } = useDevice();
  const { t } = useTranslation("channels");

  const allChannels = Array.from(channels.values());
  const flags = useMemo(
    () =>
      new Map(
        allChannels.map((channel) => [
          channel.index,
          hasChannelChange(channel.index),
        ]),
      ),
    [allChannels, hasChannelChange],
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="channel_0">
        <div className="flex items-center gap-2 mb-4">
          <TabsList className="flex-1">
            {allChannels.map((channel) => (
              <TabsTrigger
                key={`channel_${channel.index}`}
                value={`channel_${channel.index}`}
                className="relative"
              >
                {getChannelName(channel)}
                {flags.get(channel.index) && (
                  <span className="absolute -top-0.5 -right-0.5 z-50 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25" />
                    <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen("import", true)}
          >
            <UploadIcon className="mr-2" size={14} />
            {t("page.import")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen("QR", true)}
          >
            <QrCodeIcon className="mr-2" size={14} />
            {t("page.export")}
          </Button>
        </div>
        {allChannels.map((channel) => (
          <TabsContent
            key={`channel_${channel.index}`}
            value={`channel_${channel.index}`}
          >
            <ChannelForm channel={channel} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
