import { useTheme } from "@app/shared/components/ui/useTheme";
import { usePreference } from "@data/hooks";
import { DevicesPanel } from "../components/panels/DevicesPanel";
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
import {
  type CoordinateFormat,
  DEFAULT_PREFERENCES,
  type DistanceUnits,
  type MapStyle,
  type TimeFormat,
} from "@state/ui";
import {
  Database,
  Globe,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Sun,
  Volume2,
} from "lucide-react";
import { Activity, useCallback } from "react";
import { useTranslation } from "react-i18next";

const PACKET_BATCH_SIZE_MIN = 10;
const PACKET_BATCH_SIZE_MAX = 100;
const PACKET_BATCH_SIZE_STEP = 5;

interface AppPreferencesConfigProps {
  searchQuery?: string;
}

export const AppPreferencesConfig = ({
  searchQuery = "",
}: AppPreferencesConfigProps) => {
  const { t } = useTranslation("ui");
  const { theme: themeFromProvider, setTheme: setThemeInProvider } = useTheme();

  // Preferences with persistence
  const [compactMode, setCompactMode] = usePreference(
    "compactMode",
    DEFAULT_PREFERENCES.compactMode,
  );
  const [showNodeAvatars, setShowNodeAvatars] = usePreference(
    "showNodeAvatars",
    DEFAULT_PREFERENCES.showNodeAvatars,
  );
  const [language, setLanguage] = usePreference(
    "language",
    DEFAULT_PREFERENCES.language,
  );
  const [timeFormat, setTimeFormat] = usePreference<TimeFormat>(
    "timeFormat",
    DEFAULT_PREFERENCES.timeFormat,
  );
  const [distanceUnits, setDistanceUnits] = usePreference<DistanceUnits>(
    "distanceUnits",
    DEFAULT_PREFERENCES.distanceUnits,
  );
  const [coordinateFormat, setCoordinateFormat] =
    usePreference<CoordinateFormat>(
      "coordinateFormat",
      DEFAULT_PREFERENCES.coordinateFormat,
    );
  const [mapStyle, setMapStyle] = usePreference<MapStyle>(
    "mapStyle",
    DEFAULT_PREFERENCES.mapStyle,
  );
  const [showNodeLabels, setShowNodeLabels] = usePreference(
    "showNodeLabels",
    DEFAULT_PREFERENCES.showNodeLabels,
  );
  const [showConnectionLines, setShowConnectionLines] = usePreference(
    "showConnectionLines",
    DEFAULT_PREFERENCES.showConnectionLines,
  );
  const [autoCenterOnPosition, setAutoCenterOnPosition] = usePreference(
    "autoCenterOnPosition",
    DEFAULT_PREFERENCES.autoCenterOnPosition,
  );
  const [masterVolume, setMasterVolume] = usePreference(
    "masterVolume",
    DEFAULT_PREFERENCES.masterVolume,
  );
  const [messageSoundEnabled, setMessageSoundEnabled] = usePreference(
    "messageSoundEnabled",
    DEFAULT_PREFERENCES.messageSoundEnabled,
  );
  const [alertSoundEnabled, setAlertSoundEnabled] = usePreference(
    "alertSoundEnabled",
    DEFAULT_PREFERENCES.alertSoundEnabled,
  );
  const [packetBatchSize, setPacketBatchSize] = usePreference(
    "packetBatchSize",
    DEFAULT_PREFERENCES.packetBatchSize,
  );

  const resetToDefaults = useCallback(async () => {
    await Promise.all([
      setCompactMode(DEFAULT_PREFERENCES.compactMode),
      setShowNodeAvatars(DEFAULT_PREFERENCES.showNodeAvatars),
      setLanguage(DEFAULT_PREFERENCES.language),
      setTimeFormat(DEFAULT_PREFERENCES.timeFormat),
      setDistanceUnits(DEFAULT_PREFERENCES.distanceUnits),
      setCoordinateFormat(DEFAULT_PREFERENCES.coordinateFormat),
      setMapStyle(DEFAULT_PREFERENCES.mapStyle),
      setShowNodeLabels(DEFAULT_PREFERENCES.showNodeLabels),
      setShowConnectionLines(DEFAULT_PREFERENCES.showConnectionLines),
      setAutoCenterOnPosition(DEFAULT_PREFERENCES.autoCenterOnPosition),
      setMasterVolume(DEFAULT_PREFERENCES.masterVolume),
      setMessageSoundEnabled(DEFAULT_PREFERENCES.messageSoundEnabled),
      setAlertSoundEnabled(DEFAULT_PREFERENCES.alertSoundEnabled),
      setPacketBatchSize(DEFAULT_PREFERENCES.packetBatchSize),
    ]);
  }, [
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
    setPacketBatchSize,
  ]);

  const query = searchQuery.toLowerCase().trim();

  const appearanceVisible =
    !query ||
    "appearance theme compact mode avatars light dark".includes(query) ||
    t("preferences.appearance.title").toLowerCase().includes(query);

  const localizationVisible =
    !query ||
    "localization language time format distance units coordinates".includes(
      query,
    ) ||
    t("preferences.localization.title").toLowerCase().includes(query);

  const mapVisible =
    !query ||
    "map style labels connection lines auto center".includes(query) ||
    t("preferences.map.title").toLowerCase().includes(query);

  const audioVisible =
    !query ||
    "audio sound volume message alert".includes(query) ||
    t("preferences.audio.title").toLowerCase().includes(query);

  const performanceVisible =
    !query ||
    "performance packet batch database".includes(query) ||
    t("preferences.performance.title").toLowerCase().includes(query);

  const isVisible =
    appearanceVisible ||
    localizationVisible ||
    mapVisible ||
    audioVisible ||
    performanceVisible;

  const themeOptions = [
    { value: "light", label: t("preferences.appearance.light") },
    { value: "dark", label: t("preferences.appearance.dark") },
    { value: "system", label: t("preferences.appearance.system") },
  ];
  if (!isVisible) {
    return (
      <Card className="max-w-7xl">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No settings found matching "{searchQuery}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Activity mode={appearanceVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
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
                {themeOptions.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`theme-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`theme-${option.value}`}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      {option.value === "light" && (
                        <Sun className="mb-3 size-5" />
                      )}
                      {option.value === "dark" && (
                        <Moon className="mb-3 size-5" />
                      )}
                      {option.value === "system" && (
                        <Monitor className="mb-3 size-5" />
                      )}
                      {option.label}
                    </Label>
                  </div>
                ))}
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
              <Switch
                checked={compactMode}
                onCheckedChange={(checked) => void setCompactMode(checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {t("preferences.appearance.showNodeAvatars.label")}
                </Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t("preferences.appearance.showNodeAvatars.description")}
                </p>
              </div>
              <Switch
                checked={showNodeAvatars}
                onCheckedChange={(checked) => void setShowNodeAvatars(checked)}
              />
            </div>
          </CardContent>
        </Card>
      </Activity>

      <Activity mode={localizationVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
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
                  onValueChange={(value) => void setLanguage(value)}
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
                  onValueChange={(value) =>
                    void setTimeFormat(value as "12h" | "24h")
                  }
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
                  onValueChange={(value) =>
                    void setDistanceUnits(value as "imperial" | "metric")
                  }
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
                  onValueChange={(value) =>
                    void setCoordinateFormat(value as "dd" | "dms" | "utm")
                  }
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
      </Activity>

      <Activity mode={mapVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("preferences.map.title")}
            </CardTitle>
            <CardDescription>
              {t("preferences.map.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("preferences.map.mapStyle")}</Label>
              <Select
                value={mapStyle}
                onValueChange={(value) =>
                  void setMapStyle(
                    value as
                      | "dark"
                      | "light"
                      | "satellite"
                      | "terrain"
                      | "streets",
                  )
                }
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
                onCheckedChange={(checked) => void setShowNodeLabels(checked)}
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
                onCheckedChange={(checked) =>
                  void setShowConnectionLines(checked)
                }
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
                onCheckedChange={(checked) =>
                  void setAutoCenterOnPosition(checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </Activity>

      <Activity mode={audioVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
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
                onValueChange={(value) => {
                  const vol = value[0];
                  if (vol !== undefined) {
                    void setMasterVolume(vol);
                  }
                }}
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
                onCheckedChange={(checked) =>
                  void setMessageSoundEnabled(checked)
                }
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
                onCheckedChange={(checked) => void setAlertSoundEnabled(checked)}
              />
            </div>
          </CardContent>
        </Card>
      </Activity>

      <Activity mode={performanceVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("preferences.performance.title")}
            </CardTitle>
            <CardDescription>
              {t("preferences.performance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>
                    {t("preferences.performance.packetBatchSize.label")}
                  </Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t("preferences.performance.packetBatchSize.description")}
                  </p>
                </div>
                <span className="text-xs md:text-sm text-muted-foreground tabular-nums">
                  {packetBatchSize}
                </span>
              </div>
              <Slider
                value={[packetBatchSize]}
                onValueChange={(value) => {
                  const size = value[0];
                  if (size !== undefined) {
                    void setPacketBatchSize(size);
                  }
                }}
                min={PACKET_BATCH_SIZE_MIN}
                max={PACKET_BATCH_SIZE_MAX}
                step={PACKET_BATCH_SIZE_STEP}
              />
            </div>
          </CardContent>
        </Card>
      </Activity>

      <DevicesPanel searchQuery={searchQuery} />

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetToDefaults}>
          {t("preferences.resetToDefaults")}
        </Button>
      </div>
    </div>
  );
};
