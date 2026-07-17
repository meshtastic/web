const FIRMWARE_FLASHER_URL = "https://flasher.meshtastic.org";
const FIRMWARE_RELEASES_URL =
  "https://api.github.com/repos/meshtastic/firmware/releases?per_page=20";
const FIRMWARE_UPDATE_STORAGE_PREFIX = "firmware-update-notified:";

type FirmwareRelease = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
};

type FirmwareReleaseFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

type FirmwareUpdateCandidate = {
  nodeIdentity: string;
  hardwareTarget: string;
  currentVersion: string;
  latestStableVersion: string;
};

type FirmwareUpdateNotice = {
  notificationKey: string;
  currentVersion: string;
  latestStableVersion: string;
  destination: "flasher";
  actionLabel: string;
  actionUrl: string;
};

type BrowserNotificationOptions = {
  body: string;
  tag: string;
};

type NotificationScheduler = (
  title: string,
  options: BrowserNotificationOptions,
) => unknown;

type NotificationStorage = Pick<Storage, "getItem" | "setItem">;

type NotifyFirmwareUpdateOptions = {
  notificationPermission: NotificationPermission | undefined;
  notification: NotificationScheduler | undefined;
  storage: NotificationStorage | undefined;
};

function parseVersion(version: string): [number, number, number] | undefined {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[.+-].*)?$/i);
  if (!match) return;

  const parsed = match.slice(1, 4).map(Number);
  if (parsed.some(Number.isNaN)) return;
  return parsed as [number, number, number];
}

function normalizeVersion(version: string): string | undefined {
  const parsed = parseVersion(version);
  return parsed?.join(".");
}

function compareVersions(left: string, right: string): number | undefined {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) return;

  for (let index = 0; index < leftParts.length; index += 1) {
    const leftPart = leftParts[index]!;
    const rightPart = rightParts[index]!;
    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }
  return 0;
}

export function findLatestStableFirmwareRelease(
  releases: FirmwareRelease[],
): string | undefined {
  return releases
    .filter(
      (release) =>
        !release.draft &&
        !release.prerelease &&
        normalizeVersion(release.tag_name) !== undefined,
    )
    .sort((left, right) => compareVersions(right.tag_name, left.tag_name) ?? 0)
    .at(0)?.tag_name;
}

export async function fetchLatestStableFirmwareRelease(
  fetcher: FirmwareReleaseFetcher = fetch,
): Promise<string | undefined> {
  try {
    const response = await fetcher(FIRMWARE_RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return;

    const releases = await response.json();
    if (!Array.isArray(releases)) return;
    return findLatestStableFirmwareRelease(releases as FirmwareRelease[]);
  } catch {
    return;
  }
}

export function buildFirmwareUpdateNotice(
  candidate: FirmwareUpdateCandidate,
): FirmwareUpdateNotice | null {
  const currentVersion = normalizeVersion(candidate.currentVersion);
  const latestStableVersion = normalizeVersion(candidate.latestStableVersion);
  const comparison = compareVersions(
    candidate.currentVersion,
    candidate.latestStableVersion,
  );

  if (
    !candidate.nodeIdentity ||
    !candidate.hardwareTarget ||
    !currentVersion ||
    !latestStableVersion ||
    comparison === undefined ||
    comparison >= 0
  ) {
    return null;
  }

  return {
    notificationKey: `${FIRMWARE_UPDATE_STORAGE_PREFIX}${candidate.nodeIdentity}:${candidate.hardwareTarget}:${latestStableVersion}`,
    currentVersion,
    latestStableVersion,
    destination: "flasher",
    actionLabel: "Open Meshtastic Flasher",
    actionUrl: FIRMWARE_FLASHER_URL,
  };
}

export function notifyFirmwareUpdateIfPermitted(
  notice: FirmwareUpdateNotice,
  {
    notificationPermission,
    notification,
    storage,
  }: NotifyFirmwareUpdateOptions,
): boolean {
  if (
    notificationPermission !== "granted" ||
    !notification ||
    !storage ||
    storage.getItem(notice.notificationKey)
  ) {
    return false;
  }

  try {
    notification("Firmware update available", {
      body: `${notice.currentVersion} is behind stable ${notice.latestStableVersion}. Use Meshtastic Flasher to update this hardware.`,
      tag: notice.notificationKey,
    });
    storage.setItem(notice.notificationKey, "1");
    return true;
  } catch {
    return false;
  }
}

export { FIRMWARE_FLASHER_URL };
export type { FirmwareRelease, FirmwareUpdateNotice };
