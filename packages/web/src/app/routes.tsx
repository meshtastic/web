import { SidebarProvider } from "@app/shared/components/ui/sidebar.tsx";
import { CurrentDeviceContext, useDeviceStore } from "@app/state/index.ts";
import { ConnectPage, useConnect } from "@features/connect";
import { MessagesPage } from "@features/messages";
import { ErrorPage } from "@shared/components/ui/error-page";
import { Spinner } from "@shared/components/ui/spinner";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Activity, lazy, Suspense, useCallback } from "react";
import { z } from "zod/v4";
import { App } from "./App.tsx";
import { AppLayout } from "./layouts/AppLayout.tsx";
import type { RouterContext } from "./routerContext.ts";

const MapPage = lazy(() =>
  import("@features/map/pages/MapPage").then((m) => ({
    default: m.MapPage,
  })),
);
const NodesPage = lazy(() =>
  import("@features/nodes/pages/NodesPage").then((m) => ({
    default: m.default,
  })),
);
const SettingsPage = lazy(() =>
  import("@features/settings/pages/SettingsPage").then((m) => ({
    default: m.default,
  })),
);

const RadioConfig = lazy(() =>
  import("@features/settings/pages/RadioConfig").then((m) => ({
    default: m.RadioConfig,
  })),
);
const DeviceConfig = lazy(() =>
  import("@features/settings/pages/DeviceConfig").then((m) => ({
    default: m.DeviceConfig,
  })),
);
const ModuleConfig = lazy(() =>
  import("@features/settings/pages/ModuleConfig").then((m) => ({
    default: m.ModuleConfig,
  })),
);

function RouteLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Handles auto-reconnect and navigation intent subscriptions
 */
function ConnectedLayout() {
  const navigate = useNavigate();
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  const handleNavigationIntent = useCallback(
    (intent: { nodeNum: number }) => {
      navigate({
        to: "/$nodeNum/messages",
        params: { nodeNum: String(intent.nodeNum) },
        search: { channel: 0 },
      });
    },
    [navigate],
  );

  useConnect({
    autoReconnect: true,
    onNavigationIntent: handleNavigationIntent,
  });

  return (
    <SidebarProvider className="flex h-screen">
      <CurrentDeviceContext.Provider value={{ deviceId: activeDeviceId }}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </CurrentDeviceContext.Provider>
    </SidebarProvider>
  );
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <App />,
  errorComponent: ErrorPage,
  validateSearch: z.object({
    // Traceroute dialog: ?traceroute=123456789 (target node number)
    traceroute: z.coerce.number().int().min(0).max(4294967294).optional(),
  }),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // component: ConnectPage,
  beforeLoad: async ({ context }) => {
    const lastConnection =
      await context.repositories.connection.getLastConnectedConnection();

    if (lastConnection?.nodeNum) {
      // Verify the device still exists in the database
      const deviceExists = await context.repositories.device.deviceExists(
        lastConnection.nodeNum,
      );

      if (deviceExists) {
        // Device exists - redirect to messages
        throw redirect({
          to: "/$nodeNum/messages",
          params: { nodeNum: String(lastConnection.nodeNum) },
          search: { channel: 0 },
          replace: true,
        });
      }
    }

    // No valid previous connection - go to connect page
    throw redirect({ to: "/connect", replace: true });
  },
});

const connectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect",
  component: ConnectPage,
  errorComponent: ErrorPage,
});

// Connected layout route - validates nodeNum and provides it to children
const connectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$nodeNum",
  component: ConnectedLayout,
  errorComponent: ErrorPage,
  beforeLoad: async ({ params, context }) => {
    const nodeNum = Number(params.nodeNum);

    // Validate nodeNum is a valid number
    if (Number.isNaN(nodeNum) || nodeNum <= 0) {
      throw redirect({ to: "/connect", replace: true });
    }

    // Check if device exists in database
    const deviceExists =
      await context.repositories.device.deviceExists(nodeNum);

    if (!deviceExists) {
      throw redirect({ to: "/connect", replace: true });
    }

    return { nodeNum };
  },
});

const messagesRoute = createRoute({
  getParentRoute: () => connectedLayoutRoute,
  path: "/messages",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <MessagesPage />
    </Suspense>
  ),
  errorComponent: ErrorPage,
  validateSearch: z.object({
    // For broadcast messages: ?channel=0 (channel index 0-7)
    channel: z.coerce.number().int().min(0).max(7).optional(),
    // For direct messages: ?node=123456789 (node number)
    node: z.coerce.number().int().min(0).max(4294967294).optional(), // max is 0xffffffff - 1
  }),
});

const mapRoute = createRoute({
  getParentRoute: () => connectedLayoutRoute,
  path: "/map",
  errorComponent: ErrorPage,
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Activity>
        <MapPage />
      </Activity>
    </Suspense>
  ),
});

const coordParamsSchema = z.object({
  long: z.coerce
    .number()
    .refine(
      (n) => Number.isFinite(n) && n >= -180 && n <= 180,
      "Invalid longitude (-180..180).",
    ),
  lat: z.coerce
    .number()
    .refine(
      (n) => Number.isFinite(n) && n >= -90 && n <= 90,
      "Invalid latitude (-90..90).",
    ),
  // map zoom levels ~0..22
  zoom: z.coerce
    .number()
    .int()
    .min(0, "Zoom too small.")
    .max(22, "Zoom too large."),
});

export const mapWithParamsRoute = createRoute({
  getParentRoute: () => connectedLayoutRoute,
  path: "/map/$long/$lat/$zoom",
  errorComponent: ErrorPage,
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Activity>
        <MapPage />
      </Activity>
    </Suspense>
  ),
  parseParams: (raw) => coordParamsSchema.parse(raw),
  stringifyParams: (p) => ({
    long: String(p.long),
    lat: String(p.lat),
    zoom: String(p.zoom),
  }),
});

export const settingsRoute = createRoute({
  getParentRoute: () => connectedLayoutRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <SettingsPage />
    </Suspense>
  ),
  errorComponent: ErrorPage,
});

export const radioRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "radio",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <RadioConfig />
    </Suspense>
  ),
  errorComponent: ErrorPage,
});

export const deviceRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "device",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <DeviceConfig />
    </Suspense>
  ),
  errorComponent: ErrorPage,
});

export const moduleRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "module",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <ModuleConfig />
    </Suspense>
  ),
  errorComponent: ErrorPage,
});

const nodesRoute = createRoute({
  getParentRoute: () => connectedLayoutRoute,
  path: "/nodes",
  errorComponent: ErrorPage,
  component: () => (
    <Activity>
      <Suspense fallback={<RouteLoader />}>
        <NodesPage />
      </Suspense>
    </Activity>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  connectRoute,
  connectedLayoutRoute.addChildren([
    messagesRoute,
    mapRoute,
    mapWithParamsRoute,
    settingsRoute.addChildren([radioRoute, deviceRoute, moduleRoute]),
    nodesRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  context: undefined!,
});

export { router };
export type { RouterContext };
