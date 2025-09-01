import { Button } from "@components/UI/Button.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useToast", () => {
  beforeEach(() => {
    // Reset toast memory state before each test
    // our hook uses global memory to store toasts
    // @ts-expect-error - internal test reset
    globalThis.memoryState = { toasts: [] };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a toast with title, description, and action", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: "Backup Reminder",
        description: "Don't forget to backup!",
        action: <Button>Backup Now</Button>,
      });
      vi.runAllTimers();
    });

    const toast = result.current.toasts[0]!;
    expect(result.current.toasts.length).toBe(1);
    expect(toast.title).toBe("Backup Reminder");
    expect(toast.description).toBe("Don't forget to backup!");
    expect(toast.action).toBeTruthy();
    expect(toast.open).toBe(true);
  });
  it("should dismiss a toast using returned dismiss function", () => {
    const { result } = renderHook(() => useToast());
    vi.useFakeTimers();

    let toastRef: { id: string; dismiss: () => void };

    act(() => {
      toastRef = result.current.toast({ title: "Dismiss Me" });
      vi.runAllTimers(); // Flush ADD_TOAST
    });

    act(() => {
      toastRef.dismiss();
    });

    const toast = result.current.toasts.find((t) => t.id === toastRef.id);
    expect(toast?.open).toBe(false);

    vi.useRealTimers();
  });

  it("should allow dismiss via hook dismiss function", () => {
    const { result } = renderHook(() => useToast());
    vi.useFakeTimers();

    let toastRef: { id: string };

    act(() => {
      toastRef = result.current.toast({ title: "Manual Dismiss" });
      vi.runAllTimers();
    });

    act(() => {
      result.current.dismiss(toastRef.id);
    });

    const toast = result.current.toasts.find((t) => t.id === toastRef.id);
    expect(toast?.open).toBe(false);

    vi.useRealTimers();
  });
});
