import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Power } from "./Power.tsx";

let power: Protobuf.Config.Config_PowerConfig;

vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { power },
    getEffectiveConfig: () => power,
  }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({
    radio: { value: {} },
    setRadioSection: vi.fn(),
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

const renderPower = (adcMultiplierOverride: number) => {
  power = create(Protobuf.Config.Config_PowerConfigSchema, {
    adcMultiplierOverride,
  });
  render(<Power onFormInit={vi.fn()} />);
};

describe("Power ADC multiplier override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the ratio while the override is off", () => {
    renderPower(0);
    expect(
      screen.getByRole("switch", { name: "ADC multiplier override" }),
    ).not.toBeChecked();
    expect(screen.queryByLabelText("ADC Override")).toBeNull();
  });

  it("shows the ratio while the override is on", () => {
    renderPower(2.5);
    expect(
      screen.getByRole("switch", { name: "ADC multiplier override" }),
    ).toBeChecked();
    expect(screen.getByLabelText("ADC Override")).toHaveValue(2.5);
  });

  it("starts from a ratio of 1 when switched on", async () => {
    renderPower(0);
    fireEvent.click(
      screen.getByRole("switch", { name: "ADC multiplier override" }),
    );
    expect(await screen.findByLabelText("ADC Override")).toHaveValue(1);
  });
});
