import { ManagedModeNotAloneError } from "@core/kmp/configEditor.ts";
import { constantSignal } from "@core/kmp/signals.ts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfigPage from "./index.tsx";

interface TestEnv {
  pathname: string;
  search: object;
  mobile: boolean;
  navigate: ReturnType<typeof vi.fn>;
  toast: ReturnType<typeof vi.fn>;
  dirtyRadio: readonly string[];
  editorDirty: boolean;
  enablesManaged: boolean;
  commit: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  sendAdmin: ReturnType<typeof vi.fn>;
  adminAccessNodes: number[];
  managed: boolean;
}

const env = vi.hoisted((): TestEnv => ({
  pathname: "/settings/lora",
  search: {},
  mobile: false,
  navigate: vi.fn(),
  toast: vi.fn(),
  dirtyRadio: [],
  editorDirty: false,
  enablesManaged: false,
  commit: vi.fn(),
  reset: vi.fn(),
  sendAdmin: vi.fn(),
  adminAccessNodes: [],
  managed: false,
}));

vi.mock("@tanstack/react-router", () => ({
  useMatches: () => false,
  useNavigate: () => env.navigate,
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: env.pathname }),
  useRouterState: ({
    select,
  }: {
    select: (state: {
      location: { pathname: string; search: object };
    }) => unknown;
  }) => select({ location: { pathname: env.pathname, search: env.search } }),
}));

vi.mock("@core/hooks/useIsMobile.ts", () => ({
  useIsMobile: () => env.mobile,
  useCanFitDetailsColumn: () => !env.mobile,
  useFitsLabelledActions: () => !env.mobile,
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

vi.mock("@core/hooks/useDeviceCapabilities.ts", () => ({
  useDeviceCapabilities: () => ({
    metadata: undefined,
    excludedModules: 0,
    supportsFirmware28: true,
  }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    getEffectiveConfig: () => undefined,
    moduleConfig: {},
    config: {
      security: {
        publicKey: new Uint8Array([1, 2, 3]),
        isManaged: env.managed,
      },
    },
    adminAccessNodes: env.adminAccessNodes,
    adminAccessKey: "AQID",
    setAdminAccess: vi.fn(),
  }),
  useAppStore: () => vi.fn(),
}));

vi.mock("@core/kmp/hooks", () => ({
  useConfigEditor: () => ({
    isDirty: {
      get value() {
        return env.editorDirty;
      },
      peek: () => env.editorDirty,
      subscribe: () => () => {},
    },
    dirtyRadioSections: constantSignal(env.dirtyRadio),
    dirtyModuleSections: constantSignal<readonly string[]>([]),
    dirtyChannels: constantSignal<readonly number[]>([]),
    isOwnerDirty: constantSignal(false),
    stagedAdminMessages: constantSignal(new Map()),
    radio: constantSignal({}),
    modules: constantSignal({}),
    commit: env.commit,
    enablesManagedMode: () => env.enablesManaged,
    reset: env.reset,
  }),
  useSignal: <T,>(signal: { value: T }) => signal.value,
  useActiveClient: () => client,
}));

// One client for the whole run, as the app has.
const client = vi.hoisted(() => ({
  sendAdmin: (...args: unknown[]) =>
    (env.sendAdmin as (...sent: unknown[]) => unknown)(...args),
  events: { onConnectionState: { subscribe: () => () => {} } },
  device: {
    myNodeNum: { value: 9, peek: () => 9, subscribe: () => () => {} },
  },
  nodes: { list: { value: [], peek: () => [], subscribe: () => () => {} } },
}));

vi.mock("@components/Shell/useDeviceSummary.ts", () => ({
  useDeviceSummary: () => ({ name: "EAO1", connected: true }),
}));

vi.mock("@components/Shell/DeviceCard.tsx", () => ({
  DeviceCard: () => <div>device card</div>,
}));

vi.mock("@components/Shell/MobileHeaderControls.tsx", () => ({
  MobileHeaderControls: () => null,
}));

// Section bodies are tested on their own; stand-ins keep this to the layout.
const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => name + " body",
}));
// A real form, so Reset can be checked against the values it shows.
vi.mock("@components/PageComponents/Settings/User.tsx", async () => {
  const { useEffect } = await import("react");
  const { useForm } = await import("react-hook-form");
  // Real sections disable their controls through it (DynamicForm does).
  const { ReadOnlyFieldset } =
    await import("@components/Settings/SettingsReadOnly.tsx");
  return {
    User: ({
      onFormInit,
    }: {
      onFormInit: (form: ReturnType<typeof useForm<{ name: string }>>) => void;
    }) => {
      const form = useForm({ defaultValues: { name: "EAO1" } });
      useEffect(() => onFormInit(form), [form, onFormInit]);
      return (
        <ReadOnlyFieldset>
          <input aria-label="Long name" {...form.register("name")} />
        </ReadOnlyFieldset>
      );
    },
  };
});

