import React from "react";
import "@app/index.css";

// Import feature flags and dev overrides
import "@core/services/dev-overrides.ts";
import "maplibre-gl/dist/maplibre-gl.css";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n-config.ts";
import { router } from "@app/routes.tsx";
import { TabLockGate } from "@components/TabLockGate.tsx";
import { meshRegistry } from "@core/kmp/registry.ts";
import { useAppStore } from "@core/stores";
import { createBrowserTabLock } from "@core/tabLock.ts";
import { disconnectAllConnections } from "@app/pages/Connections/useConnections.ts";
import { MeshRegistryProvider } from "@core/kmp/hooks";
import { type createRouter, RouterProvider } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
const tabLock = createBrowserTabLock(disconnectAllConnections);
tabLock.start();

function IndexPage() {
  const appStore = useAppStore();
  const translation = useTranslation();

  const context = React.useMemo(
    () => ({
      stores: {
        app: appStore,
      },
      i18n: translation,
    }),
    [appStore, translation],
  );

  return (
    <React.StrictMode>
      <Suspense fallback={null}>
        <MeshRegistryProvider registry={meshRegistry}>
          <RouterProvider router={router} context={context} />
        </MeshRegistryProvider>
      </Suspense>
    </React.StrictMode>
  );
}

root.render(
  <TabLockGate lock={tabLock}>
    <IndexPage />
  </TabLockGate>,
);
