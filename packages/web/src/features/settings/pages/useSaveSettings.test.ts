import { useToast } from "@shared/hooks/useToast.ts";
import { useDevice } from "@state/index.ts";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";
import { useSettingsSave } from "../hooks/useSaveSettings.ts";

// Mock dependencies
vi.mock("@state/index.ts", () => ({
  useDevice: vi.fn(),
}));

vi.mock("../services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

vi.mock("@core/hooks/useToast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@core/services/adminCommands", () => ({
  adminCommands: {
    sendQueuedMessages: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("useSettingsSave", () => {
  const mockClearAllChangesDevice = vi.fn();
  const mockClearAllChangesRegistry = vi.fn();
  const mockToast = vi.fn();
  const mockSetConfig = vi.fn().mockResolvedValue(undefined);
  const mockConnection = {
    setChannel: vi.fn().mockResolvedValue(undefined),
    setConfig: mockSetConfig,
    setModuleConfig: vi.fn().mockResolvedValue(undefined),
    commitEditSettings: vi.fn().mockResolvedValue(undefined),
    sendPacket: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useDevice as any).mockReturnValue({
      getAllConfigChanges: vi.fn().mockReturnValue([]),
      getAllModuleConfigChanges: vi.fn().mockReturnValue([]),
      getAllChannelChanges: vi.fn().mockReturnValue([]),
      getAllQueuedAdminMessages: vi.fn().mockReturnValue([]),
      connection: mockConnection,
      clearAllChanges: mockClearAllChangesDevice,
      setConfig: vi.fn(),
      setModuleConfig: vi.fn(),
      addChannel: vi.fn(),
      getConfigChangeCount: vi.fn().mockReturnValue(0),
      getModuleConfigChangeCount: vi.fn().mockReturnValue(0),
      getChannelChangeCount: vi.fn().mockReturnValue(0),
      getAdminMessageChangeCount: vi.fn().mockReturnValue(0),
    });

    (useFieldRegistry as any).mockReturnValue({
      clearAllChanges: mockClearAllChangesRegistry,
    });

    (useToast as any).mockReturnValue({
      toast: mockToast,
    });
  });

  it("handleReset should clear changes in both device store and field registry", () => {
    const { result } = renderHook(() => useSettingsSave());

    act(() => {
      result.current.handleReset();
    });

    expect(mockClearAllChangesDevice).toHaveBeenCalledTimes(1);
    expect(mockClearAllChangesRegistry).toHaveBeenCalledTimes(1);
  });

  it("handleSave should clear changes in both stores after successful save", async () => {
    // Setup some mock changes so save proceeds
    (useDevice as any).mockReturnValue({
      getAllConfigChanges: vi
        .fn()
        .mockReturnValue([{ payloadVariant: { case: "device" } }]),
      getAllModuleConfigChanges: vi.fn().mockReturnValue([]),
      getAllChannelChanges: vi.fn().mockReturnValue([]),
      getAllQueuedAdminMessages: vi.fn().mockReturnValue([]),
      connection: mockConnection,
      clearAllChanges: mockClearAllChangesDevice,
      setConfig: vi.fn(),
      setModuleConfig: vi.fn(),
      addChannel: vi.fn(),
      getConfigChangeCount: vi.fn().mockReturnValue(1),
      getModuleConfigChangeCount: vi.fn().mockReturnValue(0),
      getChannelChangeCount: vi.fn().mockReturnValue(0),
      getAdminMessageChangeCount: vi.fn().mockReturnValue(0),
    });

    const { result } = renderHook(() => useSettingsSave());

    await act(async () => {
      await result.current.handleSave();
    });

    // Debugging: Check calls to toast to see if error occurred
    const toastCalls = mockToast.mock.calls.map((c) => c[0].title);
    if (toastCalls.includes("Error saving configuration")) {
      console.error("Caught error in handleSave:", mockToast.mock.calls);
    }

    expect(mockSetConfig).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error saving configuration" }),
    );
    expect(mockClearAllChangesDevice).toHaveBeenCalledTimes(1);
    expect(mockClearAllChangesRegistry).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "All changes saved" }),
    );
  });

  it("hasPending should reflect changes from device store", () => {
    (useDevice as any).mockReturnValue({
      getAllConfigChanges: vi.fn().mockReturnValue([]),
      getAllModuleConfigChanges: vi.fn().mockReturnValue([]),
      getAllChannelChanges: vi.fn().mockReturnValue([]),
      getAllQueuedAdminMessages: vi.fn().mockReturnValue([]),
      connection: mockConnection,
      clearAllChanges: mockClearAllChangesDevice,
      setConfig: vi.fn(),
      setModuleConfig: vi.fn(),
      addChannel: vi.fn(),
      getConfigChangeCount: vi.fn().mockReturnValue(1), // 1 change
      getModuleConfigChangeCount: vi.fn().mockReturnValue(0),
      getChannelChangeCount: vi.fn().mockReturnValue(0),
      getAdminMessageChangeCount: vi.fn().mockReturnValue(0),
    });

    const { result } = renderHook(() => useSettingsSave());
    expect(result.current.hasPending).toBe(true);
  });
});
