/**
 * When to run retention. Pruning scans every message of the radio's
 * history, so it runs on the first append and then at most once per
 * `everyAppends` appends or `everyMs`, whichever comes first.
 */
export interface PruneSchedule {
  readonly appendsSince: number;
  /** Epoch ms of the last prune; undefined before the first. */
  readonly lastPrunedAt: number | undefined;
}

export interface PruneThrottle {
  readonly everyAppends: number;
  readonly everyMs: number;
}

export const DEFAULT_PRUNE_THROTTLE: PruneThrottle = {
  everyAppends: 50,
  everyMs: 10 * 60 * 1000,
};

export const INITIAL_PRUNE_SCHEDULE: PruneSchedule = {
  appendsSince: 0,
  lastPrunedAt: undefined,
};

/**
 * Records one append and says whether to prune now; the returned schedule
 * replaces the old one.
 */
export const nextPrune = (
  schedule: PruneSchedule,
  now: number,
  throttle: PruneThrottle = DEFAULT_PRUNE_THROTTLE,
): { readonly prune: boolean; readonly schedule: PruneSchedule } => {
  const appendsSince = schedule.appendsSince + 1;
  const due =
    schedule.lastPrunedAt === undefined ||
    appendsSince >= throttle.everyAppends ||
    now - schedule.lastPrunedAt >= throttle.everyMs;
  return due
    ? { prune: true, schedule: { appendsSince: 0, lastPrunedAt: now } }
    : { prune: false, schedule: { ...schedule, appendsSince } };
};
