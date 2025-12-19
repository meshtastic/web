import { useFieldRegistry } from "../services/fieldRegistry";
import { useDevice } from "@core/stores";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { useModuleConfigForm } from "./useModuleConfigForm.ts";

vi.mock("@core/stores", () => ({
  useDevice: vi.fn(),
}));

vi.mock("../services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

// Mock resolver
vi.mock("../components/form/createZodResolver", () => ({
  createZodResolver: vi.fn(() => async (data: any) => ({
    values: data,
    errors: {},
  })),
}));

describe("useModuleConfigForm", () => {
  const mockSetChange = vi.fn();
  const mockTrackChange = vi.fn();
  const mockRemoveChange = vi.fn();

  const mockMqttConfig = { enabled: true, address: "mqtt://test" };
  const schema = z.object({ enabled: z.boolean(), address: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();

    (useDevice as vi.Mock).mockReturnValue({
      moduleConfig: { mqtt: mockMqttConfig },
      getEffectiveModuleConfig: vi.fn().mockReturnValue(mockMqttConfig),
      setChange: mockSetChange,
    });

    (useFieldRegistry as vi.Mock).mockReturnValue({
      trackChange: mockTrackChange,
      removeChange: mockRemoveChange,
    });
  });

  it("should initialize form", () => {
    const { result } = renderHook(() =>
      useModuleConfigForm({
        moduleConfigType: "mqtt",
        schema,
      }),
    );
    expect(result.current.isReady).toBe(true);
    expect(result.current.form.getValues("enabled")).toBe(true);
  });

  it("should track changes", async () => {
    const { result } = renderHook(() =>
      useModuleConfigForm({
        moduleConfigType: "mqtt",
        schema,
      }),
    );

    await act(async () => {
      result.current.form.setValue("enabled", false);
    });

    await waitFor(() => {
      expect(mockTrackChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: "moduleConfig", variant: "mqtt" }),
        "enabled",
        false,
        true,
      );
      expect(mockSetChange).toHaveBeenCalled();
    });
  });
});
