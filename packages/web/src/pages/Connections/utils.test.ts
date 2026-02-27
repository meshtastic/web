import { afterEach, describe, expect, it, vi } from "vitest";
import { httpReachabilityMessage, testHttpReachable } from "./utils.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("testHttpReachable", () => {
  it("returns { reachable: true } on 200 OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response),
    );
    const result = await testHttpReachable("http://192.168.1.1");
    expect(result).toEqual({ reachable: true });
  });

  it("returns { reachable: false, reason: 'http-error' } on non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response),
    );
    const result = await testHttpReachable("http://192.168.1.1");
    expect(result).toEqual({ reachable: false, reason: "http-error" });
  });

  it("returns { reachable: false, reason: 'timeout' } on AbortError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );
    const result = await testHttpReachable("http://192.168.1.1");
    expect(result).toEqual({ reachable: false, reason: "timeout" });
  });

  it("returns { reachable: false, reason: 'timeout' } on TimeoutError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError")),
    );
    const result = await testHttpReachable("http://192.168.1.1");
    expect(result).toEqual({ reachable: false, reason: "timeout" });
  });

  it("returns { reachable: false, reason: 'cors' } on TypeError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const result = await testHttpReachable("http://192.168.1.1");
    expect(result).toEqual({ reachable: false, reason: "cors" });
  });

  it("probes /api/v1/fromradio, not root URL", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", mockFetch);

    await testHttpReachable("http://192.168.1.1");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://192.168.1.1/api/v1/fromradio",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("forwards an external abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );

    const result = await testHttpReachable(
      "http://192.168.1.1",
      3000,
      controller.signal,
    );
    expect(result).toEqual({ reachable: false, reason: "timeout" });
  });
});

describe("httpReachabilityMessage", () => {
  it("returns timeout message", () => {
    const msg = httpReachabilityMessage("http://192.168.1.1", "timeout");
    expect(msg).toMatch(/powered on/);
  });

  it("returns CORS message for HTTP", () => {
    const msg = httpReachabilityMessage("http://192.168.1.1", "cors");
    expect(msg).toMatch(/Cannot reach device/);
    expect(msg).not.toMatch(/self-signed/);
  });

  it("returns self-signed cert message for HTTPS + cors", () => {
    const msg = httpReachabilityMessage("https://192.168.1.1", "cors");
    expect(msg).toMatch(/self-signed certificate/);
    expect(msg).toMatch(/192\.168\.1\.1/);
  });

  it("returns http-error message", () => {
    const msg = httpReachabilityMessage("http://192.168.1.1", "http-error");
    expect(msg).toMatch(/error/i);
  });

  it("returns network message", () => {
    const msg = httpReachabilityMessage("http://192.168.1.1", "network");
    expect(msg).toMatch(/Network error/);
  });
});
