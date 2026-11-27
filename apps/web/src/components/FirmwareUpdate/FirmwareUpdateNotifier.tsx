import {
  browserNotificationApi,
  NOTIFIED_KEYS_STORAGE_KEY,
  notifyFirmwareUpdate,
  parseNotifiedKeys,
} from "@core/firmware/notify.ts";
import { recordNotificationKey } from "@core/firmware/updateCheck.ts";
import { useFirmwareUpdateNotice } from "@core/firmware/useFirmwareUpdateNotice.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sends the firmware-update browser notification, once per (node,
 * hardware, stable version), and only when notification permission was
 * already granted; it never asks. The in-app notice is in the Connections
 * drawer (`FirmwareUpdateNotice`).
 */
export const FirmwareUpdateNotifier = (): null => {
  const nudge = useFirmwareUpdateNotice();
  const { t } = useTranslation("connections");
  const [notified, setNotified] = useLocalStorage<string[]>(
    NOTIFIED_KEYS_STORAGE_KEY,
    [],
    { deserializer: parseNotifiedKeys },
  );
  // Covers the gap before the stored list re-renders, and storage that fails.
  const shownThisSession = useRef(new Set<string>());
  const key = nudge?.notice.notificationKey;

  useEffect(() => {
    if (!nudge || !key || shownThisSession.current.has(key)) return;
    const shown = notifyFirmwareUpdate(browserNotificationApi(), {
      notice: nudge.notice,
      title: t("firmwareUpdate.title"),
      body: t("firmwareUpdate.message", {
        current: nudge.notice.currentVersion,
        stable: nudge.notice.stableVersion,
      }),
      alreadyNotified: notified,
      onOpen: () => {
        window.open(nudge.flasherUrl, "_blank", "noopener,noreferrer");
      },
    });
    if (shown) {
      shownThisSession.current.add(key);
      setNotified((keys) => recordNotificationKey(keys, key));
    }
  }, [key, nudge, notified, setNotified, t]);

  return null;
};
