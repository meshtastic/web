import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  classifyDay,
  dayKey,
  formatClockTime,
  formatDayLabel,
  formatListTimestamp,
  formatRelativeTime,
  getRelativeTimeParts,
  groupByDay,
  relativeRefreshMs,
  startOfDay,
} from "./timeFormat.ts";

// Built from local components so the tests pass in every time zone.
const NOW = new Date(2026, 10, 21, 14, 30); // Sat 21 Nov 2026, 14:30
const at = (day: number, hour = 9, minute = 40, month = 10, year = 2026) =>
  new Date(year, month, day, hour, minute);

describe("getRelativeTimeParts", () => {
  it.each([
    [new Date(NOW.getTime() - 30_000), { value: -30, unit: "second" }],
    [new Date(NOW.getTime() - 5 * 60_000), { value: -5, unit: "minute" }],
    [new Date(NOW.getTime() - 2 * 3_600_000), { value: -2, unit: "hour" }],
    [new Date(NOW.getTime() + 3 * 86_400_000), { value: 3, unit: "day" }],
    [NOW, { value: 0, unit: "second" }],
  ])("%s", (date, expected) => {
    expect(getRelativeTimeParts(date, NOW)).toEqual(expected);
  });

  it.each([
    [59.6 * 60, { value: -1, unit: "hour" }],
    [59.4, { value: -59, unit: "second" }],
    [59.6, { value: -1, unit: "minute" }],
    [23.6 * 3600, { value: -1, unit: "day" }],
    [29.6 * 86_400, { value: -1, unit: "month" }],
    [359 * 86_400, { value: -1, unit: "year" }],
  ])("rolls %ss ago over to the next unit", (seconds, expected) => {
    expect(
      getRelativeTimeParts(new Date(NOW.getTime() - seconds * 1000), NOW),
    ).toEqual(expected);
  });

  it("never says 60 minutes or 24 hours", () => {
    for (let s = 0; s < 2 * 86_400; s += 7) {
      const { value, unit } = getRelativeTimeParts(
        new Date(NOW.getTime() - s * 1000),
        NOW,
      );
      if (unit === "minute" || unit === "second") {
        expect(Math.abs(value)).toBeLessThan(60);
      }
      if (unit === "hour") {
        expect(Math.abs(value)).toBeLessThan(24);
      }
    }
  });

  it("accepts epoch milliseconds", () => {
    expect(getRelativeTimeParts(NOW.getTime() - 60_000, NOW.getTime())).toEqual(
      { value: -1, unit: "minute" },
    );
  });
});

describe("formatRelativeTime", () => {
  it("uses Intl wording", () => {
    expect(
      formatRelativeTime(new Date(NOW.getTime() - 5 * 60_000), NOW, "en"),
    ).toBe("5 minutes ago");
    expect(
      formatRelativeTime(new Date(NOW.getTime() - 86_400_000), NOW, "en"),
    ).toBe("yesterday");
  });

  it("localises", () => {
    expect(
      formatRelativeTime(new Date(NOW.getTime() - 86_400_000), NOW, "de"),
    ).toBe("gestern");
  });

  it("keeps one formatter per locale", () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000);
    expect(formatRelativeTime(yesterday, NOW, "de")).toBe("gestern");
    expect(formatRelativeTime(yesterday, NOW, "en")).toBe("yesterday");
    expect(formatRelativeTime(yesterday, NOW, "de")).toBe("gestern");
  });
});

describe("relativeRefreshMs", () => {
  const now = Date.UTC(2026, 10, 21, 12, 0, 0);
  it("refreshes faster the finer the unit", () => {
    expect(relativeRefreshMs(now - 5_000, now)).toBe(3_000);
    expect(relativeRefreshMs(now - 5 * 60_000, now)).toBe(15_000);
    expect(relativeRefreshMs(now - 3 * 3_600_000, now)).toBe(30_000);
    expect(relativeRefreshMs(now - 3 * 86_400_000, now)).toBe(3_600_000);
  });
});

