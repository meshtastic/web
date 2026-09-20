import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirmwareUpdateReminder } from "./FirmwareUpdateReminder.tsx";

const { mockUseDevice } = vi.hoisted(() => ({ mockUseDevice: vi.fn() }));
const mockFetch = vi.fn();

vi.mock("@core/stores", () => ({ useDevice: mockUseDevice }));

describe("FirmwareUpdateReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            releases: {
              stable: [
                {
                  id: "v2.8.0",
                  zip_url: "https://example.test/firmware-2.8.0.json",
                },
              ],
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ targets: [{ board: "tbeam-s3-core" }] }),
      });
    mockUseDevice.mockReturnValue({
      status: 7,
      myNodeNum: 4660,
      hardware: { pioEnv: "tbeam-s3-core" },
      metadata: new Map([
        [
          0,
          {
            firmwareVersion: "2.7.26.54e0d8d",
          },
        ],
      ]),
    });
  });

  it("shows a dedicated nudge only while the actual device lifecycle is configured", async () => {
    const { rerender } = render(<FirmwareUpdateReminder />);

    await waitFor(() => {
      expect(screen.getByText("Firmware update available")).toBeVisible();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    mockUseDevice.mockReturnValue({
      status: 2,
      myNodeNum: 4660,
      hardware: { pioEnv: "tbeam-s3-core" },
      metadata: new Map(),
    });
    rerender(<FirmwareUpdateReminder />);

    await waitFor(() => {
      expect(screen.queryByText("Firmware update available")).toBeNull();
    });
  });
});
