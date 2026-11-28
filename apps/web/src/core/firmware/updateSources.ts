import { Result } from "better-result";
import {
  createNotice,
  type FirmwareRelease,
  type FirmwareUpdateNotice,
  FirmwareUpdateDataError,
  type HardwareEntry,
  latestStableRelease,
  parseHardwareCatalogue,
  parseManifestTargets,
  parseStableReleases,
  parseVersion,
  orderManifestUrls,
  releaseManifestUrls,
  resolveHardwareTarget,
} from "./updateCheck.ts";

/**
 * Network side of the firmware-update nudge: the release list, hardware
 * catalogue and target manifests, each fetched once and kept for as long
 * as Meshtastic-Android keeps it. A failed fetch is never kept, so the
 * next check retries, and gives no notice.
 */

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<Response>;

export const API_BASE_URL = "https://api.meshtastic.org";
export const RELEASES_URL = `${API_BASE_URL}/github/firmware/list`;
export const HARDWARE_URL = `${API_BASE_URL}/resource/deviceHardware`;

const HOUR_MS = 60 * 60 * 1000;
/**
 * Android refreshes the release list after an hour and gives no notice
 * from an older one (`FirmwareReleaseRepositoryImpl`, `ConnectionsViewModel`).
 */
export const RELEASES_MAX_AGE_MS = HOUR_MS;
/** Android's `DeviceHardwareRepositoryImpl` keeps the catalogue a day. */
export const HARDWARE_MAX_AGE_MS = 24 * HOUR_MS;
/**
 * How long one request (headers and body) may take. A host that accepts
 * and never answers would otherwise stall the manifest fallback and leave
 * a waiter behind on every hourly check. Generous, since api.meshtastic.org
 * can be slow.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

type Load<T> = () => Promise<Result<T, FirmwareUpdateDataError>>;

class RequestTimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(`${url} didn't answer within ${ms} ms`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * Fetches and decodes `url`, giving up after `timeoutMs` even if `fetchFn`
 * ignores the abort. A plain timer (not `AbortSignal.timeout`) so tests can
 * drive it with fake timers; `signal` is combined with it when given.
 */
