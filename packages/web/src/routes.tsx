import MessagesPage from "@app/pages/Messages/index.tsx";
import PreferencesPage from "@app/pages/Preferences.tsx";
import SettingsPage from "@app/pages/Settings.tsx";
import StatisticsPage from "@app/pages/Statistics/index.tsx";
import { ErrorPage } from "@components/ui/error-page.tsx";
import type { useDeviceStore } from "@core/stores";
import { ModuleConfig } from "@meshtastic/protobufs";
import { Connections } from "@pages/Connections/index.tsx";
import MapPage from "@pages/Map/index.tsx";
import NodesPage from "@pages/Nodes/index.tsx";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Activity } from "react";
import type { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { App } from "./App.tsx";
import { DeviceConfig } from "./pages/Settings/DeviceConfig.tsx";
import { RadioConfig } from "./pages/Settings/RadioConfig.tsx";

type DeviceStore = ReturnType<typeof useDeviceStore>;

interface AppContext {
  stores: {
    device: DeviceStore;
  };
}

// Helper function to check if there's an active connection
function requireActiveConnection(context: AppContext) {
  const devices = context.stores.device.getDevices();

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

export const rootRoute = createRootRouteWithContext<AppContext>()({
  component: () => <App />,
  errorComponent: ErrorPage,
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
  component: SettingsPage,
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
});

export const radioRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "radio",
  component: RadioConfig,
  errorComponent: ErrorPage,
});

export const deviceRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "device",
  component: DeviceConfig,
  errorComponent: ErrorPage,
});

export const moduleRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "module",
  component: ModuleConfig,
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
      <NodesPage />
    </Activity>
  ),
});

const connectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connections",
  component: Connections,
  errorComponent: ErrorPage,
});

const preferencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/preferences",
  component: PreferencesPage,
  errorComponent: ErrorPage,
  beforeLoad: ({ context }) => {
    requireActiveConnection(context);
  },
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
      <StatisticsPage />
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
  preferencesRoute,
  statisticsRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    stores: {
      device: {} as DeviceStore,
    },
    i18n: {} as ReturnType<typeof import("react-i18next").useTranslation>,
  },
});
export { router };
