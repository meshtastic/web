import { describe, expect, it } from "vitest";
import {
  CHANNEL_HEARD_SORT_KEYS,
  DEFAULT_CHANNEL_HEARD_SORT,
  DEFAULT_NODE_LIST_SORT,
  DEFAULT_NODE_LIST_SORTS,
  DEFAULT_NODE_SORT,
  isChannelHeardSortKey,
  isNodeSortKey,
  NODE_SORT_INITIAL_DIRECTION,
  NODE_SORT_KEYS,
  parseNodeListSort,
  parseNodeListSorts,
  sortNodeRows,
} from "./nodeSort.ts";
import { makeNode, makeRow } from "./testNodes.ts";

const rows = [
  makeRow({
    num: 3,
    longName: "charlie",
    heardSecondsAgo: 600,
    hopsAway: 2,
    snr: -12,
    batteryLevel: 40,
  }),
  makeRow({
    num: 1,
    longName: "alpha",
    heardSecondsAgo: 60,
    hopsAway: 0,
    snr: 5,
    batteryLevel: 101,
  }),
  makeRow({ num: 2, longName: "bravo" }),
  makeRow({
    num: 4,
    longName: "delta",
    heardSecondsAgo: 60,
    hopsAway: 1,
    snr: -3,
    batteryLevel: 90,
  }),
];

const nums = (list: { num: number }[]) => list.map((row) => row.num);

describe("sortNodeRows", () => {
  it("defaults to most recently heard first, never heard last, ties by number", () => {
    expect(nums(sortNodeRows(rows, DEFAULT_NODE_SORT))).toEqual([1, 4, 3, 2]);
  });

  it("sorts by hops ascending with unknown hops last", () => {
    expect(nums(sortNodeRows(rows, { key: "hops", direction: "asc" }))).toEqual(
      [1, 4, 3, 2],
    );
  });

  it("sorts by SNR, strongest first", () => {
    expect(nums(sortNodeRows(rows, { key: "snr", direction: "desc" }))).toEqual(
      [1, 4, 3, 2],
    );
  });

  it("sorts plugged-in above any battery level", () => {
    expect(
      nums(sortNodeRows(rows, { key: "battery", direction: "desc" })),
    ).toEqual([1, 4, 3, 2]);
  });

  it("sorts by name", () => {
    expect(
      nums(sortNodeRows(rows, { key: "name", direction: "desc" })),
    ).toEqual([4, 3, 2, 1]);
  });

  it("sorts by distance with unplaced nodes last", () => {
    const myPosition = makeNode({ num: 100, lat: 1, lng: 1 }).position;
    const ctx = { myNodeNum: 100, myPosition };
    const placed = [
      makeRow({ num: 1, lat: 1, lng: 1.2 }, ctx),
      makeRow({ num: 2 }, ctx),
      makeRow({ num: 3, lat: 1, lng: 1.1 }, ctx),
    ];
    expect(
      nums(sortNodeRows(placed, { key: "distance", direction: "asc" })),
    ).toEqual([3, 1, 2]);
  });
});

describe("remote admin sort", () => {
  it("puts nodes this radio can manage first, each group by last heard", () => {
    const managed = (num: number, heardSecondsAgo?: number) => ({
      ...makeRow({ num, longName: `n${num}`, heardSecondsAgo }),
      hasAdminAccess: true,
    });
    const list = [...rows, managed(7, 3600), managed(6, 30)];
    expect(
      nums(sortNodeRows(list, { key: "remoteAdmin", direction: "desc" })),
    ).toEqual([6, 7, 1, 4, 3, 2]);
  });
});

describe("node sort keys", () => {
  it("every key has an initial direction", () => {
    for (const key of NODE_SORT_KEYS) {
      expect(NODE_SORT_INITIAL_DIRECTION[key]).toMatch(/^(asc|desc)$/u);
    }
  });

  it("narrows strings to sort keys", () => {
    expect(isNodeSortKey("snr")).toBe(true);
    expect(isNodeSortKey("rssi")).toBe(false);
  });
});

