import React, { Suspense, use } from "react";
import "@app/index.css";

// feature flags and dev overrides
import "@core/services/dev-overrides.ts";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import "./i18n-config.ts";
import { router } from "@app/routes.tsx";
import { WelcomeSplash } from "@components/WelcomeSplash.tsx";
import { initDatabase, resetConnectionStatuses } from "@db/index";
import { RouterProvider } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface Register {}
}

enableMapSet();

// Check if database already exists (returning user)
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
  .then(() => resetConnectionStatuses())
  .catch((error) => {
    console.error("[App] Failed to initialize database:", error);
    throw error;
  });

// This Promise will be resolved when the WelcomeSplash is complete
let resolveWelcomeSplashPromise: () => void;
const welcomeSplashCompletionPromise = new Promise<void>((resolve) => {
  resolveWelcomeSplashPromise = resolve;
});

// A component that waits for both the DB and WelcomeSplash
function AppContent() {
  use(dbPromise); // Wait for DB to init
  use(welcomeSplashCompletionPromise); // Wait for WelcomeSplash to finish

  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

// Render the WelcomeSplash with an onComplete handler
function WelcomeFlow() {
  return <WelcomeSplash onComplete={resolveWelcomeSplashPromise} />;
}

function MinimalLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// Show minimal loader immediately
root.render(<MinimalLoader />);

// After the database check, determine what to render
checkDatabaseExists().then((exists) => {
  if (exists) {
    // Returning user: Resolve splash promise immediately since we skip it
    resolveWelcomeSplashPromise();
    // Render app content directly, DB init is awaited by AppContent
    root.render(
      <Suspense fallback={<MinimalLoader />}>
        <AppContent />
      </Suspense>,
    );
  } else {
    // First-time user: Render WelcomeFlow (which includes WelcomeSplash)
    // WelcomeFlow will call resolveWelcomeSplashPromise when it's done.
    // AppContent will then render once both dbPromise and welcomeSplashCompletionPromise resolve.
    root.render(
      <Suspense fallback={<MinimalLoader />}>
        <WelcomeFlow />
      </Suspense>,
    );
  }
});
