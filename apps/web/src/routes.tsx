import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import type { TabBarStaticData } from "@components/Shell/navItems.ts";
import { useAppStore } from "@core/stores";
import MapPage from "@pages/Map/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import NodesPage from "@pages/Nodes/index.tsx";
import ConfigPage from "@pages/Settings/index.tsx";
import WelcomePage from "@pages/Welcome/index.tsx";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import type { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { App } from "./App.tsx";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption extends TabBarStaticData {}
}

interface AppContext {
  stores: {
    app: ReturnType<typeof useAppStore>;
  };
  i18n: ReturnType<typeof useTranslation>;
}

export const rootRoute = createRootRouteWithContext<AppContext>()({
  component: () => <App />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: () => {
    // Messages is the home screen; with nothing selected it shows the Chats list.
    return redirect({ to: "/messages", replace: true });
  },
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
});

const conversationParamsSchema = z.object({
  type: z.enum(["direct", "broadcast"]),
  chatId: z.coerce.number().int().min(0).max(4294967294), // max is 0xffffffff - 1
});

export const messagesWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages/$type/$chatId",
  component: MessagesPage,
  // A conversation is a full screen on mobile, so the tab bar steps aside.
  staticData: { hideTabBar: true },
  // A malformed link goes to the Chats list rather than the crash screen.
  parseParams: (params) => {
    const parsed = conversationParamsSchema.safeParse(params);
    if (!parsed.success) {
      throw redirect({ to: "/messages", replace: true });
    }
    return parsed.data;
  },
});

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  component: MapPage,
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
  component: MapPage,
  parseParams: (raw) => {
    const parsed = coordParamsSchema.safeParse(raw);
    if (!parsed.success) {
      throw redirect({ to: "/map", replace: true });
    }
    return parsed.data;
  },
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
  component: ConfigPage,
});

const settingsTabSearchSchema = z.object({
  tab: z.string().optional(),
});

// A section is a full screen on mobile (back returns to the Settings
// list), so it hides the tab bar there.
// Generic over the literal path, so `/settings/<section>` is in the route
// tree's types and links to it are checked.
const settingsPage = <const P extends string>(path: P) =>
  createRoute({
    getParentRoute: () => settingsRoute,
    path,
    component: ConfigPage,
    staticData: { hideTabBar: true },
  });

// `?tab=` opens a Device configuration subsection or a module.
const settingsTabbedPage = <const P extends string>(path: P) =>
  createRoute({
    getParentRoute: () => settingsRoute,
    path,
    component: ConfigPage,
    staticData: { hideTabBar: true },
    validateSearch: (search) => settingsTabSearchSchema.parse(search),
  });

export const userRoute = settingsPage("user");
export const loraRoute = settingsPage("lora");
export const channelsRoute = settingsPage("channels");
export const securityRoute = settingsPage("security");
export const deviceRoute = settingsTabbedPage("device");
export const moduleRoute = settingsTabbedPage("module");
export const administrationRoute = settingsPage("administration");
export const backupRestoreRoute = settingsPage("backup");
export const firmwareRoute = settingsPage("firmware");
export const cleanNodeDbRoute = settingsPage("clean-nodes");
export const debugRoute = settingsPage("debug");
export const appSettingsRoute = settingsPage("app");
export const messageFilterRoute = settingsPage("message-filter");
export const aboutRoute = settingsPage("about");
export const helpRoute = settingsPage("help");

// Radio Config used to group LoRa, Channels and Security.
const legacyRadioRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "radio",
  beforeLoad: () => {
    throw redirect({ to: "/settings/lora", replace: true });
  },
});

// First-run setup, also reachable any time to walk through it again. App
// renders it full screen, outside the shell, and redirects first-time
// visitors here once the saved connections have loaded.
export const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  component: WelcomePage,
  staticData: { hideTabBar: true },
});

const nodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nodes",
  component: NodesPage,
});

const dialogWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dialog/$dialogId",
  component: DialogManager,
});

// Old bookmarks: the Connections screen is now a drawer over the app.
const connectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connections",
  beforeLoad: () => {
    useAppStore.getState().openConnections();
    throw redirect({ to: "/", replace: true });
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  messagesRoute,
  messagesWithParamsRoute,
  mapRoute,
  mapWithParamsRoute,
  settingsRoute.addChildren([
    userRoute,
    loraRoute,
    channelsRoute,
    securityRoute,
    deviceRoute,
    moduleRoute,
    administrationRoute,
    backupRestoreRoute,
    firmwareRoute,
    cleanNodeDbRoute,
    debugRoute,
    appSettingsRoute,
    messageFilterRoute,
    aboutRoute,
    helpRoute,
    legacyRadioRoute,
  ]),
  nodesRoute,
  welcomeRoute,
  dialogWithParamsRoute,
  connectionsRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    stores: {
      app: {} as ReturnType<typeof useAppStore>,
    },
    i18n: {} as ReturnType<typeof import("react-i18next").useTranslation>,
  },
});
export { router };
