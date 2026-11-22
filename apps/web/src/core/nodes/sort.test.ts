import { describe, expect, it } from "vitest";
import {
  ariaSortFor,
  comparatorFor,
  nextSortState,
  type SortAccessors,
  sortItems,
} from "./sort.ts";

interface Item {
  id: number;
  name: string;
  score?: number;
}

type Key = "name" | "score";

const accessors: SortAccessors<Item, Key> = {
  name: (item) => item.name,
  score: (item) => item.score,
};

const items: Item[] = [
  { id: 1, name: "bravo", score: 2 },
  { id: 2, name: "Alpha" },
  { id: 3, name: "charlie", score: 10 },
  { id: 4, name: "alpha", score: 2 },
];

const ids = (list: Item[]) => list.map((item) => item.id);
const tiebreak = (a: Item, b: Item) => a.id - b.id;

describe("sortItems", () => {
  it("sorts numbers numerically, not as strings", () => {
    expect(
      ids(sortItems(items, accessors, { key: "score", direction: "asc" })),
    ).toEqual([1, 4, 3, 2]);
  });

  it("puts unknown values last in both directions", () => {
    const desc = sortItems(
      items,
      accessors,
      { key: "score", direction: "desc" },
      { tiebreak },
    );
    expect(ids(desc)).toEqual([3, 1, 4, 2]);
  });

  it("compares strings with the collator, case-insensitively", () => {
    const sorted = sortItems(
      items,
      accessors,
      { key: "name", direction: "asc" },
      { tiebreak },
    );
    expect(ids(sorted)).toEqual([2, 4, 1, 3]);
  });

  it("breaks ties with the tiebreak, independent of direction", () => {
    const asc = sortItems(
      items,
      accessors,
      { key: "score", direction: "asc" },
      { tiebreak },
    );
    const desc = sortItems(
      items,
      accessors,
      { key: "score", direction: "desc" },
      { tiebreak },
    );
    expect(ids(asc).slice(0, 2)).toEqual([1, 4]);
    expect(ids(desc).slice(1, 3)).toEqual([1, 4]);
  });

  it("does not mutate the input", () => {
    const before = ids(items);
    sortItems(items, accessors, { key: "name", direction: "desc" });
    expect(ids(items)).toEqual(before);
  });

  it("treats two unknown values as equal", () => {
    const compare = comparatorFor(accessors, {
      key: "score",
      direction: "asc",
    });
    expect(compare({ id: 1, name: "a" }, { id: 2, name: "b" })).toBe(0);
  });
});

describe("nextSortState", () => {
  const initial = { name: "asc", score: "desc" } as const;

  it("flips direction on the same column", () => {
    expect(
      nextSortState({ key: "name", direction: "asc" }, "name", initial),
    ).toEqual({ key: "name", direction: "desc" });
  });

  it("starts a new column in its initial direction", () => {
    expect(
      nextSortState({ key: "name", direction: "asc" }, "score", initial),
    ).toEqual({ key: "score", direction: "desc" });
  });
});

describe("ariaSortFor", () => {
  it("reports the sorted column's direction only", () => {
    const sort = { key: "name", direction: "desc" } as const;
    expect(ariaSortFor<Key>(sort, "name")).toBe("descending");
    expect(ariaSortFor<Key>(sort, "score")).toBe("none");
    expect(ariaSortFor<Key>({ key: "name", direction: "asc" }, "name")).toBe(
      "ascending",
    );
  });
});
