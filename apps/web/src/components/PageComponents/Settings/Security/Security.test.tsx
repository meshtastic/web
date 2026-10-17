import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Security } from "./Security.tsx";

const security = create(Protobuf.Config.Config_SecurityConfigSchema, {
  privateKey: new Uint8Array(32),
  publicKey: new Uint8Array(32),
  adminChannelEnabled: true,
});
let metadata: { hasXeddsa: boolean } | undefined;

vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { security },
    getEffectiveConfig: () => security,
  }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({ metadata }),
}));

vi.mock("@core/hooks/useLockdown.ts", () => ({
  useLockdown: () => ({ client: undefined, status: undefined }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({
    radio: { value: {} },
    setRadioSection: vi.fn(),
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

describe("Security", () => {
  beforeEach(() => {
    metadata = { hasXeddsa: true };
  });

  it("orders the groups as Android does, without the legacy admin channel", () => {
    render(<Security onFormInit={vi.fn()} />);
    const headings = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Packet authenticity",
      "Direct Message Key",
      "Admin Keys",
      "Logs",
      "Administration",
    ]);
    expect(screen.queryByText("Legacy Admin channel")).toBeNull();
  });

  it("enables the protection level when the radio reports XEdDSA", () => {
    render(<Security onFormInit={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Protection level" }),
    ).toBeEnabled();
  });

  it("disables it when the radio does not support it", () => {
    metadata = { hasXeddsa: false };
    render(<Security onFormInit={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Protection level" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "This device does not support packet signature verification.",
      ),
    ).toBeInTheDocument();
  });

  it("disables it until the radio's metadata arrives", () => {
    metadata = undefined;
    render(<Security onFormInit={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Protection level" }),
    ).toBeDisabled();
  });
});
