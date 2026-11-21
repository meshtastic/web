import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { createEmojiCatalogLoader } from "./loadCatalog.ts";

const DATA = {
  version: "16.0",
  categories: [{ name: "Symbols", icon: "❤️", emojis: [{ b: "❤️" }] }],
};

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe("createEmojiCatalogLoader", () => {
  it("fetches once and caches the catalog", async () => {
    const fetchFn = vi.fn(() => ok(DATA));
    const loader = createEmojiCatalogLoader(fetchFn, "/emoji.json");
    expect(loader.peek()).toBeUndefined();
    const [a, b] = await Promise.all([loader.load(), loader.load()]);
    await loader.load();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("/emoji.json");
    expect(Result.isOk(a) && Result.isOk(b)).toBe(true);
    expect(loader.peek()?.all.map((e) => e.base)).toEqual(["❤️"]);
  });

  it("reports a network error and retries on the next load", async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockImplementation(() => ok(DATA));
    const loader = createEmojiCatalogLoader(fetchFn, "/emoji.json");
    const first = await loader.load();
    expect(Result.isError(first)).toBe(true);
    const second = await loader.load();
    expect(Result.isOk(second)).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("reports an HTTP error, bad JSON and malformed data", async () => {
    const statuses = createEmojiCatalogLoader(
      () => Promise.resolve(new Response("nope", { status: 404 })),
      "/x",
    );
    expect(Result.isError(await statuses.load())).toBe(true);

    const notJson = createEmojiCatalogLoader(
      () => Promise.resolve(new Response("{", { status: 200 })),
      "/x",
    );
    expect(Result.isError(await notJson.load())).toBe(true);

    const malformed = createEmojiCatalogLoader(() => ok({ nope: 1 }), "/x");
    expect(Result.isError(await malformed.load())).toBe(true);
    expect(malformed.peek()).toBeUndefined();
  });
});
