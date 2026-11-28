import { create } from "@bufbuild/protobuf";
import { constantSignal } from "@core/kmp/signals.ts";
import { Protobuf } from "@core/protobuf.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportDialog } from "./ImportDialog.tsx";

const Role = Protobuf.Channel.Channel_Role;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

const settings = (name: string, psk: number[]) =>
  create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array(psk),
  });

const radioLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  usePreset: true,
  region: Region.US,
  modemPreset: Preset.LONG_FAST,
  hopLimit: 3,
  txEnabled: true,
});

const env = vi.hoisted(() => ({
  setChannel: vi.fn(),
  setRadioSection: vi.fn(),
  channels: [] as Protobuf.Channel.Channel[],
  // Channels staged in the editor but not yet saved.
  pending: [] as Protobuf.Channel.Channel[],
  lora: true,
  editor: true,
  phase: "configured" as "configuring" | "configured",
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({ config: { lora: undefined } }),
}));

vi.mock("@core/kmp/hooks", () => ({
  useChannels: () => env.channels,
  useConfigEditor: () =>
    env.editor
      ? {
          radio: constantSignal({ lora: env.lora ? radioLora : undefined }),
          channels: constantSignal(
            new Map([...env.channels, ...env.pending].map((c) => [c.index, c])),
          ),
          setChannel: env.setChannel,
          setRadioSection: env.setRadioSection,
        }
      : undefined,
  useConnectionProgress: () => ({ phase: env.phase }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

const radioChannels = [
  create(Protobuf.Channel.ChannelSchema, {
    index: 0,
    role: Role.PRIMARY,
    settings: settings("", [1]),
  }),
  create(Protobuf.Channel.ChannelSchema, {
    index: 1,
    role: Role.SECONDARY,
    settings: settings("Friends", [3]),
  }),
];

const link = create(Protobuf.AppOnly.ChannelSetSchema, {
  settings: [settings("Hikers", [2]), settings("Friends", [9])],
  loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
    usePreset: true,
    region: Region.EU_868,
    modemPreset: Preset.SHORT_FAST,
  }),
});

const renderDialog = () =>
  render(<ImportDialog open={true} onOpenChange={vi.fn()} />);

const enterLink = (url: string) =>
  fireEvent.change(
    screen.getByRole("textbox", { name: "Channel Set/QR Code URL" }),
    { target: { value: url } },
  );

const staged = () =>
  env.setChannel.mock.calls.map((call) => {
    const c = call[0] as Protobuf.Channel.Channel;
    return [c.index, c.role, c.settings?.name];
  });

describe("ImportDialog", () => {
  beforeEach(() => {
    env.setChannel.mockClear();
    env.setRadioSection.mockClear();
    env.channels = radioChannels;
    env.pending = [];
    env.lora = true;
    env.editor = true;
    env.phase = "configured";
  });

  it("defaults a link with LoRa settings to Replace and applies them", () => {
    renderDialog();
    enterLink(channelSetToUrl(link));
    expect(screen.getByRole("radio", { name: "Replace" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByText(/2 channels on your radio will be replaced/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Region changes from US to EU_868/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replace channels" }));
    expect(staged()).toEqual([
      [0, Role.PRIMARY, "Hikers"],
      [1, Role.SECONDARY, "Friends"],
    ]);
    expect(env.setRadioSection).toHaveBeenCalledWith(
      "lora",
      expect.objectContaining({
        region: Region.EU_868,
        modemPreset: Preset.SHORT_FAST,
        txEnabled: true,
      }),
    );
  });

  it("adds into free slots without touching LoRa when Add is chosen", () => {
    renderDialog();
    enterLink(channelSetToUrl(link));
    fireEvent.click(screen.getByRole("radio", { name: "Add" }));
    expect(
      screen.getByText(
        "Your radio has a channel with this name and a different key.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your radio has 6 free channel slots."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add channels" }));
    expect(staged()).toEqual([
      [2, Role.SECONDARY, "Hikers"],
      [3, Role.SECONDARY, "Friends"],
    ]);
    expect(env.setRadioSection).not.toHaveBeenCalled();
  });

  it("locks an add link to Add and never changes LoRa", () => {
    renderDialog();
    enterLink(channelSetToUrl(link, { add: true }));
    expect(screen.getByRole("radio", { name: "Replace" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Add" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText(/can only add channels/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add channels" }));
    expect(staged().map(([slot]) => slot)).toEqual([2, 3]);
    expect(env.setRadioSection).not.toHaveBeenCalled();
  });

  it("imports only the ticked channels", () => {
    renderDialog();
    enterLink(channelSetToUrl(link));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hikers" }));
    expect(screen.getByText("Not imported")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Replace channels" }));
    expect(staged()).toEqual([
      [0, Role.PRIMARY, "Friends"],
      [1, Role.DISABLED, ""],
    ]);
  });

  it("won't add to a full radio", () => {
    env.channels = Array.from({ length: 8 }, (_, index) =>
      create(Protobuf.Channel.ChannelSchema, {
        index,
        role: index === 0 ? Role.PRIMARY : Role.SECONDARY,
        settings: settings(`c${index}`, [index + 10]),
      }),
    );
    renderDialog();
    enterLink(channelSetToUrl(link, { add: true }));
    expect(screen.getByText(/2 channels don't fit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add channels" })).toBeDisabled();
  });

  it("waits for the radio's channels before importing", () => {
    env.channels = [];
    renderDialog();
    enterLink(channelSetToUrl(link));
    expect(screen.getByText(/channels haven't loaded yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace channels" }),
    ).toBeDisabled();
  });

  it("waits for the radio's config to finish, not just its first channels", () => {
    // Mid-config: the primary has arrived, slot 1 hasn't yet.
    env.phase = "configuring";
    env.channels = [radioChannels[0]!];
    renderDialog();
    enterLink(channelSetToUrl(link, { add: true }));
    expect(screen.getByText(/channels haven't loaded yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add channels" })).toBeDisabled();
  });

  it("keeps the slots of channels staged by an earlier import", () => {
    env.pending = [
      create(Protobuf.Channel.ChannelSchema, {
        index: 2,
        role: Role.SECONDARY,
        settings: settings("Staged", [4]),
      }),
    ];
    renderDialog();
    enterLink(channelSetToUrl(link, { add: true }));
    fireEvent.click(screen.getByRole("button", { name: "Add channels" }));
    expect(staged().map(([slot]) => slot)).toEqual([3, 4]);
  });

  it("waits for the radio's LoRa settings before adding", () => {
    // Unnamed channels are named by the preset, so Add can't match without it.
    env.lora = false;
    renderDialog();
    enterLink(channelSetToUrl(link, { add: true }));
    expect(screen.getByText(/channels haven't loaded yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add channels" })).toBeDisabled();
  });

  it("matches channels by effective name and key", () => {
    // The radio's unnamed default channel is the link's "LongFast" with the
    // expanded default key.
    const longFast = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [
        settings(
          "LongFast",
          [
            0xd4, 0xf1, 0xbb, 0x3a, 0x20, 0x29, 0x07, 0x59, 0xf0, 0xbc, 0xff,
            0xab, 0xcf, 0x4e, 0x69, 0x01,
          ],
        ),
      ],
    });
    renderDialog();
    enterLink(channelSetToUrl(longFast, { add: true }));
    expect(screen.getByText("Already on your radio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add channels" })).toBeDisabled();
  });

  it("rejects a link on another host", () => {
    renderDialog();
    enterLink(channelSetToUrl(link).replace("meshtastic.org", "example.com"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This isn't a Meshtastic channel link.",
    );
    expect(screen.queryByRole("radio", { name: "Replace" })).toBeNull();
  });
});
