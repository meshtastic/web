import { describe, expect, it, vi } from "vitest";
import {
  buildFirmwareUpdateNotice,
  fetchLatestStableFirmwareRelease,
  findLatestStableFirmwareRelease,
  notifyFirmwareUpdateIfPermitted,
  resolveFirmwareUpdateDestination,
} from "./firmwareUpdate.ts";

describe("firmware update policy", () => {
  const candidate = {
    nodeIdentity: "4660",
    hardwareTarget: "tbeam-s3-core",
    currentVersion: "2.7.26.54e0d8d",
    latestStableVersion: "v2.8.0",
    releaseTargets: ["tbeam-s3-core"],
  };

  it("only creates a Flasher notice for targets declared by the stable release manifest", () => {
    const notice = buildFirmwareUpdateNotice(candidate);

    expect(notice).toMatchObject({
      currentVersion: "2.7.26",
      latestStableVersion: "2.8.0",
      destination: "flasher",
      actionLabel: "Open Meshtastic Flasher",
    });
    expect(
      buildFirmwareUpdateNotice({ ...candidate, currentVersion: "2.8.0" }),
    ).toBeNull();
    expect(
      buildFirmwareUpdateNotice({ ...candidate, currentVersion: "2.9.0" }),
    ).toBeNull();
    expect(
      buildFirmwareUpdateNotice({ ...candidate, currentVersion: "?.?.?" }),
    ).toBeNull();
    expect(
      buildFirmwareUpdateNotice({ ...candidate, hardwareTarget: "unknown?" }),
    ).toBeNull();
    expect(
      buildFirmwareUpdateNotice({
        ...candidate,
        hardwareTarget: "unsupported-board",
      }),
    ).toBeNull();
  });

  it("selects the newest stable release from the canonical firmware API", () => {
    expect(
      findLatestStableFirmwareRelease([
        { id: "v2.7.26.54e0d8d", zip_url: "older-manifest" },
        { id: "v2.8.0", zip_url: "newer-manifest" },
        { id: "not-a-version", zip_url: "invalid-manifest" },
      ]),
    ).toMatchObject({ id: "v2.8.0", zip_url: "newer-manifest" });
  });

  it("derives the Flasher fallback only for a manifest-supported target", () => {
    expect(
      resolveFirmwareUpdateDestination("tbeam-s3-core", ["tbeam-s3-core"]),
    ).toMatchObject({
      destination: "flasher",
      actionUrl: "https://flasher.meshtastic.org",
    });
    expect(
      resolveFirmwareUpdateDestination("tbeam-s3-core", ["other-board"]),
    ).toBeUndefined();
  });

  it("fails closed when the stable-release refresh does not succeed", async () => {
    const fetcher = vi.fn();

    fetcher.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          releases: {
            stable: [
              { id: "v2.7.26", zip_url: "https://example.test/manifest" },
            ],
          },
        }),
    });
    fetcher.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ targets: [{ board: "tbeam-s3-core" }] }),
    });
    await expect(fetchLatestStableFirmwareRelease(fetcher)).resolves.toEqual({
      id: "v2.7.26",
      targets: ["tbeam-s3-core"],
    });
    await expect(
      fetchLatestStableFirmwareRelease(
        vi.fn().mockResolvedValue({ ok: false }),
      ),
    ).resolves.toBeUndefined();
  });

  it("only schedules a browser notification with existing permission and records its key after success", () => {
    const scheduledNotification: { onclick?: (event: Event) => void } = {};
    const notification = vi.fn(() => scheduledNotification);
    const onClick = vi.fn();
    const storage = {
      getItem: vi.fn<(key: string) => string | null>(() => null),
      setItem: vi.fn(),
    };
    const notice = buildFirmwareUpdateNotice(candidate)!;

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "default",
        notification,
        storage,
        onClick,
      }),
    ).toBe(false);
    expect(notification).not.toHaveBeenCalled();

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage,
        onClick,
      }),
    ).toBe(true);
    expect(notification).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(notice.notificationKey, "1");
    scheduledNotification.onclick?.(new Event("click"));
    expect(onClick).toHaveBeenCalledOnce();

    storage.getItem.mockReturnValue("1");
    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage,
        onClick,
      }),
    ).toBe(false);
    expect(notification).toHaveBeenCalledOnce();
  });

  it("does not record a dedupe key when scheduling fails", () => {
    const notice = buildFirmwareUpdateNotice({
      ...candidate,
      nodeIdentity: "scheduling-failure",
    })!;
    const storage = {
      getItem: vi.fn<(key: string) => string | null>(() => null),
      setItem: vi.fn(),
    };

    const notification = vi.fn(() => {
      throw new Error("notifications unavailable");
    });

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage,
      }),
    ).toBe(false);
    expect(notification).toHaveBeenCalledOnce();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("uses in-memory dedupe when storage access or persistence is unavailable", () => {
    const notice = buildFirmwareUpdateNotice({
      ...candidate,
      nodeIdentity: "in-memory",
    })!;
    const notification = vi.fn(() => ({}));
    const unavailableStorage = {
      getItem: vi.fn(() => {
        throw new Error("storage unavailable");
      }),
      setItem: vi.fn(() => {
        throw new Error("storage unavailable");
      }),
    };

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage: unavailableStorage,
      }),
    ).toBe(true);
    expect(unavailableStorage.setItem).toHaveBeenCalledWith(
      notice.notificationKey,
      "1",
    );
    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage: undefined,
      }),
    ).toBe(false);
    expect(notification).toHaveBeenCalledOnce();
  });
});
