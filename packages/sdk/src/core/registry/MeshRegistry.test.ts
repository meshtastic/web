import { describe, expect, it } from "vitest";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { MeshRegistry } from "./MeshRegistry.ts";

describe("MeshRegistry", () => {
  it("creates clients keyed by id and emits a snapshot", () => {
    const reg = new MeshRegistry();
    const seen: number[] = [];
    reg.list.subscribe((entries) => seen.push(entries.length));

    const { transport: t1 } = createFakeTransport();
    const { transport: t2 } = createFakeTransport();

    reg.create(1, { transport: t1 });
    reg.create(2, { transport: t2 });

    expect(reg.size).toBe(2);
    expect(reg.get(1)).toBeDefined();
    expect(reg.get(42)).toBeUndefined();
    expect(seen).toEqual([1, 2]);
  });

  it("auto-activates the first client and allows switching", () => {
    const reg = new MeshRegistry();
    expect(reg.activeId.value).toBeNull();

    const { transport: t1 } = createFakeTransport();
    const { transport: t2 } = createFakeTransport();
    reg.create(1, { transport: t1 });
    expect(reg.activeId.value).toBe(1);

    reg.create(2, { transport: t2 });
    expect(reg.activeId.value).toBe(1);

    reg.setActive(2);
    expect(reg.activeId.value).toBe(2);
    expect(reg.active.value).toBe(reg.get(2));
  });

  it("rejects duplicate ids", () => {
    const reg = new MeshRegistry();
    const { transport } = createFakeTransport();
    reg.create(1, { transport });
    expect(() => reg.create(1, { transport: createFakeTransport().transport })).toThrow();
  });

  it("remove disconnects the client and falls back to another active id", async () => {
    const reg = new MeshRegistry();
    reg.create(1, { transport: createFakeTransport().transport });
    reg.create(2, { transport: createFakeTransport().transport });
    reg.setActive(1);
    await reg.remove(1);
    expect(reg.size).toBe(1);
    expect(reg.activeId.value).toBe(2);
  });
});
