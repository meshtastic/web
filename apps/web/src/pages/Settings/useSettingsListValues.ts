import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useTheme } from "@core/hooks/useTheme.ts";
import { useChannels } from "@core/kmp/hooks";
import { settingsListValues } from "@core/settings/listValues.ts";
import type { SettingsSectionId } from "@core/settings/registry.ts";
import { useDevice } from "@core/stores";
import { useTranslation } from "react-i18next";
import { useRadioInfo } from "./radioInfo.ts";

/** Current values for the mobile settings list (user, LoRa, channels…). */
export function useSettingsListValues(): Partial<
  Record<SettingsSectionId, string>
> {
  const { t } = useTranslation("ui");
  const { getEffectiveConfig } = useDevice();
  const user = useMyNodeAsProto()?.user;
  const channels = useChannels();
  const { firmware } = useRadioInfo();
  const { preference } = useTheme();
  return settingsListValues({
    userName: user?.longName || user?.shortName || undefined,
    lora: getEffectiveConfig("lora"),
    channels,
    role: getEffectiveConfig("device")?.role,
    firmware,
    theme: t(`theme.${preference}`),
  });
}
