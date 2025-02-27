import { scan } from "react-scan";
import "@app/index.css";
import { enableMapSet } from "immer";
import "maplibre-gl/dist/maplibre-gl.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/App.tsx";

// run react scan tool in development mode only
// react scan must be the first import and the first line in this file in order to work properly
import.meta.env.VITE_DEBUG_SCAN &&
  scan({
    enabled: true,
  });

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

enableMapSet();

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
