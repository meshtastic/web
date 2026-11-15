import { beforeEach, describe, expect, it, vi } from "vitest";

const immer = vi.hoisted(() => ({ enableMapSet: vi.fn() }));

vi.mock("immer", async () => {
  const actual = await vi.importActual<typeof import("immer")>("immer");
  immer.enableMapSet.mockImplementation(actual.enableMapSet);
  return { ...actual, enableMapSet: immer.enableMapSet };
});

describe("device store and immer's Map support", () => {
  beforeEach(() => {
    vi.resetModules();
    immer.enableMapSet.mockClear();
  });

  it("enables Map support itself, before its persisted devices can rehydrate", async () => {
    await import("./index.ts");

    expect(immer.enableMapSet).toHaveBeenCalled();
  });
});
