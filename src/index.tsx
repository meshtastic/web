import "@app/index.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { StrictMode } from "react";
import { enableMapSet } from "immer";
import { createRoot } from "react-dom/client";

import { App } from "@app/App.js";

// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

enableMapSet();

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
