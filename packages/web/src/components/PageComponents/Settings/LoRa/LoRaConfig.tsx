import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type LoRaValidation,
  LoRaValidationSchema,
} from "@app/validation/config/lora.ts";
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
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { Radio, Settings, Waves } from "lucide-react";
import { type DefaultValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const LoRaConfig = () => {
  useWaitForConfig({ configCase: "lora" });

  const { config, setChange, getEffectiveConfig, removeChange } = useDevice();
  const { t } = useTranslation("config");

  const defaultConfig = config.lora;
  const effectiveConfig = getEffectiveConfig("lora");

  const formMethods = useForm<LoRaValidation>({
    mode: "onChange",
    defaultValues: defaultConfig as DefaultValues<LoRaValidation>,
    resolver: createZodResolver(LoRaValidationSchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: effectiveConfig as LoRaValidation,
  });

  const { register, handleSubmit, watch, setValue, reset } = formMethods;

  const onSubmit = (data: LoRaValidation) => {
    if (deepCompareConfig(config.lora, data, true)) {
      removeChange({ type: "config", variant: "lora" });
      return;
    }

    setChange({ type: "config", variant: "lora" }, data, config.lora);
  };

  const handleReset = () => {
    reset();
    removeChange({ type: "config", variant: "lora" });
  };

  const regionOptions = Object.entries(
    Protobuf.Config.Config_LoRaConfig_RegionCode,
  ).filter(([key]) => isNaN(Number(key)));

  const modemPresetOptions = Object.entries(
    Protobuf.Config.Config_LoRaConfig_ModemPreset,
  ).filter(([key]) => isNaN(Number(key)));

  // Watch values
  const usePreset = watch("usePreset");
  const bandwidth = watch("bandwidth");
  const spreadFactor = watch("spreadFactor");
  const codingRate = watch("codingRate");
  const txPower = watch("txPower");
  const frequencyOffset = watch("frequencyOffset");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* LoRa Configuration Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              {t("lora.title")}
            </CardTitle>
            <CardDescription>{t("lora.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region">{t("lora.region.label")}</Label>
              <Select
                value={String(watch("region"))}
                onValueChange={(val) => setValue("region", Number(val))}
              >
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map(([name, value]) => (
                    <SelectItem key={name} value={String(value)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("lora.region.description")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hopLimit">{t("lora.hopLimit.label")}</Label>
              <Select
                value={String(watch("hopLimit"))}
                onValueChange={(val) => setValue("hopLimit", Number(val))}
              >
                <SelectTrigger id="hopLimit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("lora.hopLimit.description")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelNum">
                {t("lora.frequencySlot.label")}
              </Label>
              <Input
                id="channelNum"
                type="number"
                {...register("channelNum", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.frequencySlot.description")}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ignoreMqtt">
                  {t("lora.ignoreMqtt.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.ignoreMqtt.description")}
                </p>
              </div>
              <Switch
                id="ignoreMqtt"
                checked={watch("ignoreMqtt")}
                onCheckedChange={(checked) => setValue("ignoreMqtt", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="configOkToMqtt">
                  {t("lora.okToMqtt.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.okToMqtt.description")}
                </p>
              </div>
              <Switch
                id="configOkToMqtt"
                checked={watch("configOkToMqtt")}
                onCheckedChange={(checked) =>
                  setValue("configOkToMqtt", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Waveform Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5" />
              {t("lora.waveformSettings.label")}
            </CardTitle>
            <CardDescription>
              {t("lora.waveformSettings.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="usePreset">{t("lora.usePreset.label")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.usePreset.description")}
                </p>
              </div>
              <Switch
                id="usePreset"
                checked={usePreset}
                onCheckedChange={(checked) => setValue("usePreset", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modemPreset">
                {t("lora.modemPreset.label")}
              </Label>
              <Select
                value={String(watch("modemPreset"))}
                onValueChange={(val) => setValue("modemPreset", Number(val))}
                disabled={!usePreset}
              >
                <SelectTrigger id="modemPreset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modemPresetOptions.map(([name, value]) => (
                    <SelectItem key={name} value={String(value)}>
                      {name.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("lora.modemPreset.description")}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bandwidth">{t("lora.bandwidth.label")}</Label>
                <span className="text-sm text-muted-foreground">
                  {bandwidth} {t("unit.megahertz")}
                </span>
              </div>
              <Slider
                id="bandwidth"
                value={[bandwidth]}
                onValueChange={([val]) => setValue("bandwidth", val)}
                min={31}
                max={500}
                step={1}
                disabled={usePreset}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.bandwidth.description")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="spreadFactor">
                  {t("lora.spreadingFactor.label")}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {spreadFactor} {t("unit.cps")}
                </span>
              </div>
              <Slider
                id="spreadFactor"
                value={[spreadFactor]}
                onValueChange={([val]) => setValue("spreadFactor", val)}
                min={7}
                max={12}
                step={1}
                disabled={usePreset}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.spreadingFactor.description")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="codingRate">
                  {t("lora.codingRate.label")}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {codingRate}
                </span>
              </div>
              <Slider
                id="codingRate"
                value={[codingRate]}
                onValueChange={([val]) => setValue("codingRate", val)}
                min={5}
                max={8}
                step={1}
                disabled={usePreset}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.codingRate.description")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Radio Settings Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("lora.radioSettings.label")}
            </CardTitle>
            <CardDescription>
              {t("lora.radioSettings.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="txEnabled">
                  {t("lora.transmitEnabled.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.transmitEnabled.description")}
                </p>
              </div>
              <Switch
                id="txEnabled"
                checked={watch("txEnabled")}
                onCheckedChange={(checked) => setValue("txEnabled", checked)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="txPower">
                  {t("lora.transmitPower.label")}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {txPower} {t("unit.dbm")}
                </span>
              </div>
              <Slider
                id="txPower"
                value={[txPower]}
                onValueChange={([val]) => setValue("txPower", val)}
                min={0}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.transmitPower.description")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overrideDutyCycle">
                  {t("lora.overrideDutyCycle.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.overrideDutyCycle.description")}
                </p>
              </div>
              <Switch
                id="overrideDutyCycle"
                checked={watch("overrideDutyCycle")}
                onCheckedChange={(checked) =>
                  setValue("overrideDutyCycle", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="frequencyOffset">
                  {t("lora.frequencyOffset.label")}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {frequencyOffset} {t("unit.hertz")}
                </span>
              </div>
              <Slider
                id="frequencyOffset"
                value={[frequencyOffset]}
                onValueChange={([val]) => setValue("frequencyOffset", val)}
                min={-1000}
                max={1000}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.frequencyOffset.description")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sx126xRxBoostedGain">
                  {t("lora.boostedRxGain.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("lora.boostedRxGain.description")}
                </p>
              </div>
              <Switch
                id="sx126xRxBoostedGain"
                checked={watch("sx126xRxBoostedGain")}
                onCheckedChange={(checked) =>
                  setValue("sx126xRxBoostedGain", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overrideFrequency">
                {t("lora.overrideFrequency.label")}
              </Label>
              <Input
                id="overrideFrequency"
                type="number"
                step={0.001}
                {...register("overrideFrequency", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                {t("lora.overrideFrequency.description")} (
                {t("unit.megahertz")})
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
