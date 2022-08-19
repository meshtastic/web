import type React from "react";

import { Pane } from "evergreen-ui";
import { MapProvider } from "react-map-gl";

import { AppLayout } from "@components/layout/AppLayout.js";

import { PageRouter } from "./PageRouter.js";

export const App = (): JSX.Element => {
  return (
    <Pane display="flex">
      <AppLayout>
        <MapProvider>
          <PageRouter />
        </MapProvider>
      </AppLayout>
    </Pane>
  );
};
