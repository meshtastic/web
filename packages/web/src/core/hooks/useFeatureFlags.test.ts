import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useFeatureFlags, useFeatureFlag } from "./useFeatureFlags";
import { featureFlags } from "@core/services/featureFlags";

describe("useFeatureFlags", () => {
  beforeEach(() => {
    // Reset overrides
    featureFlags.setOverrides({
      persistNodeDB: null,
      persistMessages: null,
      persistDevices: null,
      persistApp: null,
    } as any);
  });

  it("should return all flags", () => {
    const { result } = renderHook(() => useFeatureFlags());
    const flags = result.current;
    
    // Check if expected keys exist
    expect(flags).toHaveProperty("persistNodeDB");
    expect(flags).toHaveProperty("persistMessages");
  });

  it("should update when a flag is overridden", () => {
    const { result } = renderHook(() => useFeatureFlags());
    
    // Assume initial state (might vary based on env, but we can toggle)
    const initialVal = result.current.persistNodeDB;

    act(() => {
      featureFlags.setOverride("persistNodeDB", !initialVal);
    });

    expect(result.current.persistNodeDB).toBe(!initialVal);
  });
});

describe("useFeatureFlag", () => {
  beforeEach(() => {
    featureFlags.setOverrides({
        persistNodeDB: null,
    } as any);
  });

  it("should return specific flag value", () => {
    featureFlags.setOverride("persistNodeDB", true);
    const { result } = renderHook(() => useFeatureFlag("persistNodeDB"));
    expect(result.current).toBe(true);

    act(() => {
      featureFlags.setOverride("persistNodeDB", false);
    });
    expect(result.current).toBe(false);
  });
});
