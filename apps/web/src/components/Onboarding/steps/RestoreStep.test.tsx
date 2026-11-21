import { create } from "@bufbuild/protobuf";
import { MeshRegistryProvider } from "@core/kmp/hooks";
import { MeshRegistry } from "@core/kmp/registry.ts";
import { constantSignal } from "@core/kmp/signals.ts";
import { COMMIT_DISCONNECTED_MESSAGE } from "@core/onboarding/saves.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useDeviceStore } from "@core/stores";
import {
  buildDeviceProfile,
  defaultSelection,
  encodeDeviceProfile,
  selectProfileFields,
} from "@core/utils/profileExport.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "../OnboardingWizard.tsx";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Role = Protobuf.Channel.Channel_Role;

vi.mock("@app/pages/Connections/useConnections.ts", () => ({
  useConnections: () => ({
    addConnectionAndConnect: vi.fn(),
    removeConnection: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
  }),
}));

const lora = (region: Protobuf.Config.Config_LoRaConfig_RegionCode) =>
  create(Protobuf.Config.Config_LoRaConfigSchema, {
    region,
    usePreset: true,
    txEnabled: true,
    hopLimit: 3,
  });

const radioSecurity = create(Protobuf.Config.Config_SecurityConfigSchema, {
  privateKey: new Uint8Array(32).fill(1),
  publicKey: new Uint8Array(32).fill(2),
});

const user = create(Protobuf.Mesh.UserSchema, {
  id: "!abcd",
  longName: "Old name",
  shortName: "OLD",
});

const editor = {
  radio: constantSignal<{
    lora?: Protobuf.Config.Config_LoRaConfig;
    security?: Protobuf.Config.Config_SecurityConfig;
  }>({ lora: lora(Region.US), security: radioSecurity }),
  channels: constantSignal<ReadonlyMap<number, Protobuf.Channel.Channel>>(
    new Map([
      [
        0,
        create(Protobuf.Channel.ChannelSchema, {
          index: 0,
          role: Role.PRIMARY,
        }),
      ],
    ]),
  ),
  owner: constantSignal<Protobuf.Mesh.User | undefined>(undefined),
  setBaselineOwner: vi.fn(),
  setOwner: vi.fn(),
  setRadioSection: vi.fn(),
  setModuleSection: vi.fn(),
  setChannel: vi.fn(),
  stageAdminMessage: vi.fn(),
  reset: vi.fn(),
  commit: vi.fn(async (): Promise<Result<void, Error>> => Result.ok(undefined)),
};

vi.mock("@core/kmp/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@core/kmp/hooks")>();
  return {
    ...actual,
    useConfigEditor: () => editor,
    useChannels: () => [],
  };
});

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () => ({ user }),
}));

/** A backup file as Settings exports it. */
const backupFile = (
  region: Protobuf.Config.Config_LoRaConfig_RegionCode,
  name = "Meshtastic_Roof_20261121_nodeConfig.cfg",
) => {
  const profile = buildDeviceProfile({
    owner: create(Protobuf.Mesh.UserSchema, {
      longName: "Roof Node",
      shortName: "ROOF",
    }),
    radio: {
      lora: lora(region),
      security: create(Protobuf.Config.Config_SecurityConfigSchema, {
        privateKey: new Uint8Array(32).fill(7),
        publicKey: new Uint8Array(32).fill(9),
      }),
    },
    modules: {
      mqtt: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled: true,
      }),
    },
    channels: [
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Role.PRIMARY,
        settings: create(Protobuf.Channel.ChannelSettingsSchema, {
          name: "Hikers",
          psk: new Uint8Array([1]),
        }),
      }),
    ],
  });
  const bytes = encodeDeviceProfile(
    selectProfileFields(profile, defaultSelection(profile)),
  );
  // A copy is backed by a plain ArrayBuffer, which File requires.
  return new File([new Uint8Array(bytes)], name);
};

