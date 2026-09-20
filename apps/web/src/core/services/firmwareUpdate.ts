const FIRMWARE_FLASHER_URL = "https://flasher.meshtastic.org";
const FIRMWARE_RELEASES_URL = "https://api.meshtastic.org/github/firmware/list";
const FIRMWARE_UPDATE_STORAGE_PREFIX = "firmware-update-notified:";
const inMemoryNotificationKeys = new Set<string>();

type FirmwareRelease = {
  id: string;
  zip_url: string;
};

type FirmwareReleaseResponse = {
  releases?: { stable?: FirmwareRelease[] };
};

type FirmwareReleaseManifest = {
  targets?: { board?: unknown }[];
};

type FirmwareReleaseWithTargets = {
  id: string;
  targets: string[];
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
  releaseTargets: string[];
};

type FirmwareUpdateNotice = {
  notificationKey: string;
  currentVersion: string;
  latestStableVersion: string;
  destination: "flasher";
  actionLabel: string;
  actionUrl: string;
};

type FirmwareUpdateDestination = Pick<
  FirmwareUpdateNotice,
  "destination" | "actionLabel" | "actionUrl"
>;

type BrowserNotificationOptions = {
  body: string;
  tag: string;
};

type NotificationScheduler = (
  title: string,
  options: BrowserNotificationOptions,
) => { onclick?: ((event: Event) => void) | null };

type NotificationStorage = Pick<Storage, "getItem" | "setItem">;

type NotifyFirmwareUpdateOptions = {
  notificationPermission: NotificationPermission | undefined;
  notification: NotificationScheduler | undefined;
  storage: NotificationStorage | undefined;
  onClick?: () => void;
};

/**
 * Web deliberately has no native firmware installer yet. This explicit
 * capability makes the Flasher route a product decision rather than a
 * per-notice fallback; add a native capability and destination here when Web
 * gains an update flow.
 */
const WEB_FIRMWARE_UPDATE_DESTINATION: FirmwareUpdateDestination = {
  destination: "flasher",
  actionLabel: "Open Meshtastic Flasher",
  actionUrl: FIRMWARE_FLASHER_URL,
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
): FirmwareRelease | undefined {
  return releases
    .filter(
      (release) =>
        normalizeVersion(release.id) !== undefined &&
        typeof release.zip_url === "string",
    )
    .sort((left, right) => compareVersions(right.id, left.id) ?? 0)
    .at(0);
}

function isValidPlatformTarget(target: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(target);
}

/**
 * The active PlatformIO environment must appear in the selected release's
 * manifest. This verifies compatibility from released metadata rather than
 * inferred asset filenames.
 */
export function resolveFirmwareUpdateDestination(
  hardwareTarget: string,
  releaseTargets: string[],
): FirmwareUpdateDestination | undefined {
  if (
    !isValidPlatformTarget(hardwareTarget) ||
    !releaseTargets.includes(hardwareTarget)
  ) {
    return;
  }
  return WEB_FIRMWARE_UPDATE_DESTINATION;
}

export async function fetchLatestStableFirmwareRelease(
  fetcher: FirmwareReleaseFetcher = fetch,
): Promise<FirmwareReleaseWithTargets | undefined> {
  try {
    const response = await fetcher(FIRMWARE_RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return;

    const releases = (await response.json()) as FirmwareReleaseResponse;
    if (!Array.isArray(releases.releases?.stable)) return;

    const latestRelease = findLatestStableFirmwareRelease(
      releases.releases.stable,
    );
    if (!latestRelease) return;

    const manifestResponse = await fetcher(latestRelease.zip_url, {
      headers: { Accept: "application/json" },
    });
    if (!manifestResponse.ok) return;

    const manifest = (await manifestResponse.json()) as FirmwareReleaseManifest;
    if (!Array.isArray(manifest.targets)) return;

    const targets = manifest.targets.flatMap(({ board }) =>
      typeof board === "string" && isValidPlatformTarget(board) ? [board] : [],
    );
    return { id: latestRelease.id, targets };
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
  const updateDestination = resolveFirmwareUpdateDestination(
    candidate.hardwareTarget,
    candidate.releaseTargets,
  );

  if (
    !candidate.nodeIdentity ||
    !candidate.hardwareTarget ||
    !currentVersion ||
    !latestStableVersion ||
    !candidate.releaseTargets.length ||
    !updateDestination ||
    comparison === undefined ||
    comparison >= 0
  ) {
    return null;
  }

  return {
    notificationKey: `${FIRMWARE_UPDATE_STORAGE_PREFIX}${candidate.nodeIdentity}:${candidate.hardwareTarget}:${latestStableVersion}`,
    currentVersion,
    latestStableVersion,
    ...updateDestination,
  };
}

export function notifyFirmwareUpdateIfPermitted(
  notice: FirmwareUpdateNotice,
  {
    notificationPermission,
    notification,
    storage,
    onClick,
  }: NotifyFirmwareUpdateOptions,
): boolean {
  if (
    notificationPermission !== "granted" ||
    !notification ||
    wasFirmwareUpdateNotified(notice.notificationKey, storage)
  ) {
    return false;
  }

  try {
    const scheduledNotification = notification("Firmware update available", {
      body: `${notice.currentVersion} is behind stable ${notice.latestStableVersion}. Use Meshtastic Flasher to update this hardware.`,
      tag: notice.notificationKey,
    });
    if (onClick) scheduledNotification.onclick = onClick;
    inMemoryNotificationKeys.add(notice.notificationKey);
    try {
      storage?.setItem(notice.notificationKey, "1");
    } catch {
      // In-memory dedupe still prevents repeat notifications for this tab.
    }
    return true;
  } catch {
    return false;
  }
}

function wasFirmwareUpdateNotified(
  notificationKey: string,
  storage: NotificationStorage | undefined,
): boolean {
  if (inMemoryNotificationKeys.has(notificationKey)) return true;

  try {
    if (storage?.getItem(notificationKey)) {
      inMemoryNotificationKeys.add(notificationKey);
      return true;
    }
  } catch {
    // Storage can be blocked by browser privacy settings; use memory instead.
  }

  return false;
}

export { FIRMWARE_FLASHER_URL };
export type {
  FirmwareRelease,
  FirmwareReleaseWithTargets,
  FirmwareUpdateNotice,
};
