import { create } from "@bufbuild/protobuf";
import { constantSignal } from "@core/kmp/signals.ts";
import { COMMIT_DISCONNECTED_MESSAGE } from "@core/onboarding/saves.ts";
import { Protobuf } from "@core/protobuf.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "better-result";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StepActionsProps } from "../StepLayout.tsx";
import { ChannelStep } from "./ChannelStep.tsx";
import { ProfileStep } from "./ProfileStep.tsx";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Role = Protobuf.Channel.Channel_Role;

const usLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  region: Region.US,
  usePreset: true,
  txEnabled: true,
  hopLimit: 3,
});

const editor = {
  radio: constantSignal<{ lora?: Protobuf.Config.Config_LoRaConfig }>({
    lora: usLora,
  }),
  setBaselineOwner: vi.fn(),
  setOwner: vi.fn(),
  setRadioSection: vi.fn(),
  setChannel: vi.fn(),
  reset: vi.fn(),
  commit: vi.fn(async (): Promise<Result<void, Error>> => Result.ok(undefined)),
};

const user = create(Protobuf.Mesh.UserSchema, {
  id: "!abcd",
  longName: "Old name",
  shortName: "OLD",
});

const channels = [
  {
    index: 0,
    role: Role.PRIMARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {
      psk: new Uint8Array([1]),
    }),
  },
];

vi.mock("@core/kmp/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@core/kmp/hooks")>();
  return {
    ...actual,
    useConfigEditor: () => editor,
    useActiveClient: () => undefined,
    useChannels: () => channels,
  };
});

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () => ({ user }),
}));

const actions: StepActionsProps = {
  next: { label: "Save and continue" },
};
const channelActions: StepActionsProps = {
  next: { label: "Add channel" },
  secondary: { label: "Skip for now" },
};

beforeAll(() => {
  // Radix Select uses pointer capture and scrolling jsdom lacks.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  editor.radio = constantSignal({ lora: usLora });
  for (const fn of [
    editor.setBaselineOwner,
    editor.setOwner,
    editor.setRadioSection,
    editor.setChannel,
    editor.reset,
  ]) {
    fn.mockClear();
  }
  editor.commit.mockReset();
  editor.commit.mockResolvedValue(Result.ok(undefined));
});

const renderProfile = (radioReady = true, onSaved = vi.fn()) => {
  render(
    <ProfileStep
      actions={actions}
      formId="profile-form"
      radioReady={radioReady}
      statusNow={() => "configured"}
      onSaved={onSaved}
    />,
  );
  return onSaved;
};

describe("ProfileStep", () => {
  it("can't save while the radio restarts or before LoRa has loaded", () => {
    renderProfile(false);
    expect(
      screen.getByRole("button", { name: "Save and continue" }),
    ).toBeDisabled();
  });

  it("can't save before the LoRa section has loaded", () => {
    editor.radio = constantSignal({});
    renderProfile(true);
    expect(
      screen.getByRole("button", { name: "Save and continue" }),
    ).toBeDisabled();
  });

  it("saves trimmed names", async () => {
    const userEv = userEvent.setup();
    const onSaved = renderProfile();
    const longName = screen.getByLabelText("Long name");
    await userEv.clear(longName);
    await userEv.type(longName, "  Base camp  ");
    await userEv.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );

    expect(editor.setOwner).toHaveBeenCalledWith(
      expect.objectContaining({ longName: "Base camp", shortName: "OLD" }),
    );
    expect(editor.setRadioSection).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it("treats a restart during a region save as saved", async () => {
    editor.commit.mockResolvedValue(
      Result.err(new Error(COMMIT_DISCONNECTED_MESSAGE)),
    );
    const userEv = userEvent.setup();
    const onSaved = renderProfile();
    await userEv.click(screen.getByLabelText("LoRa region"));
    await userEv.click(screen.getByRole("option", { name: "EU_868" }));
    await userEv.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );

    expect(editor.setRadioSection).toHaveBeenCalledWith(
      "lora",
      expect.objectContaining({
        region: Region.EU_868,
        txEnabled: true,
        hopLimit: 3,
        usePreset: true,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(true);
    expect(editor.reset).not.toHaveBeenCalled();
  });

  it("reverts staged edits when the save fails", async () => {
    editor.commit.mockResolvedValue(Result.err(new Error("Rejected")));
    const userEv = userEvent.setup();
    const onSaved = renderProfile();
    await userEv.type(screen.getByLabelText("Long name"), "!");
    await userEv.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save to the radio: Rejected",
    );
    expect(editor.reset).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("requires a region on a radio that has none", async () => {
    editor.radio = constantSignal({
      lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
        region: Region.UNSET,
      }),
    });
    const userEv = userEvent.setup();
    const onSaved = renderProfile();
    await userEv.click(
      screen.getByRole("button", { name: "Save and continue" }),
    );

    expect(screen.getByText(/Choose a region/)).toBeVisible();
    expect(screen.getByLabelText("LoRa region")).toHaveFocus();
    expect(editor.commit).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("ChannelStep", () => {
  const link = channelSetToUrl(
    create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [
        create(Protobuf.Channel.ChannelSettingsSchema, {
          name: "Hikers",
          psk: new Uint8Array([7]),
        }),
      ],
      loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
        region: Region.EU_868,
      }),
    }),
  );

  const renderChannel = (onDone = vi.fn()) => {
    render(
      <ChannelStep
        actions={channelActions}
        formId="channel-form"
        radioReady
        statusNow={() => "configured"}
        onDone={onDone}
      />,
    );
    return onDone;
  };

  it("adds a link's channel as a secondary", async () => {
    const userEv = userEvent.setup();
    const onDone = renderChannel();
    await userEv.click(screen.getByLabelText("Channel link"));
    await userEv.paste(link);
    await userEv.click(screen.getByRole("button", { name: "Add channel" }));

    expect(editor.setChannel).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1, role: Role.SECONDARY }),
    );
    expect(editor.setRadioSection).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it("confirms a replace, naming the region change, before saving", async () => {
    const userEv = userEvent.setup();
    const onDone = renderChannel();
    await userEv.click(screen.getByLabelText("Channel link"));
    await userEv.paste(link);
    await userEv.click(screen.getByLabelText(/Replace my channels/));
    await userEv.click(screen.getByRole("button", { name: "Add channel" }));

    expect(editor.commit).not.toHaveBeenCalled();
    expect(screen.getByText(/from US to EU_868/)).toBeVisible();
    await userEv.click(
      screen.getByRole("button", { name: "Replace and restart" }),
    );

    expect(editor.setChannel).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, role: Role.PRIMARY }),
    );
    expect(editor.setRadioSection).toHaveBeenCalledWith(
      "lora",
      expect.objectContaining({ region: Region.EU_868, txEnabled: true }),
    );
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it("reverts staged channels when the save fails", async () => {
    editor.commit.mockResolvedValue(Result.err(new Error("Rejected")));
    const userEv = userEvent.setup();
    const onDone = renderChannel();
    await userEv.click(screen.getByLabelText("Channel link"));
    await userEv.paste(link);
    await userEv.click(screen.getByRole("button", { name: "Add channel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Rejected");
    expect(editor.reset).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });
});
