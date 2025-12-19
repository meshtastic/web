import { makeChannelSchema } from "@app/validation/channel";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChannelForm } from "./useChannelForm.ts";

// Mocks
vi.mock("@core/services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

vi.mock("@app/validation/channel", () => ({
  makeChannelSchema: vi.fn(),
  ChannelValidation: {}, // Type
}));

// Mock resolver
vi.mock("@components/Form/createZodResolver", () => ({
  createZodResolver: vi.fn(() => async (data: any) => ({
    values: data,
    errors: {},
  })),
}));

// Mock crypto
vi.mock("crypto-random-string", () => ({
  default: vi.fn(() => "randomstring"),
}));

describe("useChannelForm", () => {
  const mockTrackChange = vi.fn();
  const mockRemoveChange = vi.fn();
  const mockGetChange = vi.fn();

  const mockChannel: any = {
    deviceId: 123,
    channelIndex: 0,
    role: 1,
    name: "Channel 0",
    psk: "base64psk",
    uplinkEnabled: true,
    downlinkEnabled: true,
    positionPrecision: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useFieldRegistry as vi.Mock).mockReturnValue({
      trackChange: mockTrackChange,
      removeChange: mockRemoveChange,
      getChange: mockGetChange,
    });
    (makeChannelSchema as vi.Mock).mockReturnValue({});
  });

  it("should initialize form with channel data", () => {
    const { result } = renderHook(() =>
      useChannelForm({ channel: mockChannel }),
    );
    expect(result.current.isReady).toBe(true);
    expect(result.current.form.getValues("settings.name")).toBe("Channel 0");
  });

  it("should track changes when form is updated", async () => {
    const { result } = renderHook(() =>
      useChannelForm({ channel: mockChannel }),
    );

    await act(async () => {
      result.current.form.setValue("settings.name", "New Name");
    });

    await waitFor(() => {
      expect(mockTrackChange).toHaveBeenCalledWith(
        expect.anything(), // section
        `channel_${mockChannel.channelIndex}`, // fieldName
        expect.objectContaining({ name: "New Name" }), // new value (DB channel object)
        mockChannel, // original value
      );
    });
  });

  it("should regenerate PSK", async () => {
    const { result } = renderHook(() =>
      useChannelForm({ channel: mockChannel }),
    );

    await act(async () => {
      await result.current.regeneratePsk();
    });

    const newPsk = result.current.form.getValues("settings.psk");
    expect(newPsk).toBe(btoa("randomstring"));
  });

  it("should handle byte count change", async () => {
    const { result } = renderHook(() =>
      useChannelForm({ channel: mockChannel }),
    );

    act(() => {
      result.current.handleByteCountChange("32");
    });

    expect(result.current.byteCount).toBe(32);
  });
});
