import type { ModuleConfigSection } from "@core/kmp/configEditor.ts";
/**
 * The Settings section map, grouped like Android's Settings screen. Pure
 * data: labels are i18n keys in the `config` namespace, resolved by the
 * caller. Section ids are the path segments under `/settings`, kept from
 * the previous layout so old links still work.
 */

export const SETTINGS_GROUP_IDS = [
  "configuration",
  "backupRestore",
  "advanced",
  "app",
  "information",
] as const;

export type SettingsGroupId = (typeof SETTINGS_GROUP_IDS)[number];

export const SETTINGS_SECTION_IDS = [
  "user",
  "lora",
  "channels",
  "security",
  "device",
  "module",
  "administration",
  "backup",
  "firmware",
  "clean-nodes",
  "debug",
  "app",
  "message-filter",
  "about",
  "help",
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

/**
 * Where a section's edits go: `radio` sections edit the connected node (and
 * show its name in the breadcrumb), `browser` sections are stored locally,
 * `info` sections edit nothing.
 */
export type SettingsScope = "radio" | "browser" | "info";

export interface SettingsSectionDef<Id extends string = SettingsSectionId> {
  readonly id: Id;
  readonly group: SettingsGroupId;
  /** `config` namespace key of the sidebar label and page title. */
  readonly labelKey: string;
  /** `config` namespace key of the one-line description. */
  readonly descriptionKey: string;
  readonly docsUrl?: string;
  readonly scope: SettingsScope;
  /** Edits are staged in the config editor and sent with Save. */
  readonly stagesEdits: boolean;
}

export const DOCS_BASE = "https://meshtastic.org/docs";
const radioDocs = (page: string) => `${DOCS_BASE}/configuration/radio/${page}/`;
const moduleDocs = (page: string) =>
  `${DOCS_BASE}/configuration/module/${page}/`;

export const FIRMWARE_FLASHER_URL = "https://flasher.meshtastic.org";

export const SETTINGS_SECTIONS = [
  {
    id: "user",
    group: "configuration",
    labelKey: "navigation.user",
    descriptionKey: "sections.userDescription",
    docsUrl: radioDocs("user"),
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "lora",
    group: "configuration",
    labelKey: "navigation.lora",
    descriptionKey: "sections.loraDescription",
    docsUrl: radioDocs("lora"),
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "channels",
    group: "configuration",
    labelKey: "navigation.channels",
    descriptionKey: "sections.channelsDescription",
    docsUrl: radioDocs("channels"),
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "security",
    group: "configuration",
    labelKey: "navigation.security",
    descriptionKey: "sections.securityDescription",
    docsUrl: radioDocs("security"),
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "device",
    group: "configuration",
    labelKey: "navigation.deviceConfiguration",
    descriptionKey: "sections.deviceDescription",
    docsUrl: radioDocs("device"),
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "module",
    group: "configuration",
    labelKey: "navigation.moduleConfiguration",
    descriptionKey: "sections.moduleDescription",
    docsUrl: `${DOCS_BASE}/configuration/module/`,
    scope: "radio",
    stagesEdits: true,
  },
  {
    id: "administration",
    group: "configuration",
    labelKey: "navigation.administration",
    descriptionKey: "sections.administrationDescription",
    docsUrl: `${DOCS_BASE}/configuration/remote-admin/`,
    scope: "radio",
    stagesEdits: false,
  },
  {
    id: "backup",
    group: "backupRestore",
    labelKey: "navigation.deviceProfile",
    descriptionKey: "sections.backupDescription",
    scope: "radio",
    stagesEdits: false,
  },
  {
    id: "firmware",
    group: "advanced",
    labelKey: "navigation.firmwareUpdate",
    descriptionKey: "sections.firmwareDescription",
    docsUrl: `${DOCS_BASE}/getting-started/flashing-firmware/`,
    scope: "radio",
    stagesEdits: false,
  },
  {
    id: "clean-nodes",
    group: "advanced",
    labelKey: "navigation.cleanNodeDb",
    descriptionKey: "sections.cleanNodesDescription",
    scope: "radio",
    stagesEdits: false,
  },
  {
    id: "debug",
    group: "advanced",
    labelKey: "navigation.debugPanel",
    descriptionKey: "sections.debugDescription",
    scope: "radio",
    stagesEdits: false,
  },
  {
    id: "app",
    group: "app",
    labelKey: "navigation.appSettings",
    descriptionKey: "sections.appDescription",
    scope: "browser",
    stagesEdits: false,
  },
  {
    id: "message-filter",
    group: "app",
    labelKey: "navigation.messageFilter",
    descriptionKey: "sections.messageFilterDescription",
    scope: "browser",
    stagesEdits: false,
  },
  {
    id: "about",
    group: "information",
    labelKey: "navigation.about",
    descriptionKey: "sections.aboutDescription",
    scope: "info",
    stagesEdits: false,
  },
  {
    id: "help",
    group: "information",
    labelKey: "navigation.help",
    descriptionKey: "sections.helpDescription",
    docsUrl: `${DOCS_BASE}/`,
    scope: "info",
    stagesEdits: false,
  },
] as const satisfies readonly SettingsSectionDef[];

/**
 * Sections offered when managing another node remotely: its radio and
 * module config and its owner. Channels, admin actions, backup, firmware,
 * debug and the app's own settings stay with the local radio.
 */
export const REMOTE_SECTION_IDS: ReadonlySet<SettingsSectionId> = new Set([
  "user",
  "lora",
  "security",
  "device",
  "module",
]);

/**
 * Sections that write to the connected radio, read-only while it is in
 * managed mode: firmware then ignores every admin message from this app.
 * Backup, firmware info and the app's own settings stay usable.
 */
export const MANAGED_READ_ONLY_SECTION_IDS: ReadonlySet<SettingsSectionId> =
  new Set([
    "user",
    "lora",
    "channels",
    "security",
    "device",
    "module",
    "administration",
    "clean-nodes",
  ]);

/**
 * Modules not offered remotely, because their forms read the local radio:
 * the canned message list, the ringtone, and Mesh Beacon's channels.
 */
export const REMOTE_HIDDEN_MODULES: ReadonlySet<ModuleConfigSection> = new Set([
  "cannedMessage",
  "externalNotification",
  "meshBeacon",
]);

export const GROUP_LABEL_KEYS = {
  configuration: "sidebar.configuration",
  backupRestore: "sidebar.backupRestore",
  advanced: "sidebar.advanced",
  app: "sidebar.app",
  information: "sidebar.information",
} as const satisfies Record<SettingsGroupId, string>;

export const isSettingsSectionId = (
  value: string,
): value is SettingsSectionId =>
  SETTINGS_SECTION_IDS.some((id) => id === value);

export const findSection = (id: string): SettingsSectionDef | undefined =>
  SETTINGS_SECTIONS.find((section) => section.id === id);

/**
 * The section a `/settings/...` pathname points at, or `undefined` for the
 * bare `/settings` (the mobile list, or the first section on desktop).
 */
export const sectionFromPath = (
  pathname: string,
): SettingsSectionId | undefined => {
  const segment = pathname.split("/")[2] ?? "";
  return isSettingsSectionId(segment) ? segment : undefined;
};

/** Device configuration subsections, in Android's order. */
export const DEVICE_SUBSECTION_IDS = [
  "device",
  "position",
  "power",
  "network",
  "display",
  "bluetooth",
] as const;
export type DeviceSubsectionId = (typeof DEVICE_SUBSECTION_IDS)[number];

export const DEVICE_SUBSECTION_DOCS = {
  device: radioDocs("device"),
  position: radioDocs("position"),
  power: radioDocs("power"),
  network: radioDocs("network"),
  display: radioDocs("display"),
  bluetooth: radioDocs("bluetooth"),
} as const satisfies Record<DeviceSubsectionId, string>;

/**
 * Docs page per module. TAK and Mesh Beacon have no page of their own yet,
 * so they fall back to the module index.
 */
export const MODULE_DOCS = {
  mqtt: moduleDocs("mqtt"),
  serial: moduleDocs("serial"),
  externalNotification: moduleDocs("external-notification"),
  storeForward: moduleDocs("store-and-forward-module"),
  rangeTest: moduleDocs("range-test"),
  telemetry: moduleDocs("telemetry"),
  cannedMessage: moduleDocs("canned-message"),
  audio: moduleDocs("audio"),
  remoteHardware: moduleDocs("remote-hardware"),
  neighborInfo: moduleDocs("neighbor-info"),
  ambientLighting: moduleDocs("ambient-lighting"),
  detectionSensor: moduleDocs("detection-sensor"),
  paxcounter: moduleDocs("paxcounter"),
  statusmessage: `${DOCS_BASE}/configuration/module/`,
  trafficManagement: `${DOCS_BASE}/configuration/module/`,
  tak: `${DOCS_BASE}/configuration/module/`,
  meshBeacon: `${DOCS_BASE}/configuration/module/`,
} as const satisfies Record<ModuleConfigSection, string>;

export const moduleDocsUrl = (key: ModuleConfigSection): string =>
  MODULE_DOCS[key];
