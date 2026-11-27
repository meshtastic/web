import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Firmware } from "./Firmware.tsx";
import type { RadioInfo } from "./radioInfo.ts";

const radio = vi.hoisted(() => ({ current: {} as RadioInfo }));

vi.mock("./radioInfo.ts", () => ({
  useRadioInfo: () => radio.current,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));

const flasherLink = () => screen.getByRole("link", { name: /Open flasher/ });

describe("Firmware", () => {
  beforeEach(() => {
    radio.current = {};
  });

  it("opens the flasher with the connected radio's hardware selected", () => {
    radio.current = {
      firmware: "2.8.2.1a2b3c4",
      hardware: "HELTEC_V4",
      hwModel: 110,
    };
    render(<Firmware onFormInit={vi.fn()} />);
    expect(flasherLink()).toHaveAttribute(
      "href",
      "https://flasher.meshtastic.org/?hwModel=110",
    );
    expect(
      screen.getByText(/selects this radio's hardware when it can/),
    ).toBeVisible();
  });

  it("opens the plain flasher when the hardware is not reported", () => {
    render(<Firmware onFormInit={vi.fn()} />);
    expect(flasherLink()).toHaveAttribute(
      "href",
      "https://flasher.meshtastic.org",
    );
    expect(
      screen.getByText("Opens flasher.meshtastic.org in a new tab."),
    ).toBeVisible();
  });
});
