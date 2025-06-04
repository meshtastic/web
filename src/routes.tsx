import { createRoute } from "@tanstack/react-router";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import MapPage from "@pages/Map/index.tsx";
import ConfigPage from "@pages/Config/index.tsx";
import ChannelsPage from "@pages/Channels.tsx";
import NodesPage from "@pages/Nodes.tsx";
import { createRootRoute } from "@tanstack/react-router";
import { App } from "./App.tsx";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
});

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  component: MapPage,
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/config",
  component: ConfigPage,
});

const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channels",
  component: ChannelsPage,
});

const nodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nodes",
  component: NodesPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  messagesRoute,
  mapRoute,
  configRoute,
  channelsRoute,
  nodesRoute,
]);

export { rootRoute };
