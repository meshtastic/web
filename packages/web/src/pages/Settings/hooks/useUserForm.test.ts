import { useFieldRegistry } from "@core/services/fieldRegistry";
import { useDevice, useDeviceContext } from "@core/stores";
import { useNodes } from "@db/hooks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserForm } from "./useUserForm.ts";

vi.mock("@core/stores", () => ({
  useDevice: vi.fn(),
  useDeviceContext: vi.fn(),
}));

vi.mock("@db/hooks", () => ({
  useNodes: vi.fn(),
}));

vi.mock("@core/services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

vi.mock("@app/validation/config/user", () => ({
  UserValidationSchema: {
    parse: vi.fn(),
    safeParse: vi.fn().mockReturnValue({ success: true }),
  },
}));

// Mock protobuf
vi.mock("@bufbuild/protobuf", () => ({
  create: vi.fn((_schema, data) => data),
}));
vi.mock("@meshtastic/core", () => ({
  Protobuf: { Mesh: { UserSchema: {} } },
}));

describe("useUserForm", () => {
  const mockSetChange = vi.fn();
  const mockTrackChange = vi.fn();
  const mockRemoveChange = vi.fn();
  const mockSetOwner = vi.fn();

  const myNodeNum = 123;
  const mockNodes = [
    {
      nodeNum: myNodeNum,
      longName: "Long",
      shortName: "Short",
      isLicensed: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useDeviceContext as vi.Mock).mockReturnValue({ deviceId: 1 });
    (useNodes as vi.Mock).mockReturnValue({ nodes: mockNodes });
    (useDevice as vi.Mock).mockReturnValue({
      hardware: { myNodeNum },
      connection: { setOwner: mockSetOwner },
      setChange: mockSetChange,
    });
    (useFieldRegistry as vi.Mock).mockReturnValue({
      trackChange: mockTrackChange,
      removeChange: mockRemoveChange,
    });
  });

  it("should initialize with user data from node", () => {
    const { result } = renderHook(() => useUserForm());
    expect(result.current.isReady).toBe(true);
    expect(result.current.form.getValues("longName")).toBe("Long");
  });

  it("should track changes", async () => {
    const { result } = renderHook(() => useUserForm());

    await act(async () => {
      result.current.form.setValue("longName", "New Name");
    });

    await waitFor(() => {
      expect(mockTrackChange).toHaveBeenCalledWith(
        expect.anything(),
        "longName",
        "New Name",
        "Long",
      );
      expect(mockSetChange).toHaveBeenCalled();
    });
  });

  it("should send to device", () => {
    const { result } = renderHook(() => useUserForm());

    act(() => {
      result.current.sendToDevice();
    });

    expect(mockSetOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        longName: "Long",
        shortName: "Short",
      }),
    );
  });
});
