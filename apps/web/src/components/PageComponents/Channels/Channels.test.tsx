import { create } from "@bufbuild/protobuf";
import { constantSignal } from "@core/kmp/signals.ts";
import { Protobuf } from "@core/protobuf.ts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsReadOnlyContext } from "@components/Settings/SettingsReadOnly.tsx";
import { Channels } from "./Channels.tsx";

const Role = Protobuf.Channel.Channel_Role;

const env = vi.hoisted(() => ({
  setChannel: vi.fn(),
  setDialogOpen: vi.fn(),
}));

const primary = create(Protobuf.Channel.ChannelSchema, {
  index: 0,
  role: Role.PRIMARY,
  settings: create(Protobuf.Channel.ChannelSettingsSchema, {
    name: "",
    psk: new Uint8Array([1]),
  }),
});
const friends = create(Protobuf.Channel.ChannelSchema, {
  index: 1,
  role: Role.SECONDARY,
  settings: create(Protobuf.Channel.ChannelSettingsSchema, {
    name: "Friends",
    psk: new Uint8Array(16).fill(3),
    useAead: true,
    id: 42,
    moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
      positionPrecision: 32,
      isMuted: true,
    }),
  }),
});
// Slot 3 was added this session (not on the radio) and has the default key.
const added = create(Protobuf.Channel.ChannelSchema, {
  index: 3,
  role: Role.SECONDARY,
  settings: create(Protobuf.Channel.ChannelSettingsSchema, {
    psk: new Uint8Array([1]),
  }),
});
const onRadio = [primary, friends];
const channels = new Map([
  [0, primary],
  [1, friends],
  [3, added],
]);

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    setDialogOpen: env.setDialogOpen,
    config: { lora: undefined, display: { units: 0 } },
  }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({ metadata: { firmwareVersion: "2.7.0" } }),
}));

