import "@app/index.css";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/App.tsx";
import "./i18n/config.ts";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

enableMapSet();

root.render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>,
  </StrictMode>,
);
