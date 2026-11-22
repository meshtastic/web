import { MeshRegistryProvider } from "@core/kmp/hooks";
import { MeshRegistry } from "@core/kmp/registry.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

vi.mock("@components/ConnectingOverlay.tsx", () => ({
  ConnectingOverlay: () => <div>connecting overlay</div>,
}));
vi.mock("@components/ConnectionsDrawer/ConnectionsDrawer.tsx", () => ({
  ConnectionsDrawer: () => <div>connections drawer</div>,
}));
vi.mock("@components/CommandPalette/index.tsx", () => ({
  CommandPalette: () => null,
}));
vi.mock("@components/RegionSetupReminder.tsx", () => ({
  RegionSetupReminder: () => null,
}));
vi.mock("@components/BeaconOfferNotifier.tsx", () => ({
  BeaconOfferNotifier: () => null,
}));
vi.mock("@components/Dialog/DialogManager.tsx", () => ({
  DialogManager: () => null,
}));
vi.mock("@components/Dialog/LockdownDialog/LockdownDialog.tsx", () => ({
  LockdownGate: () => null,
}));
vi.mock("@components/Shell/AppShell.tsx", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@components/NoRadio/NoRadioScreen.tsx", () => ({
  NoRadioScreen: () => <div>no radio screen</div>,
}));
vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => null,
}));

const renderApp = async (path: string) => {
  const rootRoute = createRootRoute({ component: App });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/welcome",
        component: () => <div>welcome wizard</div>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/messages",
        component: () => <div>messages page</div>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <MeshRegistryProvider registry={new MeshRegistry()}>
      <RouterProvider router={router} />
    </MeshRegistryProvider>,
  );
  await router.load();
  return router;
};

beforeEach(() => {
  localStorage.clear();
  useDeviceStore.setState({ savedConnections: [], devices: new Map() });
  useAppStore.setState({ selectedDeviceId: 0 });
  vi.spyOn(useDeviceStore.persist, "hasHydrated").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App welcome routing", () => {
  it("sends a first-time visitor to the welcome wizard", async () => {
    const router = await renderApp("/messages");
    expect(await screen.findByText("welcome wizard")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/welcome");
    // The wizard stands alone: no forced drawer or connecting overlay.
    expect(screen.queryByText("connections drawer")).toBeNull();
    expect(screen.queryByText("connecting overlay")).toBeNull();
  });

  it("leaves a returning user where they were", async () => {
    useDeviceStore.setState({
      savedConnections: [
        {
          id: 1,
          type: "http",
          name: "Radio",
          url: "http://10.0.0.2",
          createdAt: 0,
          status: "disconnected",
          nodeNum: 1234,
        },
      ],
    });
    const router = await renderApp("/messages");
    expect(await screen.findByText("connections drawer")).toBeInTheDocument();
    // With no radio connected the page says so instead of going blank.
    expect(screen.getByText("no radio screen")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/messages");
    expect(screen.queryByText("welcome wizard")).toBeNull();
  });
});
