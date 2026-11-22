/**
 * What the thread's live region says about newly arrived messages. Bursts
 * are coalesced: at most one announcement per interval, and a batch of
 * several messages is summarised by count rather than read out in full.
 */

export const ANNOUNCE_INTERVAL_MS = 2000;

export interface IncomingForAnnouncement {
  readonly from: number;
  readonly text: string;
}

export type Announcement =
  | { readonly kind: "one"; readonly from: number; readonly text: string }
  | { readonly kind: "many"; readonly count: number };

export const summarizeIncoming = (
  batch: readonly IncomingForAnnouncement[],
): Announcement | undefined => {
  const [only] = batch;
  if (only === undefined) {
    return undefined;
  }
  return batch.length === 1
    ? { kind: "one", from: only.from, text: only.text }
    : { kind: "many", count: batch.length };
};

/** How long to wait before the next announcement may be made (0: now). */
export const announceDelay = (
  lastAnnouncedAt: number | undefined,
  now: number,
  interval: number = ANNOUNCE_INTERVAL_MS,
): number =>
  lastAnnouncedAt === undefined
    ? 0
    : Math.max(0, lastAnnouncedAt + interval - now);
