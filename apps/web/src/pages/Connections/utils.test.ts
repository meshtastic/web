import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalNetworkHost, testHttpReachable } from "./utils.ts";

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

describe("testHttpReachable on an HTTPS page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("marks an http:// check as a local network request", async () => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { protocol: "https:" } as Location);
    fetchMock.mockResolvedValueOnce(new Response());
    await testHttpReachable("http://192.168.1.10");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      targetAddressSpace: "local",
    });
  });
});

describe("isLocalNetworkHost", () => {
  it.each([
    "192.168.1.10",
    "10.0.0.5:8080",
    "172.16.4.2",
    "172.31.255.1",
    "169.254.10.1",
    "127.0.0.1",
    "localhost",
    "meshtastic.local",
    "Meshtastic.LOCAL/api",
    "[fe80::1]:80",
    "fd12:3456::1",
    "::1",
  ])("treats %s as local", (host) => {
    expect(isLocalNetworkHost(host)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "172.32.0.1",
    "192.169.1.1",
    "example.com",
    "client.meshtastic.org",
    "2001:db8::1",
    "",
  ])("treats %s as not local", (host) => {
    expect(isLocalNetworkHost(host)).toBe(false);
  });
});
