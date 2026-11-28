import {
  type FirmwareUpdateNotice,
  MAX_NOTIFICATION_KEYS,
  shouldNotify,
} from "./updateCheck.ts";

/** Notification keys already shown, newest last (see `recordNotificationKey`). */
export const NOTIFIED_KEYS_STORAGE_KEY = "meshtastic:firmwareUpdateNotified";

/** Reads the stored keys, dropping anything that isn't a list of strings. */
export function parseNotifiedKeys(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .filter((key): key is string => typeof key === "string")
          .slice(-MAX_NOTIFICATION_KEYS)
      : [];
  } catch {
    return [];
  }
}

export interface ShownNotification {
  onclick: ((this: never, event: Event) => unknown) | null;
  close(): void;
}

/** The slice of the browser's Notification API used here. */
export interface NotificationApi {
  readonly permission: NotificationPermission | string;
  show(title: string, options: NotificationOptions): ShownNotification;
}

/** The browser's Notification API, when this browser has one. */
export function browserNotificationApi(): NotificationApi | undefined {
  if (typeof Notification === "undefined") return undefined;
  return {
    get permission() {
      return Notification.permission;
    },
    show: (title, options) => new Notification(title, options),
  };
}

export interface NotifyRequest {
  readonly notice: FirmwareUpdateNotice;
  readonly title: string;
  readonly body: string;
  readonly alreadyNotified: readonly string[];
  /** Opens the update destination when the notification is clicked. */
  readonly onOpen: () => void;
}

/**
 * Shows the update as a browser notification when permission was already
 * granted and this (node, hardware, stable version) hasn't been shown.
 * Never asks for permission. True only once the notification was created,
 * so the caller records the key only then (design#124).
 */
export function notifyFirmwareUpdate(
  api: NotificationApi | undefined,
  request: NotifyRequest,
): boolean {
  if (!api || api.permission !== "granted") return false;
  if (!shouldNotify(request.notice.notificationKey, request.alreadyNotified)) {
    return false;
  }
  try {
    const notification = api.show(request.title, {
      body: request.body,
      tag: request.notice.notificationKey,
    });
    notification.onclick = () => {
      request.onOpen();
      notification.close();
    };
    return true;
  } catch {
    // Some browsers (Chrome on Android) only allow notifications from a
    // service worker and throw here.
    return false;
  }
}
