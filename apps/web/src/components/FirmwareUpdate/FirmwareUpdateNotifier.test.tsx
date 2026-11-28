import { NOTIFIED_KEYS_STORAGE_KEY } from "@core/firmware/notify.ts";
import type { FirmwareUpdateNudge } from "@core/firmware/useFirmwareUpdateNotice.ts";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The notifier keeps shown keys at module scope; reload it per test.
let FirmwareUpdateNotifier: typeof import("./FirmwareUpdateNotifier.tsx").FirmwareUpdateNotifier;

const hook = vi.hoisted(() => ({
  nudge: undefined as FirmwareUpdateNudge | undefined,
}));

vi.mock("@core/firmware/useFirmwareUpdateNotice.ts", () => ({
  useFirmwareUpdateNotice: () => hook.nudge,
}));

const nudgeFor = (stable: string): FirmwareUpdateNudge => ({
  notice: {
    notificationKey: `firmware-update-notified:!1234abcd:heltec-v4:${stable}`,
    currentVersion: "2.7.15",
    stableVersion: stable,
    hardwareTarget: "heltec-v4",
    destination: "meshtasticFlasher",
  },
  flasherUrl: "https://flasher.meshtastic.org/?hwModel=110",
});

interface Shown {
  title: string;
  options?: NotificationOptions;
  onclick: (() => void) | null;
  close: () => void;
}

/** A stand-in for the browser's Notification with a settable permission. */
const installNotification = (permission: NotificationPermission) => {
  const shown: Shown[] = [];
  const requestPermission = vi.fn();
  class FakeNotification {
    static permission = permission;
    static requestPermission = requestPermission;
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(title: string, options?: NotificationOptions) {
      shown.push(this as unknown as Shown);
      Object.assign(this, { title, options });
    }
  }
  vi.stubGlobal("Notification", FakeNotification);
  return { shown, requestPermission };
};

describe("FirmwareUpdateNotifier", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ FirmwareUpdateNotifier } = await import("./FirmwareUpdateNotifier.tsx"));
    window.localStorage.clear();
    hook.nudge = nudgeFor("2.7.26");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies once when permission was already granted", () => {
    const { shown, requestPermission } = installNotification("granted");
    const { rerender, unmount } = render(<FirmwareUpdateNotifier />);
    rerender(<FirmwareUpdateNotifier />);
    unmount();
    // A later visit with the same radio and stable version stays quiet.
    render(<FirmwareUpdateNotifier />);

    expect(shown).toHaveLength(1);
    expect(shown[0]?.title).toBe("Firmware update available");
    expect(shown[0]?.options?.body).toBe(
      "2.7.15 is installed. Stable 2.7.26 is available. Open Meshtastic Flasher to update this hardware.",
    );
    expect(requestPermission).not.toHaveBeenCalled();
    expect(
      JSON.parse(window.localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY) ?? ""),
    ).toEqual(["firmware-update-notified:!1234abcd:heltec-v4:2.7.26"]);
  });

  it("stays quiet after a remount when storage can't be written", () => {
    const { shown } = installNotification("granted");
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = render(<FirmwareUpdateNotifier />);
    unmount();
    render(<FirmwareUpdateNotifier />);
    setItem.mockRestore();
    warn.mockRestore();
    expect(window.localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY)).toBeNull();
    expect(shown).toHaveLength(1);
  });

  it("notifies again for a later stable release", () => {
    const { shown } = installNotification("granted");
    const { rerender } = render(<FirmwareUpdateNotifier />);
    hook.nudge = nudgeFor("2.7.27");
    rerender(<FirmwareUpdateNotifier />);
    expect(shown.map((n) => n.options?.tag)).toEqual([
      "firmware-update-notified:!1234abcd:heltec-v4:2.7.26",
      "firmware-update-notified:!1234abcd:heltec-v4:2.7.27",
    ]);
  });

  it.each(["default", "denied"] as const)(
    "never asks for permission and stays quiet when it is %s",
    (permission) => {
      const { shown, requestPermission } = installNotification(permission);
      render(<FirmwareUpdateNotifier />);
      expect(shown).toHaveLength(0);
      expect(requestPermission).not.toHaveBeenCalled();
      expect(window.localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY)).toBeNull();
    },
  );

  it("does nothing in a browser without notifications", () => {
    vi.stubGlobal("Notification", undefined);
    expect(() => render(<FirmwareUpdateNotifier />)).not.toThrow();
    expect(window.localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY)).toBeNull();
  });

  it("doesn't record the key when the notification can't be created", () => {
    class Throwing {
      static permission = "granted";
      constructor() {
        throw new TypeError("Illegal constructor");
      }
    }
    vi.stubGlobal("Notification", Throwing);
    render(<FirmwareUpdateNotifier />);
    expect(window.localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY)).toBeNull();
  });

  it("stays quiet with nothing to suggest", () => {
    const { shown } = installNotification("granted");
    hook.nudge = undefined;
    render(<FirmwareUpdateNotifier />);
    expect(shown).toHaveLength(0);
  });

  it("opens the flasher when the notification is clicked", () => {
    const { shown } = installNotification("granted");
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<FirmwareUpdateNotifier />);
    shown[0]?.onclick?.();
    expect(open).toHaveBeenCalledWith(
      "https://flasher.meshtastic.org/?hwModel=110",
      "_blank",
      "noopener,noreferrer",
    );
    expect(shown[0]?.close).toHaveBeenCalled();
    open.mockRestore();
  });
});
