import { useTheme } from "@components/theme-provider";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Label } from "@shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Separator } from "@shared/components/ui/separator";
import { Slider } from "@shared/components/ui/slider";
import { Switch } from "@shared/components/ui/switch";
import { useUIStore } from "@core/stores";
import {
  Globe,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Sun,
  Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PreferencesPage() {
  const { t } = useTranslation("ui");
  const { theme: themeFromProvider, setTheme: setThemeInProvider } = useTheme();

  const {
    compactMode,
    showNodeAvatars,
    language,
    timeFormat,
    distanceUnits,
    coordinateFormat,
    mapStyle,
    showNodeLabels,
    showConnectionLines,
    autoCenterOnPosition,
    masterVolume,
    messageSoundEnabled,
    alertSoundEnabled,
    setCompactMode,
    setShowNodeAvatars,
    setLanguage,
    setTimeFormat,
    setDistanceUnits,
    setCoordinateFormat,
    setMapStyle,
    setShowNodeLabels,
    setShowConnectionLines,
    setAutoCenterOnPosition,
    setMasterVolume,
    setMessageSoundEnabled,
    setAlertSoundEnabled,
    resetToDefaults,
  } = useUIStore();

  const themeMap = new Map([
    [
      "light",
      { id: "light", labelKey: "preferences.appearance.light", Icon: Sun },
    ],
    [
      "dark",
      { id: "dark", labelKey: "preferences.appearance.dark", Icon: Moon },
    ],
    [
      "system",
      {
        id: "system",
        labelKey: "preferences.appearance.system",
        Icon: Monitor,
      },
    ],
  ]);

  function renderThemeOptions(t: (k: string) => string) {
    return Array.from(themeMap.values()).map(({ id, labelKey, Icon }) => (
      <div key={id}>
        <RadioGroupItem value={id} id={id} className="peer sr-only" />
        <Label
          htmlFor={id}
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
        >
          <Icon className="mb-3 h-6 w-6" />
          {t(labelKey)}
        </Label>
      </div>
    ));
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {t("preferences.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t("preferences.description")}
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("preferences.appearance.title")}
          </CardTitle>
          <CardDescription>
            {t("preferences.appearance.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>{t("preferences.appearance.theme")}</Label>
            <RadioGroup
              value={themeFromProvider}
              onValueChange={(value) =>
                setThemeInProvider(value as "light" | "dark" | "system")
              }
              className="grid grid-cols-3 gap-4"
            >
              {renderThemeOptions(t)}
            </RadioGroup>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.appearance.compactMode.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.appearance.compactMode.description")}
              </p>
            </div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.appearance.showNodeAvatars.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.appearance.showNodeAvatars.description")}
              </p>
            </div>
            <Switch
              checked={showNodeAvatars}
              onCheckedChange={setShowNodeAvatars}
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("preferences.localization.title")}
          </CardTitle>
          <CardDescription>
            {t("preferences.localization.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("preferences.localization.language")}</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("preferences.localization.timeFormat")}</Label>
              <Select
                value={timeFormat}
                onValueChange={(value) => setTimeFormat(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">
                    {t("preferences.localization.12hour")}
                  </SelectItem>
                  <SelectItem value="24h">
                    {t("preferences.localization.24hour")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("preferences.localization.distanceUnits")}</Label>
              <Select
                value={distanceUnits}
                onValueChange={(value) => setDistanceUnits(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">
                    {t("preferences.localization.imperial")}
                  </SelectItem>
                  <SelectItem value="metric">
                    {t("preferences.localization.metric")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("preferences.localization.coordinateFormat")}</Label>
              <Select
                value={coordinateFormat}
                onValueChange={(value) => setCoordinateFormat(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd">
                    {t("preferences.localization.decimalDegrees")}
                  </SelectItem>
                  <SelectItem value="dms">
                    {t("preferences.localization.dms")}
                  </SelectItem>
                  <SelectItem value="utm">
                    {t("preferences.localization.utm")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("preferences.map.title")}
          </CardTitle>
          <CardDescription>{t("preferences.map.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("preferences.map.mapStyle")}</Label>
            <Select
              value={mapStyle}
              onValueChange={(value) => setMapStyle(value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">
                  {t("preferences.map.dark")}
                </SelectItem>
                <SelectItem value="light">
                  {t("preferences.map.light")}
                </SelectItem>
                <SelectItem value="satellite">
                  {t("preferences.map.satellite")}
                </SelectItem>
                <SelectItem value="terrain">
                  {t("preferences.map.terrain")}
                </SelectItem>
                <SelectItem value="streets">
                  {t("preferences.map.streets")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.map.showNodeLabels.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.map.showNodeLabels.description")}
              </p>
            </div>
            <Switch
              checked={showNodeLabels}
              onCheckedChange={setShowNodeLabels}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.map.showConnectionLines.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.map.showConnectionLines.description")}
              </p>
            </div>
            <Switch
              checked={showConnectionLines}
              onCheckedChange={setShowConnectionLines}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.map.autoCenterOnPosition.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.map.autoCenterOnPosition.description")}
              </p>
            </div>
            <Switch
              checked={autoCenterOnPosition}
              onCheckedChange={setAutoCenterOnPosition}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            {t("preferences.audio.title")}
          </CardTitle>
          <CardDescription>
            {t("preferences.audio.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("preferences.audio.masterVolume")}</Label>
              <span className="text-xs md:text-sm text-muted-foreground">
                {masterVolume}%
              </span>
            </div>
            <Slider
              value={[masterVolume]}
              onValueChange={(value) => setMasterVolume(value[0])}
              max={100}
              step={1}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.audio.messageSound.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.audio.messageSound.description")}
              </p>
            </div>
            <Switch
              checked={messageSoundEnabled}
              onCheckedChange={setMessageSoundEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("preferences.audio.alertSound.label")}</Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t("preferences.audio.alertSound.description")}
              </p>
            </div>
            <Switch
              checked={alertSoundEnabled}
              onCheckedChange={setAlertSoundEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={resetToDefaults}>
          {t("preferences.resetToDefaults")}
        </Button>
      </div>
    </div>
  );
}
