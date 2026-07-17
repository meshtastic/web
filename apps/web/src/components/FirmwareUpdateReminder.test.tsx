import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirmwareUpdateReminder } from "./FirmwareUpdateReminder.tsx";

const mockToast = vi.fn();
const { mockUseDevice } = vi.hoisted(() => ({ mockUseDevice: vi.fn() }));

vi.mock("@core/stores", () => ({ useDevice: mockUseDevice }));
vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("FirmwareUpdateReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { tag_name: "v2.8.0", draft: false, prerelease: false },
          ]),
      }),
    );
    mockToast.mockReturnValue({ dismiss: vi.fn() });
    mockUseDevice.mockReturnValue({
      connectionPhase: "configured",
      myNodeNum: 4660,
      metadata: new Map([
        [
          0,
          {
            firmwareVersion: "2.7.26.54e0d8d",
            hwModel: 12,
          },
        ],
      ]),
    });
  });

  it("checks the connected local node and creates a persistent update nudge", async () => {
    render(<FirmwareUpdateReminder />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Firmware update available",
          duration: Number.POSITIVE_INFINITY,
          dismissible: false,
        }),
      );
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
