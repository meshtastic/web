import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import MapPage from "@pages/Map/index.tsx";
import ConfigPage from "@pages/Config/index.tsx";
import ChannelsPage from "@pages/Channels.tsx";
import NodesPage from "@pages/Nodes/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { z } from "zod";
import { useAppStore } from "@core/stores/appStore.ts";
import { useMessageStore } from "@core/stores/messageStore/index.ts";
import { App } from "./App.tsx";
import { useTranslation } from "react-i18next";

interface AppContext {
  stores: {
    app: ReturnType<typeof useAppStore>;
    message: ReturnType<typeof useMessageStore>;
  };
  i18n: ReturnType<typeof useTranslation>;
}

export const rootRoute = createRootRouteWithContext<AppContext>()({
  component: () => <App />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
  loader: () => {
    // Redirect to the broadcast messages page on initial load
    return redirect({ to: `/messages/broadcast/0`, replace: true });
  },
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
  beforeLoad: ({ params }) => {
    const DEFAULT_CHANNEL = 0;

    if (Object.values(params).length === 0) {
      throw redirect({
        to: `/messages/broadcast/${DEFAULT_CHANNEL}`,
        replace: true,
      });
    }
  },
});

const chatIdSchema = z.string().refine((val) => {
  const num = Number(val);
  if (isNaN(num) || !Number.isInteger(num)) {
    return false;
  }

  const isChannelId = num >= 0 && num <= 10;
  const isNodeId = num >= 1000000000 && num <= 9999999999;

  return isChannelId || isNodeId;
}, {
  message: "Chat ID must be a channel (0-10) or a valid node ID.",
});

export const messagesWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages/$type/$chatId",
  component: MessagesPage,
  parseParams: (params) => ({
    type: z.enum(["direct", "broadcast"], {
      errorMap: () => ({ message: 'Type must be "direct" or "broadcast".' }),
    }).parse(params.type),
    chatId: chatIdSchema.parse(params.chatId),
  }),
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

const dialogWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dialog/$dialogId",
  component: DialogManager,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  messagesRoute,
  messagesWithParamsRoute,
  mapRoute,
  configRoute,
  channelsRoute,
  nodesRoute,
  dialogWithParamsRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    stores: {
      app: {} as ReturnType<typeof useAppStore>,
      message: {} as ReturnType<typeof useMessageStore>,
    },
    i18n: {} as ReturnType<typeof import("react-i18next").useTranslation>,
  },
});
export { router };