describe("formatClockTime", () => {
  it("matches the locale's short time style", () => {
    const date = at(21);
    expect(formatClockTime(date, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(date),
    );
    expect(formatClockTime(date, "en-GB")).toBe("09:40");
  });
});

describe("day helpers", () => {
  it("startOfDay drops the time", () => {
    expect(startOfDay(at(21, 23, 59))).toEqual(new Date(2026, 10, 21));
  });

  it("dayKey pads month and day", () => {
    expect(dayKey(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("calendarDaysBetween counts calendar days, not 24h spans", () => {
    expect(calendarDaysBetween(at(21, 0, 1), NOW)).toBe(0);
    expect(calendarDaysBetween(at(20, 23, 59), NOW)).toBe(1);
    expect(calendarDaysBetween(at(14), NOW)).toBe(7);
    expect(calendarDaysBetween(at(22), NOW)).toBe(-1);
  });

  it.each([
    [at(21), "today"],
    [at(20), "yesterday"],
    [at(16), "thisWeek"],
    [at(14), "thisYear"],
    [at(2, 9, 0, 0), "thisYear"],
    [at(30, 9, 0, 11, 2025), "older"],
    [at(22), "future"],
    [new Date(NOW.getTime() + 4 * 60_000), "today"],
    [new Date(NOW.getTime() + 6 * 60_000), "future"],
  ])("classifyDay(%s) is %s", (date, kind) => {
    expect(classifyDay(date, NOW).kind).toBe(kind);
  });
});

describe("formatListTimestamp", () => {
  it("shows the time today", () => {
    expect(formatListTimestamp(at(21), NOW, "en-GB")).toBe("09:40");
  });

  it("says Yesterday, capitalised", () => {
    expect(formatListTimestamp(at(20), NOW, "en")).toBe("Yesterday");
  });

  it("shows the weekday within a week", () => {
    expect(formatListTimestamp(at(18), NOW, "en")).toBe("Wed");
  });

  it("shows month and day this year", () => {
    expect(formatListTimestamp(at(4, 9, 0, 2), NOW, "en-US")).toBe("Mar 4");
  });

  it("shows a short date for older years", () => {
    const old = at(4, 9, 0, 2, 2024);
    expect(formatListTimestamp(old, NOW, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US", { dateStyle: "short" }).format(old),
    );
  });
});

describe("future timestamps", () => {
  const ahead = new Date(2026, 10, 21, 18, 0); // 3.5 hours after NOW

  it("show a date and time in lists, not just a time", () => {
    expect(formatListTimestamp(ahead, NOW, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(ahead),
    );
  });

  it("show a full date in separators, not Today", () => {
    expect(formatDayLabel(ahead, NOW, "en-US")).toBe("November 21, 2026");
    expect(formatDayLabel(at(25), NOW, "en-US")).toBe("November 25, 2026");
  });

  it("tolerate a few minutes of clock skew", () => {
    const skewed = new Date(NOW.getTime() + 2 * 60_000);
    expect(formatDayLabel(skewed, NOW, "en-US")).toBe("Today");
  });
});

describe("across a daylight-saving change", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  // Clocks went forward on 8 March 2026: that day was 23 hours long.
  it("counts calendar days, not 24-hour spans", () => {
    const now = new Date(2026, 2, 8, 23, 30);
    expect(now.getTimezoneOffset()).not.toBe(
      new Date(2026, 2, 7, 12).getTimezoneOffset(),
    );
    // 23 hours earlier is still the same calendar day.
    expect(classifyDay(new Date(2026, 2, 8, 0, 30), now).kind).toBe("today");
    expect(classifyDay(new Date(2026, 2, 7, 23, 59), now).kind).toBe(
      "yesterday",
    );
    expect(calendarDaysBetween(new Date(2026, 2, 1, 12), now)).toBe(7);
  });

  it("groups by local day when clocks go back", () => {
    // 1 November 2026 was 25 hours long.
    const groups = groupByDay(
      [
        new Date(2026, 10, 1, 0, 30),
        new Date(2026, 10, 1, 23, 30),
        new Date(2026, 10, 2, 0, 10),
      ],
      (d) => d,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(groups[0]?.items).toHaveLength(2);
  });
});

describe("formatDayLabel", () => {
  it.each([
    [at(21), "Today"],
    [at(20), "Yesterday"],
    [at(18), "Wednesday"],
    [at(4, 9, 0, 2), "Wednesday, March 4"],
  ])("%s → %s", (date, label) => {
    expect(formatDayLabel(date, NOW, "en-US")).toBe(label);
  });

  it("localises Today", () => {
    expect(formatDayLabel(at(21), NOW, "fr")).toBe("Aujourd’hui");
  });
});

describe("groupByDay", () => {
  interface Item {
    id: number;
    time: Date;
  }
  const items: Item[] = [
    { id: 1, time: at(19, 8) },
    { id: 2, time: at(19, 22) },
    { id: 3, time: at(20, 1) },
    { id: 4, time: at(21, 9) },
    { id: 5, time: at(21, 14) },
  ];

  it("groups consecutive items by local day", () => {
    const groups = groupByDay(items, (item) => item.time);
    expect(groups.map((g) => g.key)).toEqual([
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      [1, 2],
      [3],
      [4, 5],
    ]);
    expect(groups[0]?.day).toEqual(new Date(2026, 10, 19));
  });

  it("accepts numeric times", () => {
    const groups = groupByDay(
      items.map((i) => i.time.getTime()),
      (t) => t,
    );
    expect(groups).toHaveLength(3);
  });

  it("returns nothing for an empty list", () => {
    expect(groupByDay([], () => 0)).toEqual([]);
  });

  it("starts a new group for each run in an unsorted list", () => {
    const groups = groupByDay(
      [items[0], items[3], items[1]].filter((i) => i !== undefined),
      (i) => i.time,
    );
    expect(groups.map((g) => g.key)).toEqual([
      "2026-11-19",
      "2026-11-21",
      "2026-11-19",
    ]);
  });
});