vi.mock("@core/kmp/hooks", () => ({
  useChannels: () => onRadio,
  useConfigEditor: () => ({
    channels: constantSignal(channels),
    dirtyChannels: constantSignal([]),
    radio: constantSignal({}),
    setChannel: env.setChannel,
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

vi.mock("./BeaconOffers.tsx", () => ({ BeaconOffers: () => null }));
vi.mock("react-qrcode-logo", () => ({
  QRCode: ({ value }: { value: string }) => <canvas data-value={value} />,
}));

function lastStaged(): Protobuf.Channel.Channel | undefined {
  return env.setChannel.mock.lastCall?.[0];
}

describe("Channels", () => {
  beforeEach(() => {
    env.setChannel.mockClear();
    env.setDialogOpen.mockClear();
  });

  const renderPage = () => render(<Channels onFormInit={vi.fn()} />);
  const openSlot = (name: RegExp) =>
    fireEvent.click(
      within(screen.getByRole("list", { name: "Channel slots" })).getByRole(
        "button",
        { name },
      ),
    );

  it("lists all eight slots with role and key type", () => {
    renderPage();
    const list = screen.getByRole("list", { name: "Channel slots" });
    expect(within(list).getAllByRole("button")).toHaveLength(8);
    expect(
      within(list).getByRole("button", {
        name: /Friends.*Secondary · AES-128/,
      }),
    ).toBeInTheDocument();
    expect(
      within(list).getAllByRole("button", { name: /Empty.*Disabled/ }),
    ).toHaveLength(5);
  });

  it("stages a rename and keeps the fields the editor doesn't show", () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Family" },
    });
    const staged = lastStaged();
    expect(staged?.settings?.name).toBe("Family");
    expect(staged?.settings?.useAead).toBe(true);
    expect(staged?.settings?.id).toBe(42);
    expect(staged?.settings?.moduleSettings?.isMuted).toBe(true);
    expect(staged?.settings?.psk).toEqual(new Uint8Array(16).fill(3));
  });

  it("does not stage a name longer than 11 bytes", () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "a".repeat(12) },
    });
    expect(env.setChannel).not.toHaveBeenCalled();
  });

  it("offers only Primary for slot 0", () => {
    renderPage();
    const role = screen.getByRole("radiogroup", { name: "Role" });
    expect(within(role).getAllByRole("radio")).toHaveLength(1);
  });

  it("disables a secondary channel from its role", () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.click(screen.getByRole("radio", { name: "Disabled" }));
    expect(lastStaged()?.role).toBe(Role.DISABLED);
    expect(lastStaged()?.index).toBe(1);
  });

  it("adds a channel with a fresh 256 bit key in an empty slot", () => {
    renderPage();
    openSlot(/^2/);
    fireEvent.click(screen.getByRole("radio", { name: "Secondary" }));
    expect(lastStaged()?.role).toBe(Role.SECONDARY);
    expect(lastStaged()?.index).toBe(2);
    expect(lastStaged()?.settings?.psk.length).toBe(32);
  });

  it("generates a new key of the same length", () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.click(screen.getByRole("button", { name: "Generate new" }));
    const psk = lastStaged()?.settings?.psk;
    expect(psk?.length).toBe(16);
    expect(psk).not.toEqual(new Uint8Array(16).fill(3));
  });

  it("keeps the same key actions whether the key is shown or hidden", () => {
    renderPage();
    openSlot(/Friends/);
    const copy = () =>
      within(screen.getByRole("group", { name: "Key" })).queryByRole("button", {
        name: "Copy to clipboard",
      });
    expect(copy()).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(copy()).toBeInTheDocument();
  });

  it("toggles uplink and mute", () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.click(screen.getByRole("switch", { name: "Uplink" }));
    expect(lastStaged()?.settings?.uplinkEnabled).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: "Mute notifications" }));
    expect(lastStaged()?.settings?.moduleSettings?.isMuted).toBe(false);
  });

  it("shares the channel as an add link and keeps the QR dialog and import", () => {
    renderPage();
    openSlot(/Friends/);
    expect(
      screen.getByRole("group", { name: "Channel link" }).textContent,
    ).toMatch(/meshtastic\.org\/e\/\?add=true#/);
    fireEvent.click(
      screen.getByRole("button", { name: "More sharing options" }),
    );
    expect(env.setDialogOpen).toHaveBeenCalledWith("QR", true);
    fireEvent.click(screen.getByRole("button", { name: "Import channels" }));
    expect(env.setDialogOpen).toHaveBeenCalledWith("import", true);
  });

  it("generates a key when a new channel with the default key is named", () => {
    renderPage();
    openSlot(/^3/);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Hiking" },
    });
    expect(lastStaged()?.settings?.name).toBe("Hiking");
    expect(lastStaged()?.settings?.psk.length).toBe(32);
  });

  it("keeps an existing channel's default key when it is renamed", () => {
    renderPage();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Base" },
    });
    expect(lastStaged()?.settings?.psk).toEqual(new Uint8Array([1]));
  });

  it("asks before switching slots with an invalid, unstaged edit", async () => {
    renderPage();
    openSlot(/Friends/);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "a".repeat(12) },
    });
    await screen.findByText(/expected less than or equal to 11 bytes/);
    // Let the editor report the invalid state to the page.
    await act(async () => {});
    openSlot(/^0/);

    expect(
      screen.getByRole("dialog", { name: "Discard invalid changes?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard and switch" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  });

  it("lets a read-only radio's slots be viewed but not changed", () => {
    render(
      <SettingsReadOnlyContext.Provider value>
        <Channels onFormInit={vi.fn()} />
      </SettingsReadOnlyContext.Provider>,
    );
    openSlot(/Friends/);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Uplink" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Import channels" }),
    ).toBeDisabled();
    // Sharing only reads the radio: the link, QR and key copies still work.
    for (const copy of screen.getAllByRole("button", {
      name: "Copy to clipboard",
    })) {
      expect(copy).toBeEnabled();
    }
    expect(
      screen.getAllByRole("button", { name: "Copy to clipboard" }),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Download QR" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Generate new" })).toBeDisabled();
  });
});
