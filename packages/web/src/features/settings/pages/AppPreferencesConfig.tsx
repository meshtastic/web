import { useTheme } from "@app/shared/components/ui/useTheme";
import {
  invalidateCache,
  playNotificationSound,
  type NotificationSlot,
} from "@core/services/notificationSound";
import { usePreference } from "@data/hooks";
import { notificationSoundRepo } from "@data/repositories";
import type { NotificationSound } from "@data/schema";
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
import { toast } from "@shared/hooks/useToast";
import { DEFAULT_PREFERENCES, type DateFormat } from "@state/ui";
import {
  Globe,
  Monitor,
  Moon,
  Palette,
  Play,
  Sun,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";

import { Activity, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_SOUND_SIZE = 512 * 1024; // 512 KB

interface NotificationSoundSlotProps {
  slot: NotificationSlot;
  enabled: boolean;
}

function NotificationSoundSlot({ slot, enabled }: NotificationSoundSlotProps) {
  const { t } = useTranslation("ui");
  const [sound, setSound] = useState<NotificationSound | undefined>();
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSound = useCallback(async () => {
    const result = await notificationSoundRepo.getBySlot(slot);
    setSound(result);
    setLoading(false);
  }, [slot]);

  useEffect(() => {
    void loadSound();
  }, [loadSound]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (file.type !== "audio/mpeg") {
        toast({
          title: t("preferences.audio.invalidFormat"),
          variant: "destructive",
        });
        return;
      }

      if (file.size > MAX_SOUND_SIZE) {
        toast({
          title: t("preferences.audio.fileTooLarge"),
          variant: "destructive",
        });
        return;
      }

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }
      const base64 = btoa(binary);

      await notificationSoundRepo.upsert(
        slot,
        file.name,
        file.type,
        base64,
        file.size,
      );
      invalidateCache(slot);
      await loadSound();
    },
    [slot, loadSound, t],
  );

  const handleRemove = useCallback(async () => {
    await notificationSoundRepo.deleteBySlot(slot);
    invalidateCache(slot);
    setSound(undefined);
  }, [slot]);

  const handlePreview = useCallback(() => {
    void playNotificationSound(slot);
  }, [slot]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleUpload],
  );

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 ml-0 pl-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg"
        className="hidden"
        onChange={handleFileChange}
      />
      {sound ? (
        <>
          <span className="text-xs text-muted-foreground truncate max-w-37.5">
            {sound.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            disabled={!enabled}
            className="h-7 px-2"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="sr-only">{t("preferences.audio.preview")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleRemove()}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">{t("preferences.audio.remove")}</span>
          </Button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {t("preferences.audio.noSound")}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-2"
      >
        <Upload className="h-3.5 w-3.5 mr-1" />
        {t("preferences.audio.upload")}
      </Button>
    </div>
  );
}

interface AppPreferencesConfigProps {
  searchQuery?: string;
}

export const AppPreferencesConfig = ({
  searchQuery = "",
}: AppPreferencesConfigProps) => {
  const { t } = useTranslation("ui");
  const { theme: themeFromProvider, setTheme: setThemeInProvider } = useTheme();

  // Preferences with persistence
  const notify = { notify: true } as const;
  const [language, setLanguage] = usePreference(
    "language",
    DEFAULT_PREFERENCES.language,
    notify,
  );
  const [messageSoundEnabled, setMessageSoundEnabled] = usePreference(
    "messageSoundEnabled",
    DEFAULT_PREFERENCES.messageSoundEnabled,
    notify,
  );
  const [alertSoundEnabled, setAlertSoundEnabled] = usePreference(
    "alertSoundEnabled",
    DEFAULT_PREFERENCES.alertSoundEnabled,
    notify,
  );
  const [notificationVolume, setNotificationVolume] = usePreference(
    "notificationVolume",
    DEFAULT_PREFERENCES.notificationVolume,
    notify,
  );
  const [dateFormat, setDateFormat] = usePreference<DateFormat>(
    "dateFormat",
    DEFAULT_PREFERENCES.dateFormat,
    notify,
  );
  const resetToDefaults = useCallback(async () => {
    await Promise.all([
      setLanguage(DEFAULT_PREFERENCES.language),
      setDateFormat(DEFAULT_PREFERENCES.dateFormat),
      setMessageSoundEnabled(DEFAULT_PREFERENCES.messageSoundEnabled),
      setAlertSoundEnabled(DEFAULT_PREFERENCES.alertSoundEnabled),
      setNotificationVolume(DEFAULT_PREFERENCES.notificationVolume),
    ]);
  }, [
    setLanguage,
    setDateFormat,
    setMessageSoundEnabled,
    setAlertSoundEnabled,
    setNotificationVolume,
  ]);

  const query = searchQuery.toLowerCase().trim();

  const appearanceVisible =
    !query ||
    "appearance theme light dark".includes(query) ||
    t("preferences.appearance.title").toLowerCase().includes(query);

  const localizationVisible =
    !query ||
    "localization language".includes(query) ||
    t("preferences.localization.title").toLowerCase().includes(query);

  const audioVisible =
    !query ||
    "audio sound message alert notification".includes(query) ||
    t("preferences.audio.title").toLowerCase().includes(query);

  const isVisible = appearanceVisible || localizationVisible || audioVisible;

  const themeOptions = [
    { value: "light", label: t("preferences.appearance.light") },
    { value: "dark", label: t("preferences.appearance.dark") },
    { value: "system", label: t("preferences.appearance.system") },
  ];
  if (!isVisible) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No settings found matching "{searchQuery}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Activity mode={appearanceVisible ? "visible" : "hidden"}>
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
          </CardContent>
        </Card>
      </Activity>

      <Activity mode={localizationVisible ? "visible" : "hidden"}>
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
              <Label>{t("preferences.localization.dateFormat")}</Label>
              <Select
                value={dateFormat}
                onValueChange={(value) =>
                  void setDateFormat(value as DateFormat)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("preferences.localization.dateFormat.none")}
                  </SelectItem>
                  <SelectItem value="short">
                    {t("preferences.localization.dateFormat.short")}
                  </SelectItem>
                  <SelectItem value="long">
                    {t("preferences.localization.dateFormat.long")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </Activity>

      <Activity mode={audioVisible ? "visible" : "hidden"}>
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
            <div className="space-y-3">
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
              <NotificationSoundSlot
                slot="message"
                enabled={messageSoundEnabled}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("preferences.audio.alertSound.label")}</Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t("preferences.audio.alertSound.description")}
                  </p>
                </div>
                <Switch
                  checked={alertSoundEnabled}
                  onCheckedChange={(checked) =>
                    void setAlertSoundEnabled(checked)
                  }
                />
              </div>
              <NotificationSoundSlot slot="alert" enabled={alertSoundEnabled} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("preferences.audio.volume.label", "Volume")}</Label>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t(
                      "preferences.audio.volume.description",
                      "Notification sound volume",
                    )}
                  </p>
                </div>
                <span className="text-xs md:text-sm text-muted-foreground tabular-nums">
                  {notificationVolume}%
                </span>
              </div>
              <Slider
                value={[notificationVolume]}
                onValueChange={(value) => {
                  const vol = value[0];
                  if (vol !== undefined) {
                    void setNotificationVolume(vol);
                  }
                }}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </CardContent>
        </Card>
      </Activity>

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetToDefaults}>
          {t("preferences.resetToDefaults")}
        </Button>
      </div>
    </div>
  );
};
