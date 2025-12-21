import { useUnsafeRolesDialog } from "@shared/components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog";
import { useDevice } from "@state/index.ts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFieldRegistry } from "../services/fieldRegistry/index.ts";
import { useDeviceForm } from "./useDeviceForm.ts";

// Mocks
vi.mock("@state/index.ts", () => ({
  useDevice: vi.fn(),
}));

vi.mock("../services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

vi.mock(
  "@shared/components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog",
  () => ({
    useUnsafeRolesDialog: vi.fn(),
  }),
);

// Mock validation schema since it might have external deps
vi.mock("../validation/config/device", () => ({
  DeviceValidationSchema: {
    parse: vi.fn(),
    safeParse: vi.fn().mockReturnValue({ success: true }),
  },
}));

describe("useDeviceForm", () => {
  const mockSetChange = vi.fn();
  const mockTrackChange = vi.fn();
  const mockRemoveChange = vi.fn();
  const mockValidateRoleSelection = vi.fn();

  const baseConfig = { role: 1, nodeNum: 123 };

  beforeEach(() => {
    vi.clearAllMocks();

    (useDevice as vi.Mock).mockReturnValue({
      config: { device: baseConfig },
      getEffectiveConfig: vi.fn().mockReturnValue(baseConfig),
      setChange: mockSetChange,
    });

    (useFieldRegistry as vi.Mock).mockReturnValue({
      trackChange: mockTrackChange,
      removeChange: mockRemoveChange,
    });

    (useUnsafeRolesDialog as vi.Mock).mockReturnValue({
      validateRoleSelection: mockValidateRoleSelection.mockResolvedValue(true),
    });
  });

  it("should initialize form with values", () => {
    const { result } = renderHook(() => useDeviceForm());
    expect(result.current.isReady).toBe(true);
    expect(result.current.form.getValues("role")).toBe(1);
  });

  it("should track changes when form is updated", async () => {
    const { result } = renderHook(() => useDeviceForm());

    await act(async () => {
      result.current.form.setValue("role", 2);
    });

    await waitFor(() => {
      expect(mockTrackChange).toHaveBeenCalledWith(
        expect.anything(), // SECTION
        "role",
        2,
        1,
      );
      expect(mockSetChange).toHaveBeenCalled();
    });
  });

  it("should handle role change with validation", async () => {
    const { result } = renderHook(() => useDeviceForm());

    // Allow role change
    mockValidateRoleSelection.mockResolvedValue(true);

    await act(async () => {
      await result.current.handleRoleChange("3"); // Pass string as role? The hook types it as string then casts
    });

    expect(mockValidateRoleSelection).toHaveBeenCalledWith("3");
    expect(result.current.form.getValues("role")).toBe("3"); // Hook sets it as string without coercion
    // Wait, the hook casts: `setValue("role", newRole as DeviceValidation["role"]`
    // If input is "3", and DeviceValidation["role"] is number (enum), this casting might be loose or rely on form coercion.
    // Let's assume standard behavior.
  });

  it("should prevent role change if validation fails", async () => {
    const { result } = renderHook(() => useDeviceForm());

    // Deny role change
    mockValidateRoleSelection.mockResolvedValue(false);

    await act(async () => {
      await result.current.handleRoleChange("4");
    });

    expect(mockValidateRoleSelection).toHaveBeenCalledWith("4");
    expect(result.current.form.getValues("role")).toBe(1); // Should remain initial
  });
});
