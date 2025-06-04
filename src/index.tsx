import "@app/index.css";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n/config.ts";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@app/routes.tsx";

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

enableMapSet();

const router = createRouter({
  routeTree,
});

root.render(
  <StrictMode>
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