describe("favorites first", () => {
  const mixed = [
    makeRow({ num: 5, longName: "echo", heardSecondsAgo: 30 }),
    makeRow({
      num: 6,
      longName: "foxtrot",
      heardSecondsAgo: 900,
      isFavorite: true,
    }),
    makeRow({ num: 7, longName: "golf", heardSecondsAgo: 120 }),
    makeRow({
      num: 8,
      longName: "hotel",
      heardSecondsAgo: 300,
      isFavorite: true,
    }),
    makeRow({ num: 9, longName: "india", isFavorite: true }),
  ];

  it("leaves favorites where the column puts them when off", () => {
    expect(nums(sortNodeRows(mixed, DEFAULT_NODE_LIST_SORT))).toEqual([
      5, 7, 8, 6, 9,
    ]);
  });

  it("groups favorites first, then last heard, never heard last in each group", () => {
    expect(
      nums(
        sortNodeRows(mixed, {
          ...DEFAULT_NODE_LIST_SORT,
          favoritesFirst: true,
        }),
      ),
    ).toEqual([8, 6, 9, 5, 7]);
  });

  it("keeps favorites first whichever way the column runs", () => {
    const sort = { key: "name", favoritesFirst: true } as const;
    expect(nums(sortNodeRows(mixed, { ...sort, direction: "asc" }))).toEqual([
      6, 8, 9, 5, 7,
    ]);
    expect(nums(sortNodeRows(mixed, { ...sort, direction: "desc" }))).toEqual([
      9, 8, 6, 7, 5,
    ]);
  });

  it("breaks ties by node number inside each group", () => {
    const tied = [
      makeRow({ num: 30, heardSecondsAgo: 60 }),
      makeRow({ num: 12, heardSecondsAgo: 60, isFavorite: true }),
      makeRow({ num: 20, heardSecondsAgo: 60 }),
      makeRow({ num: 11, heardSecondsAgo: 60, isFavorite: true }),
    ];
    const sort = { ...DEFAULT_NODE_LIST_SORT, favoritesFirst: true };
    expect(nums(sortNodeRows(tied, sort))).toEqual([11, 12, 20, 30]);
    expect(nums(sortNodeRows([...tied].reverse(), sort))).toEqual([
      11, 12, 20, 30,
    ]);
  });

  it("doesn't touch the input", () => {
    const before = nums(mixed);
    sortNodeRows(mixed, { ...DEFAULT_NODE_LIST_SORT, favoritesFirst: true });
    expect(nums(mixed)).toEqual(before);
  });
});

describe("channel heard sort keys", () => {
  it("are node sort keys without the columns the list doesn't show", () => {
    expect(CHANNEL_HEARD_SORT_KEYS.every(isNodeSortKey)).toBe(true);
    expect(isChannelHeardSortKey("snr")).toBe(true);
    expect(isChannelHeardSortKey("role")).toBe(false);
    expect(isChannelHeardSortKey("hardware")).toBe(false);
  });
});

describe("parseNodeListSort", () => {
  it("keeps a valid stored sort", () => {
    expect(
      parseNodeListSort(
        { key: "snr", direction: "asc", favoritesFirst: true },
        isNodeSortKey,
        DEFAULT_NODE_LIST_SORT,
      ),
    ).toEqual({ key: "snr", direction: "asc", favoritesFirst: true });
  });

  it("falls back to the default for an unknown column or a non-object", () => {
    for (const stored of [
      { key: "rssi", direction: "asc", favoritesFirst: true },
      { direction: "asc" },
      "lastHeard",
      null,
      undefined,
      42,
    ]) {
      expect(
        parseNodeListSort(stored, isNodeSortKey, DEFAULT_NODE_LIST_SORT),
      ).toBe(DEFAULT_NODE_LIST_SORT);
    }
  });

  it("rejects a column this list doesn't offer", () => {
    expect(
      parseNodeListSort(
        { key: "role", direction: "asc", favoritesFirst: true },
        isChannelHeardSortKey,
        DEFAULT_CHANNEL_HEARD_SORT,
      ),
    ).toBe(DEFAULT_CHANNEL_HEARD_SORT);
  });

  it("repairs a bad direction or flag field by field", () => {
    expect(
      parseNodeListSort(
        { key: "hops", direction: "sideways", favoritesFirst: "yes" },
        isNodeSortKey,
        { ...DEFAULT_NODE_LIST_SORT, favoritesFirst: true },
      ),
    ).toEqual({ key: "hops", direction: "asc", favoritesFirst: true });
  });
});

describe("parseNodeListSorts", () => {
  it("defaults every list when nothing is stored", () => {
    expect(parseNodeListSorts(undefined)).toEqual(DEFAULT_NODE_LIST_SORTS);
  });

  it("validates each list on its own", () => {
    expect(
      parseNodeListSorts({
        nodes: { key: "role", direction: "asc", favoritesFirst: false },
        channelHeard: { key: "role", direction: "asc", favoritesFirst: true },
      }),
    ).toEqual({
      nodes: { key: "role", direction: "asc", favoritesFirst: false },
      channelHeard: DEFAULT_CHANNEL_HEARD_SORT,
    });
  });
});