vi.mock("./useSettingsListValues.ts", () => ({
  useSettingsListValues: () => ({ lora: "US · LongFast", channels: "2" }),
}));
vi.mock("@components/PageComponents/Settings/LoRa.tsx", () => ({
  LoRa: stub("LoRa"),
}));
vi.mock("@components/PageComponents/Settings/Security/Security.tsx", () => ({
  Security: stub("Security"),
}));
vi.mock("@components/PageComponents/Channels/Channels.tsx", () => ({
  Channels: stub("Channels"),
}));
vi.mock("@components/PageComponents/Settings/Device/index.tsx", () => ({
  Device: stub("Device"),
}));
vi.mock("@components/PageComponents/Settings/Position.tsx", () => ({
  Position: stub("Position"),
}));
vi.mock("@pages/Settings/About.tsx", () => ({ About: stub("About") }));
vi.mock("@pages/Settings/AppSettings.tsx", () => ({
  AppSettings: () => <button type="button">App control</button>,
}));
vi.mock("@pages/Settings/Administration.tsx", () => ({
  Administration: stub("Administration"),
}));
vi.mock("@pages/Settings/BackupRestore.tsx", () => ({
  BackupRestore: stub("Backup"),
}));
vi.mock("@pages/Settings/CleanNodeDb.tsx", () => ({
  CleanNodeDb: stub("Clean"),
}));
vi.mock("@pages/Settings/DebugPanel.tsx", () => ({
  DebugPanel: stub("Debug"),
}));

