import React, { Suspense, use, useState } from "react";
import "@app/index.css";

import "@core/services/dev-overrides.ts";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import "./i18n-config.ts";
import {
  initDatabase,
  packetBatcher,
  resetConnectionStatuses,
} from "@data/index";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./app/routes.tsx";
import { WelcomeSplash } from "./shared/components/WelcomeSplash.tsx";

declare module "@tanstack/react-router" {
  interface Register {}
}

enableMapSet();

// if database already exists they are returning
async function checkDatabaseExists(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle("meshtastic.db");
    return true;
  } catch {
    return false;
  }
}

// Initialize database before React mounts
const dbPromise = initDatabase()
  .then(() => {
    packetBatcher.init();
    return resetConnectionStatuses();
  })
  .catch((error) => {
    console.error("[App] Failed to initialize database:", error);
    throw error;
  });

// This will be resolved when the WelcomeSplash is "done"
let resolveWelcomeSplashPromise: () => void;
const welcomeSplashCompletionPromise = new Promise<void>((resolve) => {
  resolveWelcomeSplashPromise = resolve;
});

function AppContent() {
  use(dbPromise);
  use(welcomeSplashCompletionPromise); // Wait for WelcomeSplash to finish

  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

function MinimalLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function RootApp({ initialReturningUser }: { initialReturningUser: boolean }) {
  const [showSplash, setShowSplash] = useState(!initialReturningUser);

  // If returning user, resolve promise immediately
  if (initialReturningUser) {
    resolveWelcomeSplashPromise();
  }

  const handleSplashComplete = () => {
    resolveWelcomeSplashPromise();
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <Suspense fallback={<MinimalLoader />}>
        <WelcomeSplash onComplete={handleSplashComplete} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MinimalLoader />}>
      <AppContent />
    </Suspense>
  );
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// Show minimal loader immediately
root.render(<MinimalLoader />);

// After the database check, determine what to render
checkDatabaseExists().then((exists) => {
  root.render(<RootApp initialReturningUser={exists} />);
});
