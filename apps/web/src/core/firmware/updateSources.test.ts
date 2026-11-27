import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkFirmwareUpdate,
  createFirmwareUpdateSources as createSources,
  type FetchLike,
  type FirmwareUpdateSourceOptions,
  HARDWARE_URL,
  type LocalRadio,
  RELEASES_MAX_AGE_MS,
  RELEASES_URL,
  REQUEST_TIMEOUT_MS,
} from "./updateSources.ts";

/** Sources as seen from client.meshtastic.org unless a test says otherwise. */
const createFirmwareUpdateSources = (
  fetchFn: FetchLike,
  options: FirmwareUpdateSourceOptions = {},
) =>
  createSources(fetchFn, {
    hostname: () => "client.meshtastic.org",
    ...options,
  });

const MANIFEST_URL =
  "https://release.meshtastic.org/2.7.26.54e0d8d/firmware-2.7.26.54e0d8d.json";
const MIRROR_URL =
  "https://meshtastic.github.io/firmware-2.7.26.54e0d8d/firmware-2.7.26.54e0d8d.json";

const RELEASES = {
  releases: {
    stable: [{ id: "v2.7.15.567b8ea" }, { id: "v2.7.26.54e0d8d" }],
    alpha: [{ id: "v2.8.2.d5f1619" }],
  },
};
const HARDWARE = [
  { hwModel: 110, platformioTarget: "heltec-v4" },
  { hwModel: 9, platformioTarget: "rak4631" },
];
const MANIFEST = {
  version: "2.7.26.54e0d8d",
  targets: [{ board: "heltec-v4" }, { board: "rak4631" }],
};

const radio: LocalRadio = {
  nodeIdentity: "!1234abcd",
  firmwareVersion: "2.7.15.567b8ea",
  hwModel: 110,
  pioEnv: "heltec-v4",
};

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const api = (overrides: Record<string, () => Promise<Response>> = {}) =>
  vi.fn((url: string) => {
    const override = overrides[url];
    if (override) return override();
    if (url === RELEASES_URL) return json(RELEASES);
    if (url === HARDWARE_URL) return json(HARDWARE);
    if (url === MANIFEST_URL) return json(MANIFEST);
    return Promise.resolve(new Response("not found", { status: 404 }));
  });

const offline = () => Promise.reject(new TypeError("Failed to fetch"));

