import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RemoteSettingsContext,
  type RemoteSettingsScope,
} from "@core/settings/remoteContext.ts";
import { SettingsReadOnlyContext } from "@components/Settings/SettingsReadOnly.tsx";
import { User } from "./User.tsx";

const Excluded = Protobuf.Mesh.ExcludedModules;

let firmwareVersion: string;
let excludedModules: number;
let statusmessage:
  | Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig
  | undefined;
const setOwner = vi.fn();
const setModuleSection = vi.fn();
const setBaselineOwner = vi.fn();

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

vi.mock("@core/kmp/hooks", () => ({
  useConfigEditor: () => ({
    owner: { value: undefined },
    modules: { value: {} },
    setBaselineOwner,
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

  it("keeps the node ID copyable while settings are read-only", () => {
    render(
      <SettingsReadOnlyContext.Provider value>
        <User onFormInit={vi.fn()} />
      </SettingsReadOnlyContext.Provider>,
    );
    expect(screen.getByRole("textbox", { name: "Long Name" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeEnabled();
  });

  it("counts the long name in UTF-8 bytes and flags it once over", () => {
    render(<User onFormInit={vi.fn()} />);
    const longName = screen.getByLabelText("Long Name");
    // 12 two-byte letters: 12 characters but 24 bytes, exactly the limit.
    fireEvent.change(longName, { target: { value: "é".repeat(12) } });
    expect(screen.getByText("24/24")).toBeInTheDocument();
    expect(longName).not.toHaveAttribute("aria-invalid", "true");

    fireEvent.change(longName, { target: { value: "é".repeat(13) } });
    expect(screen.getByText("26/24")).toBeInTheDocument();
    expect(longName).toHaveAttribute("aria-invalid", "true");
  });

  it("counts the short name in bytes, so one emoji fills it", () => {
    render(<User onFormInit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Short Name"), {
      target: { value: "📡" },
    });
    expect(screen.getByText("4/4")).toBeInTheDocument();
  });
});

describe("User on a remote node", () => {
  const remoteUser = create(Protobuf.Mesh.UserSchema, {
    id: "!00000c40",
    longName: "IB North",
    shortName: "IBN",
  });
  const fixed = <T,>(value: T) => ({
    value,
    peek: () => value,
    subscribe: () => () => {},
  });
  const scope = {
    name: "IB North",
    remote: {
      editor: { deviceOwner: fixed(remoteUser) },
      loads: fixed(new Map([["owner", { status: "loaded" }]])),
    },
  } as unknown as RemoteSettingsScope;

  beforeEach(() => {
    vi.clearAllMocks();
    firmwareVersion = "2.7.20";
    excludedModules = 0;
    statusmessage = undefined;
  });

  it("shows the node's own owner, not this radio's, without ham mode", () => {
    render(
      <RemoteSettingsContext.Provider value={scope}>
        <User onFormInit={vi.fn()} />
      </RemoteSettingsContext.Provider>,
    );
    expect(screen.getByLabelText("Long Name")).toHaveValue("IB North");
    expect(screen.queryByText("Licensed amateur radio (Ham)")).toBeNull();
    expect(setBaselineOwner).not.toHaveBeenCalled();
  });
});
