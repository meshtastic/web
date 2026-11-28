import { Result } from "better-result";

/**
 * Stable firmware-update nudge (meshtastic/design#124), mirroring
 * Meshtastic-Android's `FirmwareUpdateNoticePolicy` (core/model). Pure:
 * parses the release list, the hardware catalogue and a release's target
 * manifest, and decides whether the connected radio is behind the latest
 * stable release on hardware that release supports.
 *
 * Every check fails closed: a missing or malformed version, hardware
 * target, node identity or manifest gives no notice, never an "update".
 */

/** Where the stable release manifests live; the Web Flasher reads the same files. */
export const RELEASE_BASE_URL = "https://release.meshtastic.org";
/**
 * The same files on GitHub Pages. release.meshtastic.org only answers
 * cross-origin requests from Meshtastic's own sites, so a self-hosted
 * client reads the manifest from here instead.
 */
export const RELEASE_MIRROR_URL = "https://meshtastic.github.io";

/** Notification keys remembered at most, oldest dropped first (Android keeps 100). */
export const MAX_NOTIFICATION_KEYS = 100;

export class FirmwareUpdateDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FirmwareUpdateDataError";
  }
}

export interface FirmwareRelease {
  /** Release tag, e.g. `v2.7.26.54e0d8d`. */
  readonly id: string;
}

export interface HardwareEntry {
  readonly hwModel: number;
  /** PlatformIO environment, the manifest's `board`, e.g. `heltec-v4`. */
  readonly platformioTarget: string;
}

export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** `major.minor.patch`, without the build hash. */
  readonly normalized: string;
}

/** The only destination on Web: it has no native OTA flow. */
export type FirmwareUpdateDestination = "meshtasticFlasher";

export interface FirmwareUpdateNotice {
  readonly notificationKey: string;
  readonly currentVersion: string;
  readonly stableVersion: string;
  readonly hardwareTarget: string;
  readonly destination: FirmwareUpdateDestination;
}

export interface NoticeInputs {
  readonly nodeIdentity?: string;
  readonly currentVersion?: string;
  readonly stableVersion?: string;
  readonly hardwareTarget?: string;
  readonly releaseTargets: ReadonlySet<string>;
}

// Android's VERSION_REGEX: an optional `v`, three numbers, then nothing or
// a separated suffix such as the build hash (`.54e0d8d`).
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:[.+-].*)?$/;