const fetchJson = async (
  fetchFn: FetchLike,
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Result<unknown, FirmwareUpdateDataError>> => {
  const controller = new AbortController();
  const combined = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new RequestTimeoutError(url, timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  const read = async (): Promise<Result<unknown, FirmwareUpdateDataError>> => {
    let response: Response;
    try {
      response = await fetchFn(url, { signal: combined });
    } catch (cause) {
      return Result.err(
        new FirmwareUpdateDataError(`Couldn't fetch ${url}`, { cause }),
      );
    }
    if (!response.ok) {
      return Result.err(
        new FirmwareUpdateDataError(`${url} answered ${response.status}`),
      );
    }
    try {
      return Result.ok(await response.json());
    } catch (cause) {
      return Result.err(
        new FirmwareUpdateDataError(`${url} isn't JSON`, { cause }),
      );
    }
  };
  try {
    return await Promise.race([read(), timedOut]);
  } catch (cause) {
    return Result.err(
      new FirmwareUpdateDataError(`Couldn't fetch ${url}`, { cause }),
    );
  } finally {
    clearTimeout(timer);
  }
};

/**
 * One shared fetch of `url`, kept for `maxAgeMs`. Past that it fetches
 * again and, if that fails, reports the failure instead of the old value.
 */
export function createCachedLoad<T>(
  fetchFn: FetchLike,
  url: string,
  parse: (json: unknown) => Result<T, FirmwareUpdateDataError>,
  maxAgeMs: number,
  now: () => number = Date.now,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Load<T> & { reset(): void } {
  let pending: Promise<Result<T, FirmwareUpdateDataError>> | undefined;
  let fetchedAt = 0;
  const load = () => {
    if (pending && now() - fetchedAt >= maxAgeMs) pending = undefined;
    if (!pending) {
      fetchedAt = now();
      const attempt = fetchJson(fetchFn, url, timeoutMs).then((json) => {
        const result = json.andThen(parse);
        if (Result.isError(result) && pending === attempt) pending = undefined;
        return result;
      });
      pending = attempt;
    }
    return pending;
  };
  return Object.assign(load, {
    reset() {
      pending = undefined;
    },
  });
}

export interface FirmwareUpdateSources {
  stableReleases: Load<FirmwareRelease[]>;
  hardware: Load<HardwareEntry[]>;
  /**
   * The boards in a release's manifest, trying each copy in `urls`. The
   * copy that answered is tried first next time for that release.
   */
  manifestTargets(
    release: FirmwareRelease,
  ): Promise<Result<Set<string>, FirmwareUpdateDataError>>;
  reset(): void;
}

export interface FirmwareUpdateSourceOptions {
  now?: () => number;
  /** The page's host, read at call time; picks which manifest copy goes first. */
  hostname?: () => string | undefined;
  timeoutMs?: number;
}

export function createFirmwareUpdateSources(
  fetchFn: FetchLike,
  {
    now = Date.now,
    hostname = () => globalThis.location?.hostname,
    timeoutMs = REQUEST_TIMEOUT_MS,
  }: FirmwareUpdateSourceOptions = {},
): FirmwareUpdateSources {
  const stableReleases = createCachedLoad(
    fetchFn,
    RELEASES_URL,
    parseStableReleases,
    RELEASES_MAX_AGE_MS,
    now,
    timeoutMs,
  );
  const hardware = createCachedLoad(
    fetchFn,
    HARDWARE_URL,
    parseHardwareCatalogue,
    HARDWARE_MAX_AGE_MS,
    now,
    timeoutMs,
  );
  // A published release's manifest doesn't change: keep each success.
  const manifests = new Map<
    string,
    ReturnType<typeof createCachedLoad<Set<string>>>
  >();
  // Which copy of each release's manifest answered last.
  const workingManifestUrl = new Map<string, string>();
  const loadManifest = (url: string) => {
    let load = manifests.get(url);
    if (!load) {
      load = createCachedLoad(
        fetchFn,
        url,
        parseManifestTargets,
        Number.POSITIVE_INFINITY,
        now,
        timeoutMs,
      );
      manifests.set(url, load);
    }
    return load();
  };
  return {
    stableReleases,
    hardware,
    async manifestTargets(release) {
      const preferred = workingManifestUrl.get(release.id);
      const urls = orderManifestUrls(
        releaseManifestUrls(release),
        hostname(),
        preferred,
      );
      let targets: Result<Set<string>, FirmwareUpdateDataError> = Result.err(
        new FirmwareUpdateDataError("No release manifest could be read"),
      );
      for (const url of urls) {
        targets = await loadManifest(url);
        if (Result.isOk(targets)) {
          workingManifestUrl.set(release.id, url);
          break;
        }
      }
      return targets;
    },
    reset() {
      stableReleases.reset();
      hardware.reset();
      manifests.clear();
      workingManifestUrl.clear();
    },
  };
}

/** What the connected local radio reports about itself. */
export interface LocalRadio {
  readonly nodeIdentity?: string;
  readonly firmwareVersion?: string;
  readonly hwModel?: number;
  readonly pioEnv?: string;
}

/**
 * Whether `radio` should be nudged to update. Resolves to no notice for
 * anything unknown; an error only when a source couldn't be loaded.
 */
export async function checkFirmwareUpdate(
  radio: LocalRadio,
  sources: FirmwareUpdateSources,
): Promise<Result<FirmwareUpdateNotice | undefined, FirmwareUpdateDataError>> {
  // Nothing to compare: don't touch the network.
  if (
    !radio.nodeIdentity ||
    !radio.firmwareVersion ||
    !parseVersion(radio.firmwareVersion) ||
    (radio.hwModel === undefined && !radio.pioEnv)
  ) {
    return Result.ok(undefined);
  }
  const [releases, hardware] = await Promise.all([
    sources.stableReleases(),
    sources.hardware(),
  ]);
  if (Result.isError(releases)) return releases;
  if (Result.isError(hardware)) return hardware;

  const stable = latestStableRelease(releases.value);
  const hardwareTarget = resolveHardwareTarget(
    hardware.value,
    radio.hwModel,
    radio.pioEnv,
  );
  if (!stable || !hardwareTarget) return Result.ok(undefined);

  const targets = await sources.manifestTargets(stable);
  if (Result.isError(targets)) return targets;
  return Result.ok(
    createNotice({
      nodeIdentity: radio.nodeIdentity,
      currentVersion: radio.firmwareVersion,
      stableVersion: stable.id,
      hardwareTarget,
      releaseTargets: targets.value,
    }),
  );
}

/** The app's sources: the global fetch, looked up at call time. */
export const firmwareUpdateSources = createFirmwareUpdateSources((url, init) =>
  globalThis.fetch(url, init),
);
