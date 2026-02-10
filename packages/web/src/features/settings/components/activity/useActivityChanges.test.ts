import type { ConfigChange } from "@data/schema.ts";
import { useUIStore } from "@state/ui/store.ts";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock usePendingChanges
const mockClearChange = vi.fn();
const mockPendingChanges: ConfigChange[] = [];

vi.mock("@data/hooks/usePendingChanges.ts", () => ({
  usePendingChanges: vi.fn(() => ({
    pendingChanges: mockPendingChanges,
    clearChange: mockClearChange,
    clearAllChanges: vi.fn(),
  })),
}));

// Mock useMyNode
vi.mock("@shared/hooks", () => ({
  useMyNode: vi.fn(() => ({
    myNodeNum: 12345,
    myNode: undefined,
  })),
}));

// Helper to create a mock ConfigChange
function createMockChange(overrides: Partial<ConfigChange> = {}): ConfigChange {
  return {
    id: 1,
    ownerNodeNum: 12345,
    changeType: "user",
    variant: null,
    channelIndex: null,
    fieldPath: "longName",
    value: "New Value",
    originalValue: "Original Value",
    hasConflict: false,
    remoteValue: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("useActivityChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingChanges.length = 0;
    useUIStore.setState({ pendingFieldReset: null });
  });

  it("transforms pending changes to activity items", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "user",
        fieldPath: "longName",
        value: "Test Name",
        originalValue: "Original",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.activityItems.length).toBe(1);
    expect(result.current.activityItems[0].fieldPath).toBe("longName");
    expect(result.current.activityItems[0].type).toBe("user");
    expect(result.current.activityItems[0].category).toBe("User");
    expect(result.current.activityItems[0].originalValue).toBe("Original");
  });

  it("sets correct category for config changes", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "config",
        variant: "lora",
        fieldPath: "region",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.activityItems[0].category).toBe("Lora");
  });

  it("sets correct category for moduleConfig changes", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "moduleConfig",
        variant: "mqtt",
        fieldPath: "enabled",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.activityItems[0].category).toBe("MQTT");
  });

  it("sets correct category for channel changes", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "channel",
        channelIndex: 0,
        fieldPath: null,
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.activityItems[0].category).toBe("Channels");
  });

  it("removeChange dispatches resetField and clears change", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "user",
        fieldPath: "longName",
        originalValue: "Original Name",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    const item = result.current.activityItems[0];

    act(() => {
      result.current.removeChange(item);
    });

    // Check that resetField was called on the store
    expect(useUIStore.getState().pendingFieldReset).toEqual({
      changeType: "user",
      variant: undefined,
      fieldPath: "longName",
      value: "Original Name",
    });

    // Check that clearChange was called
    expect(mockClearChange).toHaveBeenCalledWith({
      changeType: "user",
      variant: undefined,
      channelIndex: undefined,
      fieldPath: "longName",
    });
  });

  it("removeAllChanges removes each item individually", async () => {
    mockPendingChanges.push(
      createMockChange({
        id: 1,
        changeType: "user",
        fieldPath: "longName",
        originalValue: "Original 1",
      }),
      createMockChange({
        id: 2,
        changeType: "user",
        fieldPath: "shortName",
        originalValue: "Original 2",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.activityItems.length).toBe(2);

    act(() => {
      result.current.removeAllChanges();
    });

    // clearChange should be called for each item
    expect(mockClearChange).toHaveBeenCalledTimes(2);
  });

  it("generates unique id for each activity item", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "user",
        fieldPath: "longName",
      }),
      createMockChange({
        changeType: "user",
        fieldPath: "shortName",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    const ids = result.current.activityItems.map((item) => item.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("returns correct totalCount", async () => {
    mockPendingChanges.push(
      createMockChange({ fieldPath: "field1" }),
      createMockChange({ fieldPath: "field2" }),
      createMockChange({ fieldPath: "field3" }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    expect(result.current.totalCount).toBe(3);
  });

  it("builds correct key for channel changes", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "channel",
        channelIndex: 2,
        fieldPath: null,
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    const item = result.current.activityItems[0];
    expect(item.key.type).toBe("channel");
    if (item.key.type === "channel") {
      expect(item.key.index).toBe(2);
    }
  });

  it("builds correct key for config changes", async () => {
    mockPendingChanges.push(
      createMockChange({
        changeType: "config",
        variant: "device",
        fieldPath: "role",
      }),
    );

    const { useActivityChanges } = await import("./useActivityChanges.ts");
    const { result } = renderHook(() => useActivityChanges());

    const item = result.current.activityItems[0];
    expect(item.key.type).toBe("config");
    if (item.key.type === "config") {
      expect(item.key.variant).toBe("device");
    }
  });
});
