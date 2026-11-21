import { describe, expect, it } from "vitest";
import {
  type ConversationAccessors,
  countByFilter,
  filterConversations,
  matchesSearch,
  normalizeForSearch,
} from "./conversationList.ts";

interface Row {
  id: string;
  name: string;
  preview?: string;
  unread: number;
  favorite: boolean;
  at?: number;
}

const accessors: ConversationAccessors<Row> = {
  unreadCount: (r) => r.unread,
  isFavorite: (r) => r.favorite,
  searchText: (r) => [r.name, r.preview, r.id],
  lastActivity: (r) => r.at,
  name: (r) => r.name,
};

const rows: Row[] = [
  {
    id: "a",
    name: "Primary",
    preview: "range test?",
    unread: 3,
    favorite: false,
    at: 300,
  },
  {
    id: "b",
    name: "COULLS_BASE",
    preview: "copy that",
    unread: 0,
    favorite: true,
    at: 500,
  },
  { id: "c", name: "Zürich Relay", unread: 1, favorite: true, at: 100 },
  { id: "d", name: "Alpha", unread: 0, favorite: false },
  { id: "e", name: "Bravo", unread: 0, favorite: false },
];

const ids = (list: Row[]) => list.map((r) => r.id);

describe("normalizeForSearch", () => {
  it("lower-cases and strips accents", () => {
    expect(normalizeForSearch("  Zürich ÉCOLE ")).toBe("zurich ecole");
  });
});

describe("matchesSearch", () => {
  it("matches everything for an empty search", () => {
    expect(matchesSearch([], "  ")).toBe(true);
  });

  it("needs every term somewhere", () => {
    expect(matchesSearch(["Primary", "range test?"], "prim range")).toBe(true);
    expect(matchesSearch(["Primary", "range test?"], "prim zebra")).toBe(false);
  });

  it("skips missing fields", () => {
    expect(matchesSearch([null, undefined, "Alpha"], "alp")).toBe(true);
  });
});

describe("filterConversations", () => {
  it("sorts by latest activity, then name, idle rows last", () => {
    expect(
      ids(filterConversations(rows, { filter: "all", search: "" }, accessors)),
    ).toEqual(["b", "a", "c", "d", "e"]);
  });

  it("filters unread", () => {
    expect(
      ids(
        filterConversations(rows, { filter: "unread", search: "" }, accessors),
      ),
    ).toEqual(["a", "c"]);
  });

  it("filters favorites", () => {
    expect(
      ids(
        filterConversations(
          rows,
          { filter: "favorites", search: "" },
          accessors,
        ),
      ),
    ).toEqual(["b", "c"]);
  });

  it("combines a filter with accent-insensitive search", () => {
    expect(
      ids(
        filterConversations(
          rows,
          { filter: "favorites", search: "zurich" },
          accessors,
        ),
      ),
    ).toEqual(["c"]);
  });

  it("searches the preview text", () => {
    expect(
      ids(
        filterConversations(rows, { filter: "all", search: "COPY" }, accessors),
      ),
    ).toEqual(["b"]);
  });

  it("does not mutate the input", () => {
    const copy = [...rows];
    filterConversations(rows, { filter: "all", search: "" }, accessors);
    expect(rows).toEqual(copy);
  });
});

describe("countByFilter", () => {
  it("counts each chip", () => {
    expect(countByFilter(rows, accessors)).toEqual({
      all: 5,
      unread: 2,
      favorites: 2,
    });
  });
});
