import { create } from "@bufbuild/protobuf";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";
import { getX25519PublicKey } from "@core/utils/x25519.ts";
import { Protobuf } from "@core/protobuf.ts";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RemoteSettingsContext,
  type RemoteSettingsScope,
} from "@core/settings/remoteContext.ts";
import { SettingsReadOnlyContext } from "@components/Settings/SettingsReadOnly.tsx";
import { Security } from "./Security.tsx";

const baseSecurity = create(Protobuf.Config.Config_SecurityConfigSchema, {
  privateKey: new Uint8Array(32),
  publicKey: new Uint8Array(32),
  adminChannelEnabled: true,
});
let security = baseSecurity;
let metadata: { hasXeddsa: boolean } | undefined;

const MY_NUM = 1;
const keyOf = (fill: number) => new Uint8Array(32).fill(fill);
const node = (num: number, longName: string, publicKey?: Uint8Array) => ({
  num,
  user: { longName, shortName: "", publicKey: publicKey ?? new Uint8Array() },
  isKeyManuallyVerified: false,
});
let nodes: ReturnType<typeof node>[] = [];
const setRadioSection = vi.fn();

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useNodesAsProto: () => nodes,
  useMyNodeAsProto: () => nodes.find((n) => n.num === MY_NUM),
}));

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
    setRadioSection,
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

