import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoRa } from "./LoRa.tsx";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Hw = Protobuf.Mesh.HardwareModel;

let lora: Protobuf.Config.Config_LoRaConfig;
let firmwareVersion: string;
let hwModel: Protobuf.Mesh.HardwareModel | undefined;

vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { lora },
    getEffectiveConfig: () => lora,
  }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({
    metadata: { firmwareVersion },
    regionPresets: undefined,
    supportsFirmware28: false,
    excludedModules: 0,
  }),
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () =>
    hwModel === undefined ? undefined : { user: { hwModel } },
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({
    radio: { value: {} },
    setRadioSection: vi.fn(),
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

const renderLoRa = (fields: { usePreset?: boolean; codingRate?: number }) => {
  lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
    usePreset: true,
    modemPreset: Preset.LONG_FAST,
    hopLimit: 3,
    ...fields,
  });
  render(<LoRa onFormInit={vi.fn()} />);
};

describe("LoRa", () => {
  beforeEach(() => {
    firmwareVersion = "2.7.18";
    hwModel = Hw.HELTEC_V3;
  });

  it("offers a coding rate override on a preset from firmware 2.7.18", () => {
    renderLoRa({ codingRate: 7 });
    expect(screen.getByText("Coding Rate Override")).toBeInTheDocument();
    expect(screen.getByText("Hop Limit")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Coding Rate Override" }),
    ).toHaveTextContent("4/7");
    // The manual modem settings only show with presets off.
    expect(screen.queryByText("Spreading Factor")).toBeNull();
  });

  it("shows a rate the preset already uses as the preset default", () => {
    renderLoRa({ codingRate: 5 });
    expect(
      screen.getByRole("combobox", { name: "Coding Rate Override" }),
    ).toHaveTextContent("Preset default (4/5)");
  });

  it("has no coding rate override before firmware 2.7.18", () => {
    firmwareVersion = "2.7.17";
    renderLoRa({});
    expect(screen.queryByText("Coding Rate Override")).toBeNull();
  });

  it("has no coding rate override with manual modem settings", () => {
    renderLoRa({ usePreset: false });
    expect(screen.queryByText("Coding Rate Override")).toBeNull();
    expect(screen.queryByText("Presets")).toBeNull();
    expect(screen.getByText("Coding Rate")).toBeInTheDocument();
  });

  it("no longer shows Frequency Offset, FEM/LNA Mode or Serial HAL Only", () => {
    renderLoRa({});
    expect(screen.queryByText("Frequency Offset")).toBeNull();
    expect(screen.queryByText("FEM/LNA Mode")).toBeNull();
    expect(screen.queryByText("Serial HAL Only")).toBeNull();
  });

  it("shows PA Fan Disabled only for boards with a PA fan", () => {
    renderLoRa({});
    expect(screen.queryByText("PA Fan Disabled")).toBeNull();
  });

  it("shows PA Fan Disabled for a PA fan board", () => {
    hwModel = Hw.RADIOMASTER_900_BANDIT;
    renderLoRa({});
    expect(screen.getByText("PA Fan Disabled")).toBeInTheDocument();
  });
});