describe("Settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.pathname = "/settings/lora";
    env.search = {};
    env.enablesManaged = false;
    env.mobile = false;
    env.dirtyRadio = [];
    env.editorDirty = false;
    env.adminAccessNodes = [];
    env.managed = false;
    env.sendAdmin.mockReturnValue(new Promise(() => {}));
  });

  it("shows the section with breadcrumb, description and docs link", () => {
    render(<ConfigPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: "LoRa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("Configuration·EAO1");
    expect(screen.getByRole("link", { name: /Learn more/ })).toHaveAttribute(
      "href",
      "https://meshtastic.org/docs/configuration/radio/lora/",
    );
    expect(screen.getByText("LoRa body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^LoRa/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("filters the section list from the search box", () => {
    render(<ConfigPage />);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search settings" }),
      {
        target: { value: "blue" },
      },
    );
    // Bluetooth lives inside Device configuration.
    expect(
      screen.getByRole("button", { name: "Device configuration" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^User/ })).toBeNull();
  });

  it("marks dirty sections and offers Save, which restarts the radio", async () => {
    env.dirtyRadio = ["lora"];
    env.editorDirty = true;
    env.commit.mockImplementation(async () => {
      env.editorDirty = false;
      return { status: "ok" };
    });
    render(<ConfigPage />);

    expect(
      screen.getByRole("img", { name: "Unsaved changes" }),
    ).toBeInTheDocument();
    const bar = screen.getByRole("region", {
      name: "You have unsaved changes",
    });
    expect(bar).toHaveTextContent(
      "Saving restarts EAO1. It reconnects on its own in a few seconds.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(env.commit).toHaveBeenCalled());
    await waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "EAO1 is restarting and will reconnect in a few seconds.",
        }),
      ),
    );
    // The bar is gone; focus moves to the section title, not the body.
    expect(
      screen.getByRole("heading", { level: 2, name: "LoRa" }),
    ).toHaveFocus();
  });

  it("says managed mode is on instead of promising a restart", async () => {
    env.dirtyRadio = ["security"];
    env.editorDirty = true;
    env.enablesManaged = true;
    env.commit.mockImplementation(async () => {
      env.editorDirty = false;
      return { status: "ok" };
    });
    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "Managed mode is on. EAO1 now only accepts changes from its admin radios.",
        }),
      ),
    );
  });

  it("asks for managed mode to be saved on its own", async () => {
    env.dirtyRadio = ["security", "lora"];
    env.editorDirty = true;
    env.commit.mockResolvedValue({
      status: "error",
      error: new ManagedModeNotAloneError(),
    });
    render(<ConfigPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Save managed mode on its own" }),
      ),
    );
  });

  it("Reset discards the staged edits and keeps focus on the page", () => {
    env.editorDirty = true;
    render(<ConfigPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(env.reset).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 2, name: "LoRa" }),
    ).toHaveFocus();
  });

  it("shows the grouped list on mobile, and a back link inside a section", () => {
    env.mobile = true;
    env.pathname = "/settings";
    const { unmount } = render(<ConfigPage />);
    expect(screen.getByText("Backup & Restore")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Firmware update/ }));
    expect(env.navigate).toHaveBeenCalledWith({ to: "/settings/firmware" });
    unmount();

    env.pathname = "/settings/about";
    render(<ConfigPage />);
    fireEvent.click(screen.getByRole("button", { name: "Back to settings" }));
    expect(env.navigate).toHaveBeenCalledWith({ to: "/settings" });
  });

  it("opens a device subsection from ?tab= with its own header", () => {
    env.pathname = "/settings/device";
    env.search = { tab: "position" };
    render(<ConfigPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Position" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to Device configuration" }),
    ).toBeInTheDocument();
  });

  it("puts Save in the mobile header and the restart note at the bottom", async () => {
    env.mobile = true;
    env.editorDirty = true;
    env.commit.mockImplementation(async () => {
      env.editorDirty = false;
      return { status: "ok" };
    });
    render(<ConfigPage />);
    // The header shows the title; the heading stays for screen readers.
    expect(screen.getByRole("heading", { level: 2, name: "LoRa" })).toHaveClass(
      "sr-only",
    );
    expect(
      screen.getByText(
        "Saving restarts EAO1. It reconnects on its own in a few seconds.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(env.commit).toHaveBeenCalled());
  });

  it("disables the mobile Save while nothing changed", () => {
    env.mobile = true;
    render(<ConfigPage />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("Reset puts back the values the form started with", async () => {
    env.pathname = "/settings/user";
    render(<ConfigPage />);
    const input = await screen.findByRole("textbox", { name: "Long name" });
    fireEvent.change(input, { target: { value: "Base camp" } });
    fireEvent.click(await screen.findByRole("button", { name: "Reset" }));
    await waitFor(() => expect(input).toHaveValue("EAO1"));
  });

  it("shows current values in the mobile list", () => {
    env.mobile = true;
    env.pathname = "/settings";
    render(<ConfigPage />);
    expect(screen.getByText("US · LongFast")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("Settings page managing another node", () => {
  const NODE = 0x0c40;

  beforeEach(() => {
    vi.clearAllMocks();
    env.pathname = "/settings/lora";
    env.search = { node: NODE };
    env.mobile = false;
    env.dirtyRadio = [];
    env.editorDirty = false;
    env.adminAccessNodes = [NODE];
    env.managed = false;
    env.sendAdmin.mockReturnValue(new Promise(() => {}));
  });

  it("doesn't call the managed node read-only: it takes our admin key", async () => {
    env.managed = true;
    env.pathname = "/settings/user";
    render(<ConfigPage />);
    await screen.findByRole("region", { name: /remotely/u });
    expect(
      screen.queryByRole("region", { name: "This radio is managed" }),
    ).toBeNull();
    expect(screen.getByRole("textbox", { name: "Long name" })).toBeEnabled();
  });

  it("says which node is being managed, with a way out", async () => {
    render(<ConfigPage />);
    const banner = await screen.findByRole("region", {
      name: "Managing Meshtastic 0c40 remotely",
    });
    expect(banner).toHaveTextContent(
      "Changes go to Meshtastic 0c40 over the mesh",
    );
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("Configuration·Meshtastic 0c40");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Exit remote settings for Meshtastic 0c40",
      }),
    );
    expect(env.navigate).toHaveBeenCalledWith({
      to: "/settings",
      search: { node: undefined },
    });
  });

  it("asks the node for its metadata, never the local radio", async () => {
    render(<ConfigPage />);
    await screen.findByRole("region", { name: /remotely/u });
    await waitFor(() =>
      expect(env.sendAdmin).toHaveBeenCalledWith(
        { case: "getDeviceMetadataRequest", value: true },
        NODE,
        120_000,
      ),
    );
  });

  it("offers only the node's own settings", async () => {
    render(<ConfigPage />);
    await screen.findByRole("region", { name: /remotely/u });
    for (const name of [/^User/u, /^LoRa/u, /^Security/u]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    for (const name of [
      /^Channels/u,
      /^Administration/u,
      /^Backup/u,
      /^Firmware/u,
      /^Debug/u,
      /^Appearance/u,
      /^About/u,
    ]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("moves off a section the node doesn't offer", async () => {
    env.pathname = "/settings/backup";
    render(<ConfigPage />);
    await screen.findByRole("region", { name: /remotely/u });
    expect(env.navigate).toHaveBeenCalledWith({
      to: "/settings/user",
      replace: true,
    });
  });

  it("explains a node this radio isn't set up to manage", () => {
    env.adminAccessNodes = [];
    render(<ConfigPage />);
    expect(
      screen.getByText("Can’t manage this node remotely"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /remotely/u }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open this radio’s settings" }),
    );
    expect(env.navigate).toHaveBeenCalledWith({
      to: "/settings",
      search: { node: undefined },
    });
  });

  it("opens this radio's own settings for its own node number", () => {
    env.search = { node: 9 };
    render(<ConfigPage />);
    expect(screen.getByText("LoRa body")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /remotely/u }),
    ).not.toBeInTheDocument();
  });

  it("puts the banner on top of the mobile list", async () => {
    env.mobile = true;
    env.pathname = "/settings";
    render(<ConfigPage />);
    await screen.findByRole("region", { name: /remotely/u });
    expect(screen.queryByText("device card")).not.toBeInTheDocument();
  });
});

describe("Settings page for a managed radio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.pathname = "/settings/user";
    env.search = {};
    env.mobile = false;
    env.dirtyRadio = [];
    env.editorDirty = false;
    env.managed = true;
  });

  it("says the radio is managed and shows its settings read-only", () => {
    render(<ConfigPage />);
    expect(
      screen.getByRole("region", { name: "This radio is managed" }),
    ).toHaveTextContent("only accepts settings changes from its admin radios");
    expect(screen.getByRole("textbox", { name: "Long name" })).toBeDisabled();
  });

  it("offers no save, even with staged edits", () => {
    env.editorDirty = true;
    env.dirtyRadio = ["lora"];
    render(<ConfigPage />);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByText("You have unsaved changes")).toBeNull();
  });

  it("keeps the app's own settings usable", () => {
    env.pathname = "/settings/app";
    render(<ConfigPage />);
    expect(
      screen.getByRole("region", { name: "This radio is managed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "App control" })).toBeEnabled();
  });

  it("shows nothing extra when the radio isn't managed", () => {
    env.managed = false;
    render(<ConfigPage />);
    expect(
      screen.queryByRole("region", { name: "This radio is managed" }),
    ).toBeNull();
    expect(screen.getByRole("textbox", { name: "Long name" })).toBeEnabled();
  });
});
