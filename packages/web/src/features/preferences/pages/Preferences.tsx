import { usePreference } from "@data/hooks";
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
import { useTheme } from "@shared/hooks/useTheme";
import {
  type CoordinateFormat,
  DEFAULT_PREFERENCES,
  type DistanceUnits,
  type Language,
  type MapStyle,
  type TimeFormat,
} from "@state/ui/store.ts";
import {
  Globe,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Sun,
  Volume2,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { preferencesRepo } from "@data/repositories/index.ts";

export function PreferencesPage() {
  const { t } = useTranslation("ui");
  const { preference: themePreference, setPreference: setThemePreference } =
    useTheme();

  // Appearance preferences
  const [compactMode, setCompactMode] = usePreference(
    "compactMode",
    DEFAULT_PREFERENCES.compactMode,
  );
  const [showNodeAvatars, setShowNodeAvatars] = usePreference(
    "showNodeAvatars",
    DEFAULT_PREFERENCES.showNodeAvatars,
  );

  // Localization preferences
  const [language, setLanguage] = usePreference<Language>(
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

  // Map preferences
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

  // Audio preferences
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

  const resetToDefaults = useCallback(async () => {
    // Reset all preferences to defaults
    await Promise.all([
      preferencesRepo.set("compactMode", DEFAULT_PREFERENCES.compactMode),
      preferencesRepo.set(
        "showNodeAvatars",
        DEFAULT_PREFERENCES.showNodeAvatars,
      ),
      preferencesRepo.set("language", DEFAULT_PREFERENCES.language),
      preferencesRepo.set("timeFormat", DEFAULT_PREFERENCES.timeFormat),
      preferencesRepo.set("distanceUnits", DEFAULT_PREFERENCES.distanceUnits),
      preferencesRepo.set(
        "coordinateFormat",
        DEFAULT_PREFERENCES.coordinateFormat,
      ),
      preferencesRepo.set("mapStyle", DEFAULT_PREFERENCES.mapStyle),
      preferencesRepo.set("showNodeLabels", DEFAULT_PREFERENCES.showNodeLabels),
      preferencesRepo.set(
        "showConnectionLines",
        DEFAULT_PREFERENCES.showConnectionLines,
      ),
      preferencesRepo.set(
        "autoCenterOnPosition",
        DEFAULT_PREFERENCES.autoCenterOnPosition,
      ),
      preferencesRepo.set("masterVolume", DEFAULT_PREFERENCES.masterVolume),
      preferencesRepo.set(
        "messageSoundEnabled",
        DEFAULT_PREFERENCES.messageSoundEnabled,
      ),
      preferencesRepo.set(
        "alertSoundEnabled",
        DEFAULT_PREFERENCES.alertSoundEnabled,
      ),
    ]);
    // Also reset theme
    setThemePreference("system");
  }, [setThemePreference]);

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
              value={themePreference}
              onValueChange={(value) =>
                setThemePreference(value as "light" | "dark" | "system")
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
                onValueChange={(value) => setLanguage(value as Language)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Espanol</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="pt">Portugues</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("preferences.localization.timeFormat")}</Label>
              <Select
                value={timeFormat}
                onValueChange={(value) => setTimeFormat(value as TimeFormat)}
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
                  setDistanceUnits(value as DistanceUnits)
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
                  setCoordinateFormat(value as CoordinateFormat)
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
              onValueChange={(value) => setMapStyle(value as MapStyle)}
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
              onValueChange={(value) => {
                const v = value[0];
                if (v !== undefined) setMasterVolume(v);
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

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={resetToDefaults}>
          {t("preferences.resetToDefaults")}
        </Button>
      </div>
    </div>
  );
}
