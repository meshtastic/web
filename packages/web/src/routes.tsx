import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import type { useAppStore } from "@core/stores/appStore.ts";
import type { useMessageStore } from "@core/stores/messageStore/index.ts";
import ChannelsPage from "@pages/Channels.tsx";
import ConfigPage from "@pages/Config/index.tsx";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import MapPage from "@pages/Map/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import NodesPage from "@pages/Nodes/index.tsx";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import type { useTranslation } from "react-i18next";
import { z } from "zod";
import { App } from "./App.tsx";

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
    return redirect({ to: "/messages/broadcast/0", replace: true });
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

const chatIdSchema = z.string().refine(
  (val) => {
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num)) {
      return false;
    }

    const isChannelId = num >= 0 && num <= 10;
    const isNodeId = num >= 1000000000 && num <= 9999999999;

    return isChannelId || isNodeId;
  },
  {
    message: "Chat ID must be a channel (0-10) or a valid node ID.",
  },
);

export const messagesWithParamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages/$type/$chatId",
  component: MessagesPage,
  parseParams: (params) => ({
    type: z
      .enum(["direct", "broadcast"])
      .refine((val) => val === "direct" || val === "broadcast", {
        message: 'Type must be "direct" or "broadcast".',
      })
      .parse(params.type),
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