describe("Security", () => {
  beforeEach(() => {
    metadata = { hasXeddsa: true };
    security = baseSecurity;
    nodes = [];
    setRadioSection.mockClear();
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

  describe("choosing an admin key", () => {
    const addKey = () => {
      render(<Security onFormInit={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "+ Add key" }));
    };

    it("lists known radios with a key, not this radio or keys already added", () => {
      security = create(Protobuf.Config.Config_SecurityConfigSchema, {
        ...baseSecurity,
        adminKey: [keyOf(4)],
      });
      nodes = [
        node(MY_NUM, "This radio", keyOf(1)),
        node(2, "Base station", keyOf(2)),
        node(3, "No key"),
        node(4, "Already admin", keyOf(4)),
      ];
      addKey();
      fireEvent.click(screen.getByRole("button", { name: "Choose radio" }));
      const dialog = screen.getByRole("dialog", {
        name: "Choose a radio to manage this one",
      });
      expect(dialog).toHaveAccessibleDescription(
        /that radio can change this node’s settings remotely/,
      );
      expect(
        within(dialog).getByRole("button", { name: "Close" }),
      ).toBeInTheDocument();
      const rows = within(dialog)
        .getAllByRole("listitem")
        .map((row) => row.textContent);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain("Base station");
      expect(rows[0]).toContain("!00000002");
    });

    it("leaves out this radio's own key before its node info arrives", () => {
      security = create(Protobuf.Config.Config_SecurityConfigSchema, {
        ...baseSecurity,
        publicKey: keyOf(5),
      });
      nodes = [node(5, "Same key, unknown num", keyOf(5))];
      addKey();
      fireEvent.click(screen.getByRole("button", { name: "Choose radio" }));
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(
        screen.getByText("No other radios with a public key yet."),
      ).toBeInTheDocument();
    });

    it("fills the slot with the chosen radio's key", () => {
      nodes = [node(2, "Base station", keyOf(2))];
      addKey();
      fireEvent.click(screen.getByRole("button", { name: "Choose radio" }));
      fireEvent.click(screen.getByRole("button", { name: /Base station/ }));
      expect(
        screen.getByRole("group", { name: "Admin key 1" }).textContent,
      ).toContain(base64Encode(keyOf(2)));
    });

    it("generates a pair and adds only the public half once the private one is saved", async () => {
      addKey();
      fireEvent.click(screen.getByRole("button", { name: "Generate" }));
      const dialog = screen.getByRole("dialog", {
        name: "Generate admin key pair",
      });
      const privateKey =
        within(dialog)
          .getByRole("group", {
            name: "Private key for the managing radio",
          })
          .querySelector("code")?.textContent ?? "";
      expect(base64Decode(privateKey)).toHaveLength(32);

      const use = within(dialog).getByRole("button", { name: "Use this key" });
      expect(use).toBeDisabled();
      fireEvent.click(
        within(dialog).getByRole("checkbox", {
          name: "I’ve saved the private key",
        }),
      );
      fireEvent.click(use);

      const publicKey = base64Encode(
        getX25519PublicKey(base64Decode(privateKey)),
      );
      expect(
        screen.getByRole("group", { name: "Admin key 1" }).textContent,
      ).toContain(publicKey);
      expect(screen.queryByText(privateKey)).toBeNull();
      const staged = () =>
        JSON.stringify(setRadioSection.mock.calls, (_, value) =>
          value instanceof Uint8Array ? base64Encode(value) : value,
        );
      await waitFor(() => expect(staged()).toContain(publicKey));
      expect(staged()).not.toContain(privateKey);
    });
  });
});

describe("Security on a remote node", () => {
  const scope = { name: "IB North" } as unknown as RemoteSettingsScope;
  const renderRemote = () =>
    render(
      <RemoteSettingsContext.Provider value={scope}>
        <Security onFormInit={vi.fn()} />
      </RemoteSettingsContext.Provider>,
    );

  beforeEach(() => {
    metadata = { hasXeddsa: true };
    nodes = [];
    setRadioSection.mockClear();
  });

  describe("that shared its private key (firmware before 2.8.1)", () => {
    const nodeKey = keyOf(9);
    beforeEach(() => {
      security = create(Protobuf.Config.Config_SecurityConfigSchema, {
        privateKey: nodeKey,
        publicKey: keyOf(4),
      });
    });

    it("keeps the key as it is, with no way to show, edit or regenerate it", () => {
      renderRemote();
      expect(
        screen.getByText(
          "Kept as IB North sent it. The private key can’t be changed remotely.",
        ),
      ).toBeInTheDocument();
      for (const name of ["Show", "Edit", "Regenerate"]) {
        expect(screen.queryByRole("button", { name })).toBeNull();
      }
      expect(screen.queryByText(base64Encode(nodeKey))).toBeNull();
    });

    it("stages changes with the node's own key", async () => {
      renderRemote();
      fireEvent.click(screen.getByRole("switch", { name: "Serial console" }));
      await waitFor(() => expect(setRadioSection).toHaveBeenCalled());
      const [, staged] = setRadioSection.mock.calls.at(-1) ?? [];
      expect(staged.serialEnabled).toBe(true);
      expect(staged.privateKey).toEqual(nodeKey);
    });
  });

  describe("that withheld its private key (firmware 2.8.1+)", () => {
    beforeEach(() => {
      security = create(Protobuf.Config.Config_SecurityConfigSchema, {
        privateKey: new Uint8Array(0),
        publicKey: keyOf(4),
      });
    });

    it("is read-only and says why", () => {
      renderRemote();
      expect(
        screen.getByText(
          /can’t be changed remotely without replacing its identity/u,
        ),
      ).toBeInTheDocument();
      const serial = screen.getByRole("switch", { name: "Serial console" });
      expect(serial).toBeDisabled();
      fireEvent.click(serial);
      expect(setRadioSection).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Add admin key" }),
      ).toBeNull();
      expect(screen.getByRole("button", { name: "+ Add key" })).toBeDisabled();
    });
  });
});

describe("Security while settings are read-only", () => {
  beforeEach(() => {
    metadata = { hasXeddsa: true };
    security = baseSecurity;
    nodes = [];
  });

  it("disables the key actions, admin keys and managed mode", () => {
    render(
      <SettingsReadOnlyContext.Provider value>
        <Security onFormInit={vi.fn()} />
      </SettingsReadOnlyContext.Provider>,
    );
    for (const name of ["Regenerate", "Edit", "+ Add key"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("switch", { name: "Managed Mode" })).toBeDisabled();
    // Reading a key is not a change: the public key can still be copied.
    const publicKey = screen.getByRole("group", { name: "Public Key" });
    expect(
      within(publicKey).getByRole("button", { name: "Copy to clipboard" }),
    ).toBeEnabled();
  });
});