beforeEach(() => {
  localStorage.clear();
  editor.radio = constantSignal({
    lora: lora(Region.US),
    security: radioSecurity,
  });
  for (const fn of [
    editor.setBaselineOwner,
    editor.setOwner,
    editor.setRadioSection,
    editor.setModuleSection,
    editor.setChannel,
    editor.stageAdminMessage,
    editor.reset,
  ]) {
    fn.mockClear();
  }
  editor.commit.mockReset();
  editor.commit.mockResolvedValue(Result.ok(undefined));
  useDeviceStore.setState({
    savedConnections: [
      {
        id: 3,
        type: "http",
        name: "Base",
        url: "http://meshtastic.local",
        createdAt: 0,
        status: "configured",
        nodeNum: 0xabcd,
      },
    ],
    activeConnectionId: 3,
  });
});

/** Opens the wizard on a synced radio and moves on to the restore step. */
const openRestoreStep = async () => {
  const userEv = userEvent.setup();
  render(
    <MeshRegistryProvider registry={new MeshRegistry()}>
      <OnboardingWizard onFinish={vi.fn()} />
    </MeshRegistryProvider>,
  );
  await userEv.click(screen.getByRole("button", { name: "Get started" }));
  await userEv.click(screen.getByRole("button", { name: "Continue" }));
  return userEv;
};

const chooseRestore = async (
  userEv: ReturnType<typeof userEvent.setup>,
  file: File,
) => {
  await userEv.click(
    screen.getByRole("radio", { name: /Restore from a backup/ }),
  );
  await userEv.upload(screen.getByLabelText("Backup file"), file);
};

