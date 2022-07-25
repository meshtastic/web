import type React from "react";

import { Pane } from "evergreen-ui";

import { AppLayout } from "@components/layout/AppLayout.js";

import { PageRouter } from "./PageRouter.js";

export const App = (): JSX.Element => {
  return (
    <Pane display="flex">
      <AppLayout>
        <PageRouter />
      </AppLayout>
    </Pane>
  );
};
