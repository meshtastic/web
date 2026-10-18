import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { channelSetFromUrl, channelSetToUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@meshtastic/sdk";
import { Result } from "better-result";

/**
 * Device profile (`.cfg`) import and export, the binary
 * `ClientOnly.DeviceProfile` format shared with the Android, Apple and Python
 * clients. Everything here is pure: the page reads the editor and applies the
 * import plan, so this file needs no device to test.
 */

type LocalConfig = Protobuf.LocalOnly.LocalConfig;
type LocalModuleConfig = Protobuf.LocalOnly.LocalModuleConfig;
type DeviceProfile = Protobuf.ClientOnly.DeviceProfile;

/** The parts of a profile the user can include or leave out. */
export const PROFILE_FIELDS = [
  "longName",
  "shortName",
  "channelUrl",
  "config",
  "moduleConfig",
  "fixedPosition",
  "isUnmessagable",
  "isLicensed",
  "privateKey",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileSelection = Record<ProfileField, boolean>;

/** LocalConfig sections, as named in both LocalConfig and the editor. */
export const PROFILE_RADIO_SECTIONS = [
  "device",
  "position",
  "power",
  "network",
  "display",
  "lora",
  "bluetooth",
  "security",
] as const satisfies readonly (keyof LocalConfig)[];

/** LocalModuleConfig sections, as named in both LocalModuleConfig and the editor. */
export const PROFILE_MODULE_SECTIONS = [
  "mqtt",
  "serial",
  "externalNotification",
  "storeForward",
  "rangeTest",
  "telemetry",
  "cannedMessage",
  "audio",
  "remoteHardware",
  "neighborInfo",
  "ambientLighting",
  "detectionSensor",
  "paxcounter",
  "statusmessage",
  "trafficManagement",
  "tak",
  "meshBeacon",
] as const satisfies readonly (keyof LocalModuleConfig)[];

export type ProfileRadioSection = (typeof PROFILE_RADIO_SECTIONS)[number];
export type ProfileModuleSection = (typeof PROFILE_MODULE_SECTIONS)[number];

/**
 * Not installed on import, like Android: a node built without the module
 * exports zeroes, which would turn off this node's position dedup.
 */
const MODULE_SECTIONS_NOT_INSTALLED: readonly ProfileModuleSection[] = [
  "trafficManagement",
];

const MAX_CHANNELS = 8;

/** What the export reads from the connected node. */
export interface ProfileSource {
  owner?: Protobuf.Mesh.User;
  radio: Partial<Pick<LocalConfig, ProfileRadioSection>>;
  modules: Partial<Pick<LocalModuleConfig, ProfileModuleSection>>;
  /** Channels by index; disabled ones are left out of the URL. */
  channels: Iterable<Protobuf.Channel.Channel>;
  /** The node's own position; exported only when fixed position is on. */
  ownPosition?: Protobuf.Mesh.Position;
}

/** The channel share URL for the enabled channels, primary first. */
export function channelUrlFromChannels(
  channels: Iterable<Protobuf.Channel.Channel>,
  loraConfig: Protobuf.Config.Config_LoRaConfig | undefined,
): string | undefined {
  const settings = [...channels]
    .filter((ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED)
    .sort((a, b) => a.index - b.index)
    .map((ch) => ch.settings)
    .filter((s): s is Protobuf.Channel.ChannelSettings => s !== undefined);
  if (settings.length === 0) return undefined;
  const channelSet = create(Protobuf.AppOnly.ChannelSetSchema, {
    settings,
    loraConfig,
  });
  return channelSetToUrl(channelSet);
}

/** The full profile of the node, private key included. Filter before saving. */
export function buildDeviceProfile(source: ProfileSource): DeviceProfile {
  const config = create(Protobuf.LocalOnly.LocalConfigSchema, {});
  let hasConfig = false;
  for (const key of PROFILE_RADIO_SECTIONS) {
    const value = source.radio[key];
    if (value) {
      (config as Record<ProfileRadioSection, unknown>)[key] = value;
      hasConfig = true;
    }
  }

  const moduleConfig = create(Protobuf.LocalOnly.LocalModuleConfigSchema, {});
  let hasModules = false;
  for (const key of PROFILE_MODULE_SECTIONS) {
    const value = source.modules[key];
    if (value) {
      (moduleConfig as Record<ProfileModuleSection, unknown>)[key] = value;
      hasModules = true;
    }
  }

  const position = source.ownPosition;
  const fixedPosition =
    source.radio.position?.fixedPosition &&
    position?.latitudeI !== undefined &&
    position.longitudeI !== undefined &&
    (position.latitudeI !== 0 || position.longitudeI !== 0)
      ? create(Protobuf.Mesh.PositionSchema, {
          latitudeI: position.latitudeI,
          longitudeI: position.longitudeI,
          altitude: position.altitude,
        })
      : undefined;

  const owner = source.owner;
  return create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: owner?.longName || undefined,
    shortName: owner?.shortName || undefined,
    isUnmessagable: owner ? (owner.isUnmessagable ?? false) : undefined,
    isLicensed: owner ? owner.isLicensed : undefined,
    channelUrl: channelUrlFromChannels(source.channels, source.radio.lora),
    config: hasConfig ? config : undefined,
    moduleConfig: hasModules ? moduleConfig : undefined,
    fixedPosition,
  });
}

const hasPrivateKey = (profile: DeviceProfile): boolean =>
  (profile.config?.security?.privateKey.length ?? 0) > 0;

/** Which parts the profile holds; the rest can't be selected. */
export function profileContents(profile: DeviceProfile): ProfileSelection {
  return {
    longName: profile.longName !== undefined,
    shortName: profile.shortName !== undefined,
    channelUrl: profile.channelUrl !== undefined,
    config: profile.config !== undefined,
    moduleConfig: profile.moduleConfig !== undefined,
    fixedPosition: profile.fixedPosition !== undefined,
    isUnmessagable: profile.isUnmessagable !== undefined,
    isLicensed: profile.isLicensed !== undefined,
    privateKey: hasPrivateKey(profile),
  };
}

/** Everything the profile holds, except the private key. */
export function defaultSelection(profile: DeviceProfile): ProfileSelection {
  return { ...profileContents(profile), privateKey: false };
}

/**
 * A copy of the profile with only the selected parts. The private key, and
 * the public key that pairs with it, are kept only when explicitly selected.
 */
export function selectProfileFields(
  profile: DeviceProfile,
  selection: ProfileSelection,
): DeviceProfile {
  const copy = create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: selection.longName ? profile.longName : undefined,
    shortName: selection.shortName ? profile.shortName : undefined,
    channelUrl: selection.channelUrl ? profile.channelUrl : undefined,
    moduleConfig: selection.moduleConfig ? profile.moduleConfig : undefined,
    fixedPosition: selection.fixedPosition ? profile.fixedPosition : undefined,
    isUnmessagable: selection.isUnmessagable
      ? profile.isUnmessagable
      : undefined,
    isLicensed: selection.isLicensed ? profile.isLicensed : undefined,
    ringtone: profile.ringtone,
    cannedMessages: profile.cannedMessages,
  });

  if (selection.config && profile.config) {
    const security = profile.config.security;
    copy.config = create(Protobuf.LocalOnly.LocalConfigSchema, {
      ...profile.config,
      security:
        security && !(selection.privateKey && hasPrivateKey(profile))
          ? create(Protobuf.Config.Config_SecurityConfigSchema, {
              ...security,
              privateKey: new Uint8Array(),
              publicKey: new Uint8Array(),
            })
          : security,
    });
  }
  return copy;
}

