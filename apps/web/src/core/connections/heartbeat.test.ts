import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceStore } from "@core/stores/deviceStore";
import type { MeshDevice } from "@meshtastic/sdk";
import { startMaintenanceHeartbeat, stopHeartbeat } from "./heartbeat.ts";

function mockMeshDevice(
  fails: number,
): MeshDevice & { callCount: () => number } {
  let count = 0;
  const md = {
    heartbeat: vi.fn(() => {
      count += 1;
      if (count <= fails) return Promise.reject(new Error(`fail ${count}`));
      return Promise.resolve(0);
    }),
  } as unknown as MeshDevice & { callCount: () => number };
  (md as any).callCount = () => count;
  return md as any;
}

describe("heartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store
    const store = useDeviceStore.getState();
    // Ensure a connection exists
    if (!store.savedConnections.find((c) => c.id === 999)) {
      store.addSavedConnection({
        id: 999,
        type: "http",
        name: "test",
        url: "http://192.168.1.3",
        status: "configured",
        createdAt: Date.now(),
      } as any);
    } else {
      store.updateSavedConnection(999, {
        status: "configured",
        error: undefined,
      });
    }
    stopHeartbeat(999);
  });

  it("flips to warning after 3 consecutive failures", async () => {
    const md = mockMeshDevice(10); // always fail
    startMaintenanceHeartbeat(999, md);

    // One interval (5min) fails -> schedules retry (~1s), retry fails -> retry (~2s), retry fails -> warning
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);

    const conn = useDeviceStore
      .getState()
      .savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("warning");
    expect(conn?.error).toMatch(/Heartbeat failed/);

    stopHeartbeat(999);
    vi.useRealTimers();
  });

  it("recovers from warning on success", async () => {
    const md = mockMeshDevice(3); // fail 3, then succeed
    startMaintenanceHeartbeat(999, md);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);

    let conn = useDeviceStore
      .getState()
      .savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("warning");

    // Next interval should succeed and clear warning
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);

    conn = useDeviceStore.getState().savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("configured");
    expect(conn?.error).toBeUndefined();

    stopHeartbeat(999);
    vi.useRealTimers();
  });

  it("clears warning when a restarted session succeeds", async () => {
    const failing = mockMeshDevice(10);
    startMaintenanceHeartbeat(999, failing);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(0);

    expect(
      useDeviceStore.getState().savedConnections.find((c) => c.id === 999)
        ?.status,
    ).toBe("warning");

    stopHeartbeat(999);
    const recovered = mockMeshDevice(0);
    startMaintenanceHeartbeat(999, recovered);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);

    const conn = useDeviceStore
      .getState()
      .savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("configured");
    expect(conn?.error).toBeUndefined();

    stopHeartbeat(999);
    vi.useRealTimers();
  });

  it("ignores late failure from stopped session after restart", async () => {
    let rejectA!: (e: Error) => void;
    const pendingA = new Promise<number>((_, rej) => {
      rejectA = rej;
    });
    const mdA = { heartbeat: vi.fn(() => pendingA) } as unknown as MeshDevice;

    startMaintenanceHeartbeat(999, mdA);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);
    stopHeartbeat(999);
    const mdB = mockMeshDevice(0);
    useDeviceStore
      .getState()
      .updateSavedConnection(999, { status: "configured", error: undefined });
    startMaintenanceHeartbeat(999, mdB);

    rejectA(new Error("stale fail"));
    await vi.advanceTimersByTimeAsync(0);

    let conn = useDeviceStore
      .getState()
      .savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("configured");
    expect(mdB.heartbeat).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);
    conn = useDeviceStore.getState().savedConnections.find((c) => c.id === 999);
    expect(conn?.status).toBe("configured");

    stopHeartbeat(999);
    vi.useRealTimers();
  });
});
