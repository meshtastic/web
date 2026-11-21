/**
 * Locale-aware time formatting for list rows, message bubbles and date
 * separators. Everything takes `now` and `locale` explicitly so results are
 * deterministic; callers pass `Date.now()` and the i18next language.
 * Day boundaries use the runtime's local time zone.
 */

export type TimeInput = Date | number;

const toDate = (value: TimeInput): Date =>
  value instanceof Date ? value : new Date(value);

/**
 * Smallest unit first, with how many of it make the next unit. A value is
 * shown in the first unit whose rounded count stays below that limit, so
 * 59.6 minutes reads "1 hour ago", never "60 minutes ago".
 */
const UNITS: ReadonlyArray<
  readonly [Intl.RelativeTimeFormatUnit, number, number]
> = [
  ["second", 1, 60],
  ["minute", 60, 60],
  ["hour", 3_600, 24],
  ["day", 86_400, 30],
  ["month", 2_592_000, 12],
  ["year", 31_536_000, Number.POSITIVE_INFINITY],
];

export interface RelativeTimeParts {
  readonly value: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

/** Largest whole unit between `date` and `now`; negative for the past. */
export const getRelativeTimeParts = (
  date: TimeInput,
  now: TimeInput,
): RelativeTimeParts => {
  const diffSeconds = (toDate(date).getTime() - toDate(now).getTime()) / 1000;
  for (const [unit, seconds, limit] of UNITS) {
    // `+ 0` turns -0 into 0.
    const value = Math.round(diffSeconds / seconds) + 0;
    if (Math.abs(value) < limit) {
      return { value, unit };
    }
  }
  return { value: Math.round(diffSeconds / 31_536_000) + 0, unit: "year" };
};

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

/** One formatter per locale: constructing them is costly in long lists. */
const relativeFormatter = (locale: string): Intl.RelativeTimeFormat => {
  const cached = relativeFormatters.get(locale);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  relativeFormatters.set(locale, formatter);
  return formatter;
};

/** "5 minutes ago", "yesterday", "in 2 hours". */
export const formatRelativeTime = (
  date: TimeInput,
  now: TimeInput,
  locale: string,
): string => {
  const { value, unit } = getRelativeTimeParts(date, now);
  return relativeFormatter(locale).format(value, unit);
};

const REFRESH_MS: Partial<Record<Intl.RelativeTimeFormatUnit, number>> = {
  second: 3_000,
  minute: 15_000,
  hour: 30_000,
};

/**
 * How often a live "5 minutes ago" label needs re-rendering: every few
 * seconds while it counts seconds, hourly once it counts days or more.
 */
export const relativeRefreshMs = (date: TimeInput, now: TimeInput): number =>
  REFRESH_MS[getRelativeTimeParts(date, now).unit] ?? 3_600_000;

/** Wall-clock time in the locale's short style: "9:40 AM" / "09:40". */
export const formatClockTime = (date: TimeInput, locale: string): string =>
  new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(toDate(date));

/** Midnight (local) of the day containing `date`. */
export const startOfDay = (date: TimeInput): Date => {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Stable `YYYY-MM-DD` key for the local calendar day. */
export const dayKey = (date: TimeInput): string => {
  const d = toDate(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Whole calendar days from `date` back to `now` (0 = same day, 1 =
 * yesterday). Negative for future days. Counts calendar days, so it is
 * unaffected by daylight-saving shifts.
 */
export const calendarDaysBetween = (
  date: TimeInput,
  now: TimeInput,
): number => {
  const a = startOfDay(date);
  const b = startOfDay(now);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
};

/**
 * Clock skew between radios and this computer is common; timestamps up to
 * this far ahead still count as "now".
 */
export const FUTURE_SKEW_MS = 5 * 60_000;

export type DayClass =
  /** Further in the future than clock skew explains: show a full date. */
  | { readonly kind: "future" }
  | { readonly kind: "today" }
  | { readonly kind: "yesterday" }
  /** Within the last week: name the weekday. */
  | { readonly kind: "thisWeek" }
  | { readonly kind: "thisYear" }
  | { readonly kind: "older" };

export const classifyDay = (date: TimeInput, now: TimeInput): DayClass => {
  if (toDate(date).getTime() - toDate(now).getTime() > FUTURE_SKEW_MS) {
    return { kind: "future" };
  }
  const days = calendarDaysBetween(date, now);
  if (days <= 0) {
    return { kind: "today" };
  }
  if (days === 1) {
    return { kind: "yesterday" };
  }
  if (days < 7) {
    return { kind: "thisWeek" };
  }
  if (toDate(date).getFullYear() === toDate(now).getFullYear()) {
    return { kind: "thisYear" };
  }
  return { kind: "older" };
};

const capitalize = (text: string, locale: string): string =>
  text.length === 0
    ? text
    : `${text.charAt(0).toLocaleUpperCase(locale)}${text.slice(1)}`;

/** Localised "Today" / "Yesterday" from Intl, capitalised for headings. */
const relativeDayName = (offset: 0 | -1, locale: string): string =>
  capitalize(
    new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      offset,
      "day",
    ),
    locale,
  );

/**
 * Compact timestamp for conversation rows: the time today, "Yesterday",
 * the weekday this week, then a short date.
 */
export const formatListTimestamp = (
  date: TimeInput,
  now: TimeInput,
  locale: string,
): string => {
  const d = toDate(date);
  switch (classifyDay(d, now).kind) {
    case "future":
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(d);
    case "today":
      return formatClockTime(d, locale);
    case "yesterday":
      return relativeDayName(-1, locale);
    case "thisWeek":
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    case "thisYear":
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(d);
    case "older":
      return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(d);
  }
};

/** Heading for a date separator in a message list. */
export const formatDayLabel = (
  date: TimeInput,
  now: TimeInput,
  locale: string,
): string => {
  const d = toDate(date);
  switch (classifyDay(d, now).kind) {
    case "future":
      return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d);
    case "today":
      return relativeDayName(0, locale);
    case "yesterday":
      return relativeDayName(-1, locale);
    case "thisWeek":
      return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
    case "thisYear":
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(d);
    case "older":
      return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d);
  }
};

export interface DayGroup<T> {
  /** `YYYY-MM-DD`, usable for a React key. */
  readonly key: string;
  /** Local midnight of the group's day. */
  readonly day: Date;
  readonly items: readonly T[];
}

/**
 * Splits a chronologically ordered list into runs that share a calendar
 * day, keeping the input order. A new group starts whenever the day changes,
 * so an unsorted list yields one group per run rather than merging them.
 */
export const groupByDay = <T>(
  items: readonly T[],
  getTime: (item: T) => TimeInput,
): DayGroup<T>[] => {
  const groups: { key: string; day: Date; items: T[] }[] = [];
  for (const item of items) {
    const time = getTime(item);
    const key = dayKey(time);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, day: startOfDay(time), items: [item] });
    }
  }
  return groups;
};
