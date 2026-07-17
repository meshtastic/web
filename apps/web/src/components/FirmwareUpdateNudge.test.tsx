import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FirmwareUpdateNudge } from "./FirmwareUpdateNudge.tsx";

describe("FirmwareUpdateNudge", () => {
  it("uses the neutral system_update_alt affordance and names the Flasher destination", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <FirmwareUpdateNudge
        currentVersion="2.7.26"
        latestStableVersion="2.8.0"
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText("Firmware update available")).toBeVisible();
    expect(
      screen.getByText(
        "2.7.26 is behind stable 2.8.0. Use Meshtastic Flasher to update this hardware.",
      ),
    ).toBeVisible();
    expect(
      container.querySelector('[data-icon="system_update_alt"]'),
    ).toBeTruthy();
    expect(container.innerHTML).not.toContain("exclamation");
    expect(container.innerHTML).not.toContain("red-");
    expect(container.innerHTML).not.toContain("amber-");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Meshtastic Flasher to update this hardware",
      }),
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