describe("checkFirmwareUpdate", () => {
  it("nudges a radio behind stable on hardware the release supports", async () => {
    const result = await checkFirmwareUpdate(
      radio,
      createFirmwareUpdateSources(api()),
    );
    expect(Result.isOk(result) && result.value).toMatchObject({
      currentVersion: "2.7.15",
      stableVersion: "2.7.26",
      hardwareTarget: "heltec-v4",
      destination: "meshtasticFlasher",
    });
  });

  it("says nothing for hardware the stable manifest doesn't list", async () => {
    const fetchFn = api({
      [MANIFEST_URL]: () => json({ targets: [{ board: "rak4631" }] }),
    });
    const result = await checkFirmwareUpdate(
      radio,
      createFirmwareUpdateSources(fetchFn),
    );
    expect(Result.isOk(result) && result.value).toBeUndefined();
  });

  it("fails closed when offline, without throwing", async () => {
    const result = await checkFirmwareUpdate(
      radio,
      createFirmwareUpdateSources(vi.fn(offline)),
    );
    expect(Result.isError(result)).toBe(true);
  });

  it("reads the manifest from the mirror when release.meshtastic.org refuses this origin", async () => {
    const fetchFn = api({
      [MANIFEST_URL]: offline,
      [MIRROR_URL]: () => json(MANIFEST),
    });
    const sources = createFirmwareUpdateSources(fetchFn);
    const result = await checkFirmwareUpdate(radio, sources);
    expect(Result.isOk(result) && result.value?.stableVersion).toBe("2.7.26");
  });

  it("fails closed when no copy of the manifest can be read", async () => {
    const fetchFn = api({
      [MANIFEST_URL]: () => Promise.resolve(new Response("", { status: 404 })),
    });
    const result = await checkFirmwareUpdate(
      radio,
      createFirmwareUpdateSources(fetchFn),
    );
    expect(Result.isError(result)).toBe(true);
  });

  it("doesn't touch the network for a radio it can't judge", async () => {
    const fetchFn = api();
    const sources = createFirmwareUpdateSources(fetchFn);
    for (const partial of [
      { ...radio, firmwareVersion: undefined },
      { ...radio, firmwareVersion: "garbage" },
      { ...radio, nodeIdentity: undefined },
      { ...radio, hwModel: undefined, pioEnv: undefined },
    ]) {
      const result = await checkFirmwareUpdate(partial, sources);
      expect(Result.isOk(result) && result.value).toBeUndefined();
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("createFirmwareUpdateSources caching", () => {
  it("fetches each source once and shares the result", async () => {
    const fetchFn = api();
    const sources = createFirmwareUpdateSources(fetchFn);
    await Promise.all([
      checkFirmwareUpdate(radio, sources),
      checkFirmwareUpdate(radio, sources),
    ]);
    await checkFirmwareUpdate(radio, sources);
    expect(fetchFn.mock.calls.map(([url]) => url).sort()).toEqual(
      [HARDWARE_URL, MANIFEST_URL, RELEASES_URL].sort(),
    );
  });

  it("retries after a failure instead of keeping it", async () => {
    let down = true;
    const fetchFn = api({
      [RELEASES_URL]: () => (down ? offline() : json(RELEASES)),
    });
    const sources = createFirmwareUpdateSources(fetchFn);
    expect(Result.isError(await checkFirmwareUpdate(radio, sources))).toBe(
      true,
    );
    down = false;
    const result = await checkFirmwareUpdate(radio, sources);
    expect(Result.isOk(result) && result.value).toBeDefined();
  });

  it("refreshes the release list after an hour and fails closed if that fails", async () => {
    let now = 0;
    let down = false;
    const fetchFn = api({
      [RELEASES_URL]: () => (down ? offline() : json(RELEASES)),
    });
    const sources = createFirmwareUpdateSources(fetchFn, { now: () => now });
    expect(Result.isOk(await checkFirmwareUpdate(radio, sources))).toBe(true);

    now = RELEASES_MAX_AGE_MS - 1;
    down = true;
    // Still fresh: no new request, still a notice.
    expect(Result.isOk(await checkFirmwareUpdate(radio, sources))).toBe(true);

    now = RELEASES_MAX_AGE_MS;
    // Stale and the refresh fails: the old list is not used.
    expect(Result.isError(await checkFirmwareUpdate(radio, sources))).toBe(
      true,
    );
    const releaseCalls = fetchFn.mock.calls.filter(
      ([url]) => url === RELEASES_URL,
    );
    expect(releaseCalls).toHaveLength(2);
  });
});

describe("manifest sources", () => {
  const urlsCalled = (fetchFn: ReturnType<typeof api>) =>
    fetchFn.mock.calls
      .map(([url]) => url)
      .filter((url) => url === MANIFEST_URL || url === MIRROR_URL);

  it("tries the mirror first on a self-hosted origin", async () => {
    const fetchFn = api({ [MIRROR_URL]: () => json(MANIFEST) });
    const sources = createSources(fetchFn, {
      hostname: () => "mesh.example.com",
    });
    const result = await checkFirmwareUpdate(radio, sources);
    expect(Result.isOk(result) && result.value).toBeDefined();
    expect(urlsCalled(fetchFn)).toEqual([MIRROR_URL]);
  });

  it("tries release.meshtastic.org first on Meshtastic's own sites", async () => {
    const fetchFn = api({ [MIRROR_URL]: () => json(MANIFEST) });
    const sources = createSources(fetchFn, {
      hostname: () => "client.meshtastic.org",
    });
    await checkFirmwareUpdate(radio, sources);
    expect(urlsCalled(fetchFn)).toEqual([MANIFEST_URL]);
  });

  it("keeps using the copy that answered instead of retrying the refused one", async () => {
    const fetchFn = api({
      [MANIFEST_URL]: offline,
      [MIRROR_URL]: () => json(MANIFEST),
    });
    let now = 0;
    const sources = createFirmwareUpdateSources(fetchFn, { now: () => now });
    await checkFirmwareUpdate(radio, sources);
    now = RELEASES_MAX_AGE_MS * 3;
    await checkFirmwareUpdate(radio, sources);
    await checkFirmwareUpdate(radio, sources);
    // One refused attempt, then the mirror once (its success is kept).
    expect(urlsCalled(fetchFn)).toEqual([MANIFEST_URL, MIRROR_URL]);
  });
});

describe("request timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives up on a host that never answers and falls back to the mirror", async () => {
    vi.useFakeTimers();
    const hung = vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
      // Never resolves; only notes the abort.
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    });
    const fetchFn = api({
      [MANIFEST_URL]: () => hung(MANIFEST_URL),
      [MIRROR_URL]: () => json(MANIFEST),
    });
    const sources = createFirmwareUpdateSources(fetchFn);
    const pending = checkFirmwareUpdate(radio, sources);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const result = await pending;
    expect(Result.isOk(result) && result.value?.stableVersion).toBe("2.7.26");
  });

  it("aborts the request and reports a failure that isn't kept", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    let hang = true;
    const fetchFn = vi.fn((url: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal) signals.push(init.signal);
      if (url === RELEASES_URL && hang) return new Promise<Response>(() => {});
      return api()(url);
    });
    const sources = createFirmwareUpdateSources(fetchFn);
    const pending = checkFirmwareUpdate(radio, sources);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(Result.isError(await pending)).toBe(true);
    expect(signals[0]?.aborted).toBe(true);

    hang = false;
    const retried = await checkFirmwareUpdate(radio, sources);
    expect(Result.isOk(retried) && retried.value).toBeDefined();
  });
});
