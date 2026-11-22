import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Security } from "./Security.tsx";

const baseSecurity = create(Protobuf.Config.Config_SecurityConfigSchema, {
  privateKey: new Uint8Array(32),
  publicKey: new Uint8Array(32),
  adminChannelEnabled: true,
});
let security = baseSecurity;
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

vi.mock("@core/kmp/hooks", () => ({
  useConfigEditor: () => ({
    radio: { value: {} },
    setRadioSection: vi.fn(),
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

describe("Security", () => {
  beforeEach(() => {
    metadata = { hasXeddsa: true };
    security = baseSecurity;
  });

  it("orders the groups as Android does, without the legacy admin channel", () => {
    render(<Security onFormInit={vi.fn()} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Packet authenticity",
      "Keys",
      "Remote admin",
      "Access",
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

  it("shows the public key and masks the private key until asked", () => {
    render(<Security onFormInit={vi.fn()} />);
    const zeroKey = "A".repeat(43) + "=";
    expect(
      screen.getByRole("group", { name: "Public Key" }).textContent,
    ).toContain(zeroKey);
    const privateRow = screen.getByRole("group", { name: "Private Key" });
    expect(privateRow.textContent).not.toContain(zeroKey);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(
      screen.getByRole("group", { name: "Private Key" }).textContent,
    ).toContain(zeroKey);
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("asks before regenerating the key pair", () => {
    render(<Security onFormInit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(
      screen.getByRole("dialog", { name: "Regenerate Key Pair" }),
    ).toBeInTheDocument();
  });

  it("adds an admin key in the first free slot", () => {
    render(<Security onFormInit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add key" }));
    const input = screen.getByRole("textbox", { name: "New admin key" });
    fireEvent.change(input, { target: { value: "B".repeat(43) + "=" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.getByRole("group", { name: "Admin key 1" }).textContent,
    ).toContain("B".repeat(43));
    expect(
      screen.getByRole("button", { name: "Remove admin key 1" }),
    ).toBeInTheDocument();
  });

  it("asks before removing an admin key", () => {
    security = create(Protobuf.Config.Config_SecurityConfigSchema, {
      ...baseSecurity,
      adminKey: [new Uint8Array(32).fill(7)],
    });
    render(<Security onFormInit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove admin key 1" }));
    const dialog = screen.getByRole("dialog", { name: "Remove admin key 1?" });
    expect(dialog).toHaveTextContent("will no longer be able to change");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(screen.queryByRole("group", { name: "Admin key 1" })).toBeNull();
  });

  it("warns that managed mode needs the last admin key", () => {
    security = create(Protobuf.Config.Config_SecurityConfigSchema, {
      ...baseSecurity,
      isManaged: true,
      adminKey: [new Uint8Array(32).fill(7)],
    });
    render(<Security onFormInit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove admin key 1" }));
    expect(
      screen.getByRole("dialog", { name: "Remove admin key 1?" }),
    ).toHaveTextContent("Managed mode is on and this is the last admin key.");
  });
});
