import { AdminError } from "@core/kmp/admin.ts";
import { adminOk } from "@core/kmp/fakeClient.ts";
import { makeRow } from "@core/nodes/testNodes.ts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAccess } from "./useAdminAccess.ts";

const env = vi.hoisted(() => ({
  sendAdmin: vi.fn(),
  setAdminAccess: vi.fn(),
  toast: vi.fn(),
  localKey: new Uint8Array([1, 2, 3]) as Uint8Array | undefined,
}));

vi.mock("@core/kmp/hooks", () => ({
  useActiveClient: () => ({ sendAdmin: env.sendAdmin }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { security: { publicKey: env.localKey } },
    setAdminAccess: env.setAdminAccess,
  }),
}));

const node = makeRow(
  { num: 0x0c40, longName: "IB North", publicKey: new Uint8Array([9]) },
  { myNodeNum: 9 },
);

describe("useAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.localKey = new Uint8Array([1, 2, 3]);
  });

  it("needs a key on this radio", () => {
    env.localKey = undefined;
    const { result } = renderHook(() => useAdminAccess(node));
    expect(result.current.available).toBe(false);
    act(() => result.current.check());
    expect(env.sendAdmin).not.toHaveBeenCalled();
  });

  it("spins while checking and toasts a success", async () => {
    let answer: (value: unknown) => void = () => {};
    env.sendAdmin.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { result } = renderHook(() => useAdminAccess(node));
    act(() => result.current.check());
    expect(result.current.checking).toBe(true);
    expect(env.sendAdmin).toHaveBeenCalledWith(
      { case: "getDeviceMetadataRequest", value: true },
      0x0c40,
    );

    // A second click while waiting sends nothing more.
    act(() => result.current.check());
    expect(env.sendAdmin).toHaveBeenCalledTimes(1);

    await act(async () => answer(Result.ok(adminOk())));
    expect(result.current.checking).toBe(false);
    expect(env.setAdminAccess).toHaveBeenCalledWith(0x0c40, true, "AQID");
    expect(env.toast).toHaveBeenCalledWith({
      title: "You can manage IB North remotely",
    });
  });

  it("opens the explanation, with this radio's key, on a refusal", async () => {
    env.sendAdmin.mockResolvedValue(Result.err(new AdminError("unauthorized")));
    const { result } = renderHook(() => useAdminAccess(node));
    act(() => result.current.check());
    await waitFor(() => expect(result.current.refusal).toBeDefined());
    expect(result.current.refusal).toEqual({
      name: "IB North",
      localPublicKey: "AQID",
    });
    expect(env.setAdminAccess).toHaveBeenCalledWith(0x0c40, false, "AQID");
    act(() => result.current.dismissRefusal());
    expect(result.current.refusal).toBeUndefined();
  });

  it("says when the node could not be reached", async () => {
    env.sendAdmin.mockResolvedValue(Result.err(new AdminError("timeout")));
    const { result } = renderHook(() => useAdminAccess(node));
    act(() => result.current.check());
    await waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith({
        title: "Could not reach IB North. Try again or move closer.",
      }),
    );
    expect(env.setAdminAccess).not.toHaveBeenCalled();
  });
});