export function encodeDeviceProfile(profile: DeviceProfile): Uint8Array {
  return toBinary(Protobuf.ClientOnly.DeviceProfileSchema, profile);
}

export class ProfileDecodeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProfileDecodeError";
  }
}

/** Parses a `.cfg` file. Fails on bytes that aren't a non-empty profile. */
export function decodeDeviceProfile(
  bytes: Uint8Array,
): Result<DeviceProfile, ProfileDecodeError> {
  let profile: DeviceProfile;
  try {
    profile = fromBinary(Protobuf.ClientOnly.DeviceProfileSchema, bytes);
  } catch (cause) {
    return Result.err(
      new ProfileDecodeError("Not a device profile", { cause }),
    );
  }
  const contents = profileContents(profile);
  if (!Object.values(contents).some(Boolean)) {
    return Result.err(new ProfileDecodeError("The profile is empty"));
  }
  return Result.ok(profile);
}

const FALLBACK_NODE_NAME = "node";
const MAX_NAME_LENGTH = 48;
const PICTOGRAPHIC_RANGES: readonly [number, number][] = [
  [0x1d000, 0x1d1ff],
  [0x1f000, 0x1faff],
  [0x1fb00, 0x1fbff],
];

const isNameChar = (char: string): boolean => {
  const codePoint = char.codePointAt(0) ?? 0;
  if (
    PICTOGRAPHIC_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi)
  )
    return false;
  return /^[\p{L}\p{N}_-]$/u.test(char);
};

