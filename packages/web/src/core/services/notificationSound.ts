import { notificationSoundRepo, preferencesRepo } from "@data/repositories";
import logger from "./logger.ts";

export type NotificationSlot = "message" | "alert";

const SLOT_PREFERENCE_MAP: Record<NotificationSlot, string> = {
  message: "messageSoundEnabled",
  alert: "alertSoundEnabled",
};

const urlCache = new Map<string, string>();

/**
 * Play the notification sound for a given slot.
 * Checks the corresponding preference toggle before playing.
 * Caches object URLs to avoid re-decoding on repeated plays.
 */
export async function playNotificationSound(
  slot: NotificationSlot,
): Promise<void> {
  const prefKey = SLOT_PREFERENCE_MAP[slot];
  const enabled = await preferencesRepo.get<boolean>(prefKey);
  if (enabled === false) {
    return;
  }

  const sound = await notificationSoundRepo.getBySlot(slot);
  if (!sound) {
    return;
  }

  let objectUrl = urlCache.get(slot);
  if (!objectUrl) {
    try {
      const binary = atob(sound.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: sound.mimeType });
      objectUrl = URL.createObjectURL(blob);
      urlCache.set(slot, objectUrl);
    } catch (error) {
      logger.error(
        `[NotificationSound] Failed to decode sound for slot "${slot}":`,
        error,
      );
      return;
    }
  }

  try {
    const volume = await preferencesRepo.get<number>("notificationVolume");
    const audio = new Audio(objectUrl);
    audio.volume = (volume ?? 100) / 100;
    await audio.play();
  } catch (error) {
    logger.error(
      `[NotificationSound] Failed to play sound for slot "${slot}":`,
      error,
    );
  }
}

/**
 * Invalidate the cached object URL for a slot.
 * Call after uploading or deleting a sound.
 */
export function invalidateCache(slot: NotificationSlot): void {
  const existing = urlCache.get(slot);
  if (existing) {
    URL.revokeObjectURL(existing);
    urlCache.delete(slot);
  }
}
