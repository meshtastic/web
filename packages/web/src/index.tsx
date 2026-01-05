import React, { useState } from "react";
import "@app/index.css";
import "@core/services/dev-overrides.ts";
import logger from "@core/services/logger";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import "./i18n-config.ts";
import { dbClient } from "@data/client";
import { initDatabase, resetConnectionStatuses } from "@data/index";
import {
  channelRepo,
  configCacheRepo,
  connectionRepo,
  deviceRepo,
  messageRepo,
  nodeRepo,
  packetLogRepo,
  preferencesRepo,
  tracerouteRepo,
} from "@data/repositories";
import { useDeviceStore } from "@state/device";
import { useUIStore } from "@state/ui";
import { RouterProvider } from "@tanstack/react-router";
import { type RouterContext, router } from "./app/routes.tsx";
import { WelcomeSplash } from "./shared/components/WelcomeSplash.tsx";

enableMapSet();

async function checkDatabaseExists(): Promise<boolean> {
  try {
    if (!navigator.storage?.getDirectory) {
      return false;
    }
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle("meshtastic.db");
    return true;
  } catch {
    return false;
  }
}

async function initializeApp(): Promise<{ isReturningUser: boolean }> {
  const isReturningUser = await checkDatabaseExists();
  await initDatabase();
  await resetConnectionStatuses();
  return { isReturningUser };
}

const routerContext: RouterContext = {
  services: {
    db: dbClient,
    logger,
  },
  repositories: {
    channel: channelRepo,
    configCache: configCacheRepo,
    connection: connectionRepo,
    device: deviceRepo,
    message: messageRepo,
    node: nodeRepo,
    packetLog: packetLogRepo,
    preferences: preferencesRepo,
    traceroute: tracerouteRepo,
  },
  stores: {
    device: useDeviceStore,
    ui: useUIStore,
  },
};

function App() {
  return (
    <React.StrictMode>
      <RouterProvider router={router} context={routerContext} />
    </React.StrictMode>
  );
}

function AppWithSplash({ isReturningUser }: { isReturningUser: boolean }) {
  const [splashComplete, setSplashComplete] = useState(isReturningUser);

  if (!splashComplete) {
    return <WelcomeSplash onComplete={() => setSplashComplete(true)} />;
  }

  return <App />;
}

function InitError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h1 className="text-xl font-semibold text-destructive">
        Failed to initialize
      </h1>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

rootElement.innerHTML = `
  <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center;">
    <div style="width: 2rem; height: 2rem; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  </div>
  <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
`;

initializeApp()
  .then(({ isReturningUser }) => {
    root.render(<AppWithSplash isReturningUser={true} />);
  })
  .catch((error) => {
    logger.error("[App] Failed to initialize:", error);
    root.render(<InitError error={error} />);
  });