/**
 * Reduces a node name to something safe in a file name, like Android: letters
 * and digits of any script stay, each run of anything else becomes one `_`.
 * Undefined when nothing usable is left (an all-emoji name, say).
 */
export function sanitizeExportNameSegment(
  name: string | undefined,
): string | undefined {
  if (!name) return undefined;
  let out = "";
  for (const char of name) {
    if (isNameChar(char)) out += char;
    else if (out.length > 0 && !out.endsWith("_")) out += "_";
  }
  const capped = Array.from(out).slice(0, MAX_NAME_LENGTH).join("");
  const trimmed = capped.replace(/_+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `yyyyMMdd` in local time. */
export const dateStamp = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

/**
 * Android's export name: `Meshtastic_<name>_<yyyyMMdd>_nodeConfig.cfg`, where
 * the name is the long name, else the short name, else `node`.
 */
export function deviceProfileFileName(
  longName: string | undefined,
  shortName: string | undefined,
  date: Date,
): string {
  const name =
    sanitizeExportNameSegment(longName) ??
    sanitizeExportNameSegment(shortName) ??
    FALLBACK_NODE_NAME;
  return `Meshtastic_${name}_${dateStamp(date)}_nodeConfig.cfg`;
}

/** What the import reads from the connected node. */
export interface ImportTarget {
  owner?: Protobuf.Mesh.User;
  /** The node's current security config, to keep its keys. */
  security?: Protobuf.Config.Config_SecurityConfig;
  /** Indexes of the channels in use now. */
  activeChannelIndexes: readonly number[];
}

export type ImportSkip =
  | "owner"
  | "isLicensed"
  | "security"
  | "trafficManagement"
  | "ringtone"
  | "cannedMessages";

/** The edits an import stages; nothing is sent until the user saves. */
export interface ImportPlan {
  owner?: Protobuf.Mesh.User;
  radio: { [K in ProfileRadioSection]?: NonNullable<LocalConfig[K]> };
  modules: { [K in ProfileModuleSection]?: NonNullable<LocalModuleConfig[K]> };
  channels: Protobuf.Channel.Channel[];
  fixedPosition?: Protobuf.Mesh.Position;
  /** Parts of the file that are deliberately not applied. */
  skipped: ImportSkip[];
}

export class ProfileImportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProfileImportError";
  }
}

/**
 * Turns an (already filtered) profile into editor changes, following
 * Android's install: the channel URL replaces the channel table and its LoRa
 * settings win over the config's; the licensed flag and traffic management
 * are never installed. The node keeps its own key pair unless the profile
 * carries a private key.
 */
