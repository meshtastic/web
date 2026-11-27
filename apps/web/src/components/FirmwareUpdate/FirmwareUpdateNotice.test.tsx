import type { FirmwareUpdateNudge } from "@core/firmware/useFirmwareUpdateNotice.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FirmwareUpdateNotice } from "./FirmwareUpdateNotice.tsx";

const nudge: FirmwareUpdateNudge = {
  notice: {
    notificationKey: "firmware-update-notified:!1234abcd:heltec-v4:2.7.26",
    currentVersion: "2.7.15",
    stableVersion: "2.7.26",
    hardwareTarget: "heltec-v4",
    destination: "meshtasticFlasher",
  },
  flasherUrl: "https://flasher.meshtastic.org/?hwModel=110",
};

describe("FirmwareUpdateNotice", () => {
  it("states both versions and the next step", () => {
    render(<FirmwareUpdateNotice nudge={nudge} />);
    const notice = screen.getByTestId("firmware-update-notice");
    expect(notice).toHaveTextContent("Firmware update available");
    expect(notice).toHaveTextContent(
      "2.7.15 is installed. Stable 2.7.26 is available. Open Meshtastic Flasher to update this hardware.",
    );
  });

  it("opens Meshtastic Flasher for this hardware in a new tab, and says so", () => {
    render(<FirmwareUpdateNotice nudge={nudge} />);
    const link = screen.getByRole("link", { name: /Open Meshtastic Flasher/ });
    expect(link).toHaveAttribute(
      "href",
      "https://flasher.meshtastic.org/?hwModel=110",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleDescription(
      "Opens Meshtastic Flasher in a new tab to update this radio to stable 2.7.26.",
    );
  });

  it("is an update suggestion, not a warning", () => {
    render(<FirmwareUpdateNotice nudge={nudge} />);
    const notice = screen.getByTestId("firmware-update-notice");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(notice).not.toHaveAttribute("aria-live");
    expect(notice.className).not.toMatch(/warning|danger/);
    expect(notice.querySelector(".lucide-monitor-down")).not.toBeNull();
    expect(notice.querySelector(".lucide-triangle-alert")).toBeNull();
    // Nothing to dismiss: it clears when the radio is current.
    expect(screen.queryByRole("button")).toBeNull();
  });
});
