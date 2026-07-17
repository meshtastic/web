import { describe, expect, it, vi } from "vitest";
import {
  buildFirmwareUpdateNotice,
  fetchLatestStableFirmwareRelease,
  findLatestStableFirmwareRelease,
  notifyFirmwareUpdateIfPermitted,
} from "./firmwareUpdate.ts";

describe("firmware update policy", () => {
  const candidate = {
    nodeIdentity: "4660",
    hardwareTarget: "LILYGO_TBEAM_S3_CORE",
    currentVersion: "2.7.26.54e0d8d",
    latestStableVersion: "v2.8.0",
  };

  it("only creates a Flasher notice when a known device runs an older valid version", () => {
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
      buildFirmwareUpdateNotice({ ...candidate, hardwareTarget: "" }),
    ).toBeNull();
  });

  it("selects the newest non-draft, non-prerelease firmware release", () => {
    expect(
      findLatestStableFirmwareRelease([
        { tag_name: "v2.8.0", draft: false, prerelease: true },
        { tag_name: "v2.7.26.54e0d8d", draft: false, prerelease: false },
        { tag_name: "v2.8.1", draft: true, prerelease: false },
        { tag_name: "v2.8.0", draft: false, prerelease: false },
      ]),
    ).toBe("v2.8.0");
  });

  it("fails closed when the stable-release refresh does not succeed", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { tag_name: "v2.8.0", draft: false, prerelease: true },
          { tag_name: "v2.7.26", draft: false, prerelease: false },
        ]),
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
    const notification = vi.fn();
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
      }),
    ).toBe(false);
    expect(notification).not.toHaveBeenCalled();

    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage,
      }),
    ).toBe(true);
    expect(notification).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(notice.notificationKey, "1");

    storage.getItem.mockReturnValue("1");
    expect(
      notifyFirmwareUpdateIfPermitted(notice, {
        notificationPermission: "granted",
        notification,
        storage,
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