describe("RestoreStep", () => {
  it("asks new or restore, with new as the default", async () => {
    await openRestoreStep();
    const heading = screen.getByRole("heading", {
      name: "Set up as new or restore?",
    });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAccessibleDescription("Step 3 of 6 · Restore");
    expect(screen.getByRole("radio", { name: /Set up as new/ })).toBeChecked();
  });

  it("sets up as new on to the profile step", async () => {
    const userEv = await openRestoreStep();
    await userEv.click(screen.getByRole("button", { name: "Continue" }));
    const heading = screen.getByRole("heading", { name: "Make it yours" });
    expect(heading).toHaveAccessibleDescription("Step 4 of 6 · Your profile");

    await userEv.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { name: "Set up as new or restore?" }),
    ).toBeVisible();
  });

  it("opens the file picker from the restore choice", async () => {
    const userEv = await openRestoreStep();
    await userEv.click(
      screen.getByRole("radio", { name: /Restore from a backup/ }),
    );
    const input = screen.getByLabelText("Backup file");
    const click = vi.spyOn(input, "click");
    await userEv.click(
      screen.getByRole("button", { name: "Choose backup file" }),
    );
    expect(click).toHaveBeenCalledOnce();
    expect(input).toHaveAttribute("accept", ".cfg");
  });

  it("restores a good file and skips to the end", async () => {
    editor.commit.mockResolvedValue(
      Result.err(new Error(COMMIT_DISCONNECTED_MESSAGE)),
    );
    const userEv = await openRestoreStep();
    await chooseRestore(userEv, backupFile(Region.EU_868));

    expect(
      await screen.findByRole("heading", { name: "Restore from a backup" }),
    ).toHaveFocus();
    expect(
      screen.getByText("Meshtastic_Roof_20261121_nodeConfig.cfg"),
    ).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Long name" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Radio settings/ }),
    ).toBeChecked();
    expect(screen.getByText("your radio's own security keys")).toBeVisible();
    expect(screen.getByText(/including its region and LoRa/)).toBeVisible();

    await userEv.click(
      screen.getByRole("button", { name: "Restore and continue" }),
    );

    expect(editor.setBaselineOwner).toHaveBeenCalledWith(user);
    // The file's LoRa goes in whole, not merged like a channel link's.
    expect(editor.setRadioSection).toHaveBeenCalledWith(
      "lora",
      expect.objectContaining({ region: Region.EU_868 }),
    );
    expect(editor.setRadioSection).toHaveBeenCalledWith(
      "security",
      expect.objectContaining({ privateKey: radioSecurity.privateKey }),
    );
    expect(editor.setModuleSection).toHaveBeenCalledWith(
      "mqtt",
      expect.objectContaining({ enabled: true }),
    );
    expect(editor.setChannel).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, role: Role.PRIMARY }),
    );
    const done = await screen.findByRole("heading", {
      name: "You're on the mesh",
    });
    expect(done).toHaveAccessibleDescription("Step 6 of 6 · Done");
    expect(
      screen.getByText(/Settings restored. Your radio is restarting/),
    ).toBeVisible();
    expect(editor.reset).not.toHaveBeenCalled();
  });

  it("leaves out what's unticked", async () => {
    const userEv = await openRestoreStep();
    await chooseRestore(userEv, backupFile(Region.EU_868));
    await userEv.click(
      screen.getByRole("checkbox", { name: /Radio settings/ }),
    );
    await userEv.click(
      screen.getByRole("checkbox", { name: /Module settings/ }),
    );
    await userEv.click(screen.getByRole("checkbox", { name: /Channels/ }));
    expect(screen.getByText(/names and channels replace/)).toBeVisible();
    await userEv.click(
      screen.getByRole("button", { name: "Restore and continue" }),
    );

    expect(editor.setRadioSection).not.toHaveBeenCalled();
    expect(editor.setModuleSection).not.toHaveBeenCalled();
    expect(editor.setOwner).toHaveBeenCalledWith(
      expect.objectContaining({ longName: "Roof Node" }),
    );
    expect(await screen.findByText("Settings restored.")).toBeVisible();
  });

  it("asks for a region when the restore leaves none", async () => {
    const userEv = await openRestoreStep();
    await chooseRestore(userEv, backupFile(Region.UNSET));
    await userEv.click(
      screen.getByRole("button", { name: "Restore and continue" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Make it yours" }),
    ).toBeVisible();
    expect(screen.getByText(/still has no region/)).toBeVisible();
  });

  it("flags a file that isn't a backup and lets another be picked", async () => {
    const userEv = await openRestoreStep();
    await chooseRestore(
      userEv,
      new File([new TextEncoder().encode("not a profile")], "notes.cfg"),
    );

    expect(
      screen.getByText(/notes.cfg isn't a Meshtastic backup/),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Set up as new or restore?" }),
    ).toBeVisible();

    await userEv.upload(
      screen.getByLabelText("Backup file"),
      backupFile(Region.EU_868),
    );
    expect(
      await screen.findByRole("heading", { name: "Restore from a backup" }),
    ).toBeVisible();
    expect(screen.queryByText(/isn't a Meshtastic backup/)).toBeNull();

    await userEv.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("radio", { name: /Restore from a backup/ }),
    ).toBeChecked();
  });

  it("reverts staged edits when the restore fails", async () => {
    editor.commit.mockResolvedValue(Result.err(new Error("Rejected")));
    const userEv = await openRestoreStep();
    await chooseRestore(userEv, backupFile(Region.EU_868));
    await userEv.click(
      screen.getByRole("button", { name: "Restore and continue" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't restore to the radio: Rejected",
    );
    expect(editor.reset).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { name: "Restore from a backup" }),
    ).toBeVisible();
  });

  it("skips setup from the restore step", async () => {
    const userEv = await openRestoreStep();
    await userEv.click(screen.getByRole("button", { name: "Skip setup" }));
    expect(
      screen.getByRole("heading", { name: "You're on the mesh" }),
    ).toHaveAccessibleDescription("Step 6 of 6 · Done");

    await userEv.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { name: "Set up as new or restore?" }),
    ).toBeVisible();
  });
});