export function parseVersion(value: string): ParsedVersion | undefined {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return undefined;
  return { major, minor, patch, normalized: `${major}.${minor}.${patch}` };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonBlank = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/**
 * The stable channel of `api.meshtastic.org/github/firmware/list`. Alpha
 * releases and pull-request builds are never offered.
 */
export function parseStableReleases(
  json: unknown,
): Result<FirmwareRelease[], FirmwareUpdateDataError> {
  const releases = isRecord(json) ? json.releases : undefined;
  const stable = isRecord(releases) ? releases.stable : undefined;
  if (!Array.isArray(stable)) {
    return Result.err(
      new FirmwareUpdateDataError("The release list has no stable channel"),
    );
  }
  const parsed = stable.flatMap((entry): FirmwareRelease[] => {
    const id = isRecord(entry) ? nonBlank(entry.id) : undefined;
    return id ? [{ id }] : [];
  });
  return Result.ok(parsed);
}

/**
 * The newest stable release by version, not list order (Android's
 * `FirmwareReleaseLocalDataSource.getLatestRelease`). Unparseable ids are
 * skipped.
 */
export function latestStableRelease(
  releases: readonly FirmwareRelease[],
): FirmwareRelease | undefined {
  let best: { release: FirmwareRelease; version: ParsedVersion } | undefined;
  for (const release of releases) {
    const version = parseVersion(release.id);
    if (version && (!best || compareVersions(version, best.version) > 0)) {
      best = { release, version };
    }
  }
  return best?.release;
}

/** `api.meshtastic.org/resource/deviceHardware`, keeping only usable rows. */
export function parseHardwareCatalogue(
  json: unknown,
): Result<HardwareEntry[], FirmwareUpdateDataError> {
  if (!Array.isArray(json)) {
    return Result.err(
      new FirmwareUpdateDataError("The hardware catalogue isn't a list"),
    );
  }
  const entries = json.flatMap((entry): HardwareEntry[] => {
    if (!isRecord(entry) || typeof entry.hwModel !== "number") return [];
    const platformioTarget = nonBlank(entry.platformioTarget);
    return platformioTarget
      ? [{ hwModel: entry.hwModel, platformioTarget }]
      : [];
  });
  return Result.ok(entries);
}

/**
 * The radio's PlatformIO target. Looks up the hardware model, falling back
 * to the radio's reported `pio_env`, then picks the entry matching
 * `pio_env` exactly, case-insensitively, or the first (Android's
 * `DeviceHardwareRepositoryImpl.lookupEntities` and `disambiguate`).
 */
export function resolveHardwareTarget(
  catalogue: readonly HardwareEntry[],
  hwModel: number | undefined,
  pioEnv: string | undefined,
): string | undefined {
  const env = pioEnv?.trim() || undefined;
  let entries =
    hwModel === undefined
      ? []
      : catalogue.filter((entry) => entry.hwModel === hwModel);
  if (entries.length === 0 && env) {
    const byTarget = catalogue.find((entry) => entry.platformioTarget === env);
    entries = byTarget ? [byTarget] : [];
  }
  const exact = env
    ? (entries.find((entry) => entry.platformioTarget === env) ??
      entries.find(
        (entry) => entry.platformioTarget.toLowerCase() === env.toLowerCase(),
      ))
    : undefined;
  // Several boards can share a model; with no pio_env match take the first, as Android's `disambiguate` does.
  return (exact ?? entries[0])?.platformioTarget;
}

/**
 * Where a release's target manifest (`firmware-<version>.json`, the file
 * the Web Flasher reads) can be fetched, in order: release.meshtastic.org,
 * then its GitHub Pages mirror. The release's own `zip_url` points at the
 * same file on GitHub, which browsers can't fetch cross-origin.
 */
export function releaseManifestUrls(release: FirmwareRelease): string[] {
  const version = release.id.trim().replace(/^v/, "");
  if (!parseVersion(version) || !/^[\w.+-]+$/.test(version)) return [];
  const file = `firmware-${version}.json`;
  return [
    `${RELEASE_BASE_URL}/${version}/${file}`,
    `${RELEASE_MIRROR_URL}/firmware-${version}/${file}`,
  ];
}

/** Hosts release.meshtastic.org answers cross-origin requests for. */
const isMeshtasticHost = (hostname: string | undefined): boolean =>
  !!hostname &&
  (hostname === "meshtastic.org" || hostname.endsWith(".meshtastic.org"));

/**
 * The order to try a release's manifest copies in: the one that answered
 * before, else release.meshtastic.org first on Meshtastic's own sites and
 * the mirror first anywhere else, where the release host's CORS refuses
 * the page (and would log an error on every check).
 */
export function orderManifestUrls(
  urls: readonly string[],
  hostname: string | undefined,
  preferred?: string,
): string[] {
  const ordered = isMeshtasticHost(hostname) ? [...urls] : [...urls].reverse();
  if (preferred && ordered.includes(preferred)) {
    return [preferred, ...ordered.filter((url) => url !== preferred)];
  }
  return ordered;
}

/** The boards a release manifest declares. */
export function parseManifestTargets(
  json: unknown,
): Result<Set<string>, FirmwareUpdateDataError> {
  const targets = isRecord(json) ? json.targets : undefined;
  if (!Array.isArray(targets)) {
    return Result.err(
      new FirmwareUpdateDataError("The release manifest has no targets"),
    );
  }
  const boards = new Set<string>();
  for (const target of targets) {
    const board = isRecord(target) ? nonBlank(target.board) : undefined;
    if (board) boards.add(board);
  }
  return Result.ok(boards);
}

/** Dedupe key per (node identity, hardware target, stable version). */
export function notificationKey(
  nodeIdentity: string,
  hardwareTarget: string,
  stableVersion: string,
): string {
  const stable =
    parseVersion(stableVersion)?.normalized ?? stableVersion.trim();
  return `firmware-update-notified:${nodeIdentity}:${hardwareTarget}:${stable}`;
}

/**
 * The notice for a connected radio, or undefined. Needs a node identity, a
 * hardware target listed in the stable manifest, and a current version
 * strictly older than stable (Android's `createNotice`).
 */
export function createNotice(
  inputs: NoticeInputs,
): FirmwareUpdateNotice | undefined {
  const identity = inputs.nodeIdentity?.trim();
  const target = inputs.hardwareTarget?.trim();
  if (!identity || !target) return undefined;
  const lowerTarget = target.toLowerCase();
  const supported = [...inputs.releaseTargets].some(
    (board) => board.toLowerCase() === lowerTarget,
  );
  if (!supported) return undefined;
  const current = inputs.currentVersion
    ? parseVersion(inputs.currentVersion)
    : undefined;
  const stable = inputs.stableVersion
    ? parseVersion(inputs.stableVersion)
    : undefined;
  if (!current || !stable || compareVersions(current, stable) >= 0) {
    return undefined;
  }
  return {
    notificationKey: notificationKey(identity, target, stable.normalized),
    currentVersion: current.normalized,
    stableVersion: stable.normalized,
    hardwareTarget: target,
    destination: "meshtasticFlasher",
  };
}

/** Whether a notice's notification has not been shown yet. */
export function shouldNotify(
  key: string,
  alreadyNotified: readonly string[],
): boolean {
  return !alreadyNotified.includes(key);
}

/** Adds `key` as the newest entry, keeping the last {@link MAX_NOTIFICATION_KEYS}. */
export function recordNotificationKey(
  keys: readonly string[],
  key: string,
): string[] {
  return [...keys.filter((k) => k !== key), key].slice(-MAX_NOTIFICATION_KEYS);
}
