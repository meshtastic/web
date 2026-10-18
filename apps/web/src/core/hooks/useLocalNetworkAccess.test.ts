import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocalNetworkAccess } from "./useLocalNetworkAccess.ts";

const status = (state: PermissionState) =>
  ({
    state,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as PermissionStatus;

const withPermissions = (names: Record<string, PermissionState>) => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {
    permissions: {
      query: vi.fn(({ name }: { name: string }) =>
        name in names
          ? Promise.resolve(status(names[name] as PermissionState))
          : Promise.reject(new TypeError(`unknown permission ${name}`)),
      ),
    },
  });
};

describe("useLocalNetworkAccess", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads Firefox's local-network permission", async () => {
    withPermissions({ "local-network": "prompt" });
    const { result } = renderHook(() => useLocalNetworkAccess());
    await waitFor(() => expect(result.current).toBe("prompt"));
  });

  it("falls back to Chrome's local-network-access name", async () => {
    withPermissions({ "local-network-access": "granted" });
    const { result } = renderHook(() => useLocalNetworkAccess());
    await waitFor(() => expect(result.current).toBe("granted"));
  });

  it("is unsupported when the browser knows neither name", async () => {
    withPermissions({});
    const { result } = renderHook(() => useLocalNetworkAccess());
    await waitFor(() => expect(result.current).toBe("unsupported"));
  });
});