export function planProfileImport(
  profile: DeviceProfile,
  target: ImportTarget,
): Result<ImportPlan, ProfileImportError> {
  const plan: ImportPlan = {
    radio: {},
    modules: {},
    channels: [],
    skipped: [],
  };

  let channelSet: Protobuf.AppOnly.ChannelSet | undefined;
  if (profile.channelUrl) {
    try {
      channelSet = channelSetFromUrl(profile.channelUrl);
    } catch (cause) {
      return Result.err(
        new ProfileImportError("Invalid channel URL in profile", { cause }),
      );
    }
    if (
      channelSet.settings.length === 0 ||
      channelSet.settings.length > MAX_CHANNELS
    ) {
      return Result.err(
        new ProfileImportError("Invalid channel set in profile"),
      );
    }
  }

  if (
    profile.longName !== undefined ||
    profile.shortName !== undefined ||
    profile.isUnmessagable !== undefined
  ) {
    if (target.owner) {
      plan.owner = create(Protobuf.Mesh.UserSchema, {
        ...target.owner,
        longName: profile.longName ?? target.owner.longName,
        shortName: profile.shortName ?? target.owner.shortName,
        isUnmessagable: profile.isUnmessagable ?? target.owner.isUnmessagable,
      });
    } else {
      plan.skipped.push("owner");
    }
  }
  if (profile.isLicensed !== undefined) plan.skipped.push("isLicensed");

  const config = profile.config;
  if (config) {
    for (const key of PROFILE_RADIO_SECTIONS) {
      if (key === "security") continue;
      const value = config[key];
      if (value) (plan.radio as Record<string, unknown>)[key] = value;
    }
    const security = config.security;
    if (security) {
      if (security.privateKey.length > 0) {
        plan.radio.security = security;
      } else if (target.security) {
        plan.radio.security = create(
          Protobuf.Config.Config_SecurityConfigSchema,
          {
            ...security,
            privateKey: target.security.privateKey,
            publicKey: target.security.publicKey,
          },
        );
      } else {
        // Staging it now would send empty keys, and the node would make new ones.
        plan.skipped.push("security");
      }
    }
  }

  const moduleConfig = profile.moduleConfig;
  if (moduleConfig) {
    for (const key of PROFILE_MODULE_SECTIONS) {
      const value = moduleConfig[key];
      if (!value) continue;
      if (MODULE_SECTIONS_NOT_INSTALLED.includes(key)) {
        plan.skipped.push("trafficManagement");
        continue;
      }
      (plan.modules as Record<string, unknown>)[key] = value;
    }
  }

  if (channelSet) {
    channelSet.settings.forEach((settings, index) => {
      plan.channels.push(
        create(Protobuf.Channel.ChannelSchema, {
          index,
          role:
            index === 0
              ? Protobuf.Channel.Channel_Role.PRIMARY
              : Protobuf.Channel.Channel_Role.SECONDARY,
          settings,
        }),
      );
    });
    for (const index of target.activeChannelIndexes) {
      if (index >= channelSet.settings.length && index < MAX_CHANNELS) {
        plan.channels.push(
          create(Protobuf.Channel.ChannelSchema, {
            index,
            role: Protobuf.Channel.Channel_Role.DISABLED,
            settings: create(Protobuf.Channel.ChannelSettingsSchema, {}),
          }),
        );
      }
    }
    if (channelSet.loraConfig) {
      plan.radio.lora = channelSet.loraConfig;
    }
  }

  if (profile.fixedPosition) plan.fixedPosition = profile.fixedPosition;
  if (profile.ringtone !== undefined) plan.skipped.push("ringtone");
  if (profile.cannedMessages !== undefined) plan.skipped.push("cannedMessages");

  return Result.ok(plan);
}
