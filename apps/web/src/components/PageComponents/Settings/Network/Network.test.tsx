import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Network } from "./index.tsx";

const UDP = Protobuf.Config.Config_NetworkConfig_ProtocolFlags.UDP_BROADCAST;

let network: Protobuf.Config.Config_NetworkConfig;
let metadata: { hasEthernet: boolean } | undefined;
const setRadioSection = vi.fn();

vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { network },
    getEffectiveConfig: () => network,
  }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({ metadata }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({ radio: { value: {} }, setRadioSection }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

const renderNetwork = (enabledProtocols = 0) => {
  network = create(Protobuf.Config.Config_NetworkConfigSchema, {
    enabledProtocols,
    ipv4Config: create(Protobuf.Config.Config_NetworkConfig_IpV4ConfigSchema),
  });
  render(<Network onFormInit={vi.fn()} />);
};

describe("Network", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metadata = { hasEthernet: true };
  });

  it("shows Ethernet only when the radio has it or is not known yet", () => {
    renderNetwork();
    expect(screen.getByText("Ethernet Options")).toBeInTheDocument();
  });

  it("hides Ethernet when the radio has none", () => {
    metadata = { hasEthernet: false };
    renderNetwork();
    expect(screen.queryByText("Ethernet Options")).toBeNull();
  });

  it("shows Ethernet before the radio's metadata arrives", () => {
    metadata = undefined;
    renderNetwork();
    expect(screen.getByText("Ethernet Options")).toBeInTheDocument();
  });

  it("switches the UDP_BROADCAST bit, keeping the other bits", async () => {
    renderNetwork(0b100 | UDP);
    const udp = screen.getByRole("switch", { name: "UDP broadcasting" });
    expect(udp).toBeChecked();
    fireEvent.click(udp);
    await waitFor(() => expect(setRadioSection).toHaveBeenCalled());
    const [, staged] = setRadioSection.mock.lastCall ?? [];
    expect(staged.enabledProtocols).toBe(0b100);
    expect(staged).not.toHaveProperty("udpBroadcast");
  });
});
