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
  };

  it("only creates a Flasher notice when a valid platform target runs an older valid version", () => {
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
  });

  it("selects the newest stable release from the canonical firmware API", () => {
    expect(
      findLatestStableFirmwareRelease([
        { id: "v2.7.26.54e0d8d" },
        { id: "v2.8.0" },
        { id: "not-a-version" },
      ]),
    ).toBe("v2.8.0");
  });

  it("derives the Flasher fallback from Web's current update capability", () => {
    expect(resolveFirmwareUpdateDestination("tbeam-s3-core")).toMatchObject({
      destination: "flasher",
      actionUrl: "https://flasher.meshtastic.org",
    });
    expect(resolveFirmwareUpdateDestination("unknown?")).toBeUndefined();
  });

  it("fails closed when the stable-release refresh does not succeed", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "v2.8.0", draft: false, prerelease: true },
          { id: "v2.7.26", draft: false, prerelease: false },
        ]),
    });

    fetcher.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          releases: { stable: [{ id: "v2.7.26" }] },
        }),
    });
    await expect(fetchLatestStableFirmwareRelease(fetcher)).resolves.toBe(
      "v2.7.26",
    );
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
    const notice = buildFirmwareUpdateNotice(candidate)!;
    const storage = {
      getItem: vi.fn<(key: string) => string | null>(() => null),
      setItem: vi.fn(),
    };

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification: vi.fn(() => {
          throw new Error("notifications unavailable");
        }),
        storage,
      }),
    ).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
