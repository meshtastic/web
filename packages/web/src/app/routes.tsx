import { MessagesPage } from "@features/messages";
import { ErrorPage } from "@shared/components/ui/error-page";
import { Spinner } from "@shared/components/ui/spinner";
import { useDeviceStore } from "@core/stores";
import { Connections } from "@features/connections";
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Activity, lazy, Suspense } from "react";
import { z } from "zod/v4";
import { App } from "./App";

// Lazy loaded routes
const MapPage = lazy(() =>
  import("@features/map/pages/MapPage").then((m) => ({
    default: m.MapPage,
  })),
);
const NodesPage = lazy(() =>
  import("@features/nodes/pages/NodesPage").then((m) => ({
    default: m.NodesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@features/settings/pages/SettingsPage").then((m) => ({
    default: m.default,
  })),
);
const StatisticsPage = lazy(() => import("@pages/Statistics/index.tsx"));
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

type DeviceStore = ReturnType<typeof useDeviceStore>;

// Helper function to check if there's an active connection
function requireActiveConnection() {
  const devices = useDeviceStore.getState().getDevices();

  // Check if any device has an active connection
  const hasActiveConnection = devices.some(
    (device) =>
      device.connectionPhase === "connected" ||
      device.connectionPhase === "configured",
  );

  if (!hasActiveConnection) {
    throw redirect({ to: "/connections", replace: true });
  }
}

export const rootRoute = createRootRoute({
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
  component: Connections,
  loader: () => {
    // Redirect to longfast channel on first load
    return redirect({ to: "/messages", search: { channel: 0 }, replace: true });
  },
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
  errorComponent: ErrorPage,
  validateSearch: z.object({
    // For broadcast messages: ?channel=0 (channel index 0-7)
    channel: z.coerce.number().int().min(0).max(7).optional(),
    // For direct messages: ?node=123456789 (node number)
    node: z.coerce.number().int().min(0).max(4294967294).optional(), // max is 0xffffffff - 1
  }),
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
});

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
  component: () => (
    <Activity>
      <MapPage />
    </Activity>
  ),
});

const coordParamsSchema = z.object({
  // Accept "strings" from the URL, coerce to number, then validate
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
  // Typical web map zoom levels ~0..22 (adjust if your map lib differs)
  zoom: z.coerce
    .number()
    .int()
    .min(0, "Zoom too small.")
    .max(22, "Zoom too large."),
});

export const mapWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map/$long/$lat/$zoom",
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
  component: () => (
    <Activity>
      <MapPage />
    </Activity>
  ),
  parseParams: (raw) => coordParamsSchema.parse(raw),
  // // This controls how params are serialized when you navigate/link
  // stringifyParams: (p) => ({
  //   long: String(p.long),
  //   lat: String(p.lat),
  //   zoom: String(p.zoom),
  // }),
});

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <SettingsPage />
    </Suspense>
  ),
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
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
  getParentRoute: () => rootRoute,
  path: "/nodes",
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
  component: () => (
    <Activity>
      <Suspense fallback={<RouteLoader />}>
        <NodesPage />
      </Suspense>
    </Activity>
  ),
});

const connectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connections",
  component: Connections,
  errorComponent: ErrorPage,
});

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
  component: () => (
    <Activity>
      <Suspense fallback={<RouteLoader />}>
        <StatisticsPage />
      </Suspense>
    </Activity>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  messagesRoute,
  mapRoute,
  mapWithParamsRoute,
  settingsRoute.addChildren([radioRoute, deviceRoute, moduleRoute]),
  nodesRoute,
  connectionsRoute,
  statisticsRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    stores: {
      device: {} as DeviceStore,
    },
  },
});
export { router };
