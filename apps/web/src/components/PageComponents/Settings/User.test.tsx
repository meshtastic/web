import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "./User.tsx";

const Excluded = Protobuf.Mesh.ExcludedModules;

let firmwareVersion: string;
let excludedModules: number;
let statusmessage:
  | Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig
  | undefined;
const setOwner = vi.fn();
const setModuleSection = vi.fn();

const user = create(Protobuf.Mesh.UserSchema, {
  id: "!abcd1234",
  longName: "Base Station",
  shortName: "BASE",
  hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V3,
  role: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
});

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () => ({ user }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    moduleConfig: { statusmessage },
    getEffectiveModuleConfig: () => statusmessage,
  }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({
    metadata: { firmwareVersion },
    supportsFirmware28: false,
    excludedModules,
  }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({
    owner: { value: undefined },
    modules: { value: {} },
    setBaselineOwner: vi.fn(),
    setOwner,
    setModuleSection,
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

describe("User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firmwareVersion = "2.7.20";
    excludedModules = 0;
    statusmessage = create(
      Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfigSchema,
      { nodeStatus: "On the hill" },
    );
  });

  it("shows the status message after Short Name from firmware 2.7.20", () => {
    render(<User onFormInit={vi.fn()} />);
    const labels = screen
      .getAllByText(
        /^(Node ID|Long Name|Short Name|Status Message|Hardware model|Unmessageable|Licensed amateur radio \(Ham\))$/,
      )
      .map((el) => el.textContent);
    expect(labels).toEqual([
      "Node ID",
      "Long Name",
      "Short Name",
      "Status Message",
      "Hardware model",
      "Unmessageable",
      "Licensed amateur radio (Ham)",
    ]);
    expect(screen.getByLabelText("Status Message")).toHaveValue("On the hill");
  });

  it("hides the status message on older firmware", () => {
    firmwareVersion = "2.7.19";
    render(<User onFormInit={vi.fn()} />);
    expect(screen.queryByText("Status Message")).toBeNull();
  });

  it("hides the status message when the build leaves the module out", () => {
    excludedModules = Excluded.STATUSMESSAGE_CONFIG;
    render(<User onFormInit={vi.fn()} />);
    expect(screen.queryByText("Status Message")).toBeNull();
  });

  it("waits for the module's config before showing the status message", () => {
    statusmessage = undefined;
    render(<User onFormInit={vi.fn()} />);
    expect(screen.queryByText("Status Message")).toBeNull();
  });

  it("stages the owner, keeping its other fields, and the status", async () => {
    render(<User onFormInit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Status Message"), {
      target: { value: "Back at base" },
    });

    await waitFor(() => expect(setModuleSection).toHaveBeenCalled());
    expect(setModuleSection).toHaveBeenLastCalledWith(
      "statusmessage",
      expect.objectContaining({ nodeStatus: "Back at base" }),
    );
    expect(setOwner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "!abcd1234",
        longName: "Base Station",
        role: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
      }),
    );
  });
});
