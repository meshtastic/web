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
import { useAppStore, useMessageStore } from "@core/stores";
import { type createRouter, RouterProvider } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

function IndexPage() {
  enableMapSet();
  const appStore = useAppStore();
  const messageStore = useMessageStore();
  const translation = useTranslation();

  const context = React.useMemo(
    () => ({
      stores: {
        app: appStore,
        message: messageStore,
      },
      i18n: translation,
    }),
    [appStore, messageStore, translation],
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
