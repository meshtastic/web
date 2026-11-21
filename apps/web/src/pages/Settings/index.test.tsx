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
  commit: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
}

const env = vi.hoisted((): TestEnv => ({
  pathname: "/settings/lora",
  search: {},
  mobile: false,
  navigate: vi.fn(),
  toast: vi.fn(),
  dirtyRadio: [],
  editorDirty: false,
  commit: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
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
    reset: env.reset,
  }),
  useSignal: <T,>(signal: { value: T }) => signal.value,
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
  return {
    User: ({
      onFormInit,
    }: {
      onFormInit: (form: ReturnType<typeof useForm<{ name: string }>>) => void;
    }) => {
      const form = useForm({ defaultValues: { name: "EAO1" } });
      useEffect(() => onFormInit(form), [form, onFormInit]);
      return <input aria-label="Long name" {...form.register("name")} />;
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
  AppSettings: stub("App"),
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
    env.mobile = false;
    env.dirtyRadio = [];
    env.editorDirty = false;
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
