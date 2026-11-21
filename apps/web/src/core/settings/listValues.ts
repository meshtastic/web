import { Protobuf } from "@core/protobuf.ts";
import type { SettingsSectionId } from "./registry.ts";

/** What the mobile settings list summarises at the right of each row. */
export interface SettingsListInput {
  readonly userName?: string;
  readonly lora?: Pick<
    Protobuf.Config.Config_LoRaConfig,
    "region" | "modemPreset" | "usePreset"
  >;
  readonly channels?: readonly { readonly role: number }[];
  readonly role?: Protobuf.Config.Config_DeviceConfig_Role;
  readonly firmware?: string;
  /** Already translated, e.g. "Dark". */
  readonly theme?: string;
}

/** LONG_FAST → LongFast, the name firmware and Android show. */
export const presetName = (
  preset: Protobuf.Config.Config_LoRaConfig_ModemPreset,
): string =>
  (Protobuf.Config.Config_LoRaConfig_ModemPreset[preset] ?? String(preset))
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

/** EU_868 → EU 868. */
export const regionName = (
  region: Protobuf.Config.Config_LoRaConfig_RegionCode,
): string =>
  (Protobuf.Config.Config_LoRaConfig_RegionCode[region] ?? String(region))
    .split("_")
    .join(" ");

/** CLIENT_MUTE → Client mute. */
export const roleName = (role: Protobuf.Config.Config_DeviceConfig_Role) => {
  const words = (Protobuf.Config.Config_DeviceConfig_Role[role] ?? String(role))
    .toLowerCase()
    .split("_")
    .join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const DISABLED = Protobuf.Channel.Channel_Role.DISABLED;
const UNSET_REGION = Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET;

/** The current value shown beside each settings row, where there is one. */
export function settingsListValues(
  input: SettingsListInput,
): Partial<Record<SettingsSectionId, string>> {
  const values: Partial<Record<SettingsSectionId, string>> = {};
  if (input.userName) values.user = input.userName;
  if (input.lora && input.lora.region !== UNSET_REGION) {
    values.lora = input.lora.usePreset
      ? `${regionName(input.lora.region)} · ${presetName(input.lora.modemPreset)}`
      : regionName(input.lora.region);
  }
  if (input.channels && input.channels.length > 0) {
    values.channels = String(
      input.channels.filter((c) => c.role !== DISABLED).length,
    );
  }
  if (input.role !== undefined) values.device = roleName(input.role);
  if (input.firmware) values.firmware = input.firmware;
  if (input.theme) values.app = input.theme;
  return values;
}
