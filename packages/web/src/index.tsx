import React from "react";
import "@app/index.css";

// Import feature flags and dev overrides
import "@core/services/dev-overrides.ts";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n-config.ts";
import { router } from "@app/routes.tsx";
import { useDeviceStore } from "@core/stores";
import { type createRouter, RouterProvider } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { initDatabase, resetConnectionStatuses } from "@db/index";

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// Initialize database before app starts
initDatabase()
  .then(() => resetConnectionStatuses())
  .catch((error) => {
    console.error("[App] Failed to initialize database:", error);
  });

function IndexPage() {
  enableMapSet();
  const deviceStore = useDeviceStore();
  const translation = useTranslation();

  const context = React.useMemo(
    () => ({
      stores: {
        device: deviceStore,
      },
      i18n: translation,
    }),
    [deviceStore, translation],
  );

  return (
    <React.StrictMode>
      <Suspense fallback={null}>
        <RouterProvider router={router} context={context} />
      </Suspense>
    </React.StrictMode>
  );
}

root.render(<IndexPage />);
