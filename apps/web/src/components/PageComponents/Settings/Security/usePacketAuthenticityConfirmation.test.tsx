import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePacketAuthenticityConfirmation } from "./usePacketAuthenticityConfirmation.ts";

describe("usePacketAuthenticityConfirmation", () => {
  it("allows supported non-Strict choices without confirmation", async () => {
    const { result } = renderHook(() =>
      usePacketAuthenticityConfirmation(true),
    );

    await expect(result.current.validateSelection("BALANCED")).resolves.toBe(
      true,
    );
    expect(result.current.strictDialogOpen).toBe(false);
  });

  it("requires confirmation before accepting Strict", async () => {
    const { result } = renderHook(() =>
      usePacketAuthenticityConfirmation(true),
    );
    let pending!: Promise<boolean>;

    act(() => {
      pending = result.current.validateSelection("STRICT");
    });
    expect(result.current.strictDialogOpen).toBe(true);

    act(() => result.current.confirmStrict());
    await expect(pending).resolves.toBe(true);
    expect(result.current.strictDialogOpen).toBe(false);
  });

  it("keeps the current policy when Strict is canceled", async () => {
    const { result } = renderHook(() =>
      usePacketAuthenticityConfirmation(true),
    );
    let pending!: Promise<boolean>;

    act(() => {
      pending = result.current.validateSelection("STRICT");
    });
    act(() => result.current.cancelStrict());

    await expect(pending).resolves.toBe(false);
  });

  it("rejects Strict if capability disappears during confirmation", async () => {
    const { result, rerender } = renderHook(
      ({ supported }) => usePacketAuthenticityConfirmation(supported),
      { initialProps: { supported: true } },
    );
    let pending!: Promise<boolean>;

    act(() => {
      pending = result.current.validateSelection("STRICT");
    });
    rerender({ supported: false });

    await expect(pending).resolves.toBe(false);
    expect(result.current.strictDialogOpen).toBe(false);
  });

  it("rejects every policy change when the capability is unavailable", async () => {
    const { result } = renderHook(() =>
      usePacketAuthenticityConfirmation(false),
    );

    await expect(result.current.validateSelection("COMPATIBLE")).resolves.toBe(
      false,
    );
    await expect(result.current.validateSelection("STRICT")).resolves.toBe(
      false,
    );
    expect(result.current.strictDialogOpen).toBe(false);
  });
});
