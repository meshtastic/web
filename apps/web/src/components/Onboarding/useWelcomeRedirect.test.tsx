import { WELCOME_DISMISSED_KEY } from "@core/onboarding/welcome.ts";
import { useDeviceStore } from "@core/stores";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWelcomeRedirect } from "./useWelcomeRedirect.ts";

let hydrated = false;
let finish: (() => void) | undefined;

beforeEach(() => {
  hydrated = false;
  finish = undefined;
  localStorage.clear();
  useDeviceStore.setState({ savedConnections: [], devices: new Map() });
  vi.spyOn(useDeviceStore.persist, "hasHydrated").mockImplementation(
    () => hydrated,
  );
  vi.spyOn(useDeviceStore.persist, "onFinishHydration").mockImplementation(
    (listener) => {
      finish = () => {
        hydrated = true;
        listener(useDeviceStore.getState());
      };
      return () => {
        finish = undefined;
      };
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWelcomeRedirect", () => {
  it("waits for hydration, then redirects a first-time visitor once", () => {
    const go = vi.fn();
    const { rerender } = renderHook(() => useWelcomeRedirect(go, false));
    expect(go).not.toHaveBeenCalled();

    act(() => finish?.());
    expect(go).toHaveBeenCalledTimes(1);
    rerender();
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("leaves a returning user alone", () => {
    hydrated = true;
    useDeviceStore.setState({
      savedConnections: [
        {
          id: 1,
          type: "http",
          name: "Radio",
          url: "http://10.0.0.2",
          createdAt: 0,
          status: "disconnected",
          nodeNum: 1234,
        },
      ],
    });
    const go = vi.fn();
    renderHook(() => useWelcomeRedirect(go, false));
    expect(go).not.toHaveBeenCalled();
  });

  it("leaves a user who skipped the wizard alone", () => {
    hydrated = true;
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    const go = vi.fn();
    renderHook(() => useWelcomeRedirect(go, false));
    expect(go).not.toHaveBeenCalled();
  });

  it("does nothing while already on the welcome page", () => {
    hydrated = true;
    const go = vi.fn();
    const { rerender } = renderHook(
      ({ onWelcome }) => useWelcomeRedirect(go, onWelcome),
      { initialProps: { onWelcome: true } },
    );
    rerender({ onWelcome: false });
    expect(go).not.toHaveBeenCalled();
  });
});
