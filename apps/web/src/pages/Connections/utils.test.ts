import { afterEach, describe, expect, it, vi } from "vitest";
import { testHttpReachable } from "./utils.ts";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => fetchMock.mockReset());

describe("testHttpReachable", () => {
  it("is reachable when the first attempt answers", async () => {
    fetchMock.mockResolvedValueOnce(new Response());
    const result = await testHttpReachable("http://meshtastic.local");
    expect(result).toMatchObject({ reachable: true, certError: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first attempt fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response());
    const result = await testHttpReachable("http://meshtastic.local");
    expect(result.reachable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is unreachable when both attempts fail", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await testHttpReachable("http://192.168.1.250");
    expect(result.reachable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports how long the check took", async () => {
    fetchMock.mockResolvedValueOnce(new Response());
    const { elapsedMs } = await testHttpReachable("http://meshtastic.local");
    expect(elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
