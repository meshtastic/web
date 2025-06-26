import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import "@app/i18n-config.ts";
import { routeTree } from "../routeTree.gen.ts";

import { DeviceWrapper } from "@app/DeviceWrapper.tsx";

const Providers = () => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/"],
  });

  const router = createRouter({
    routeTree,
    history: memoryHistory,
  });

  return (
    <DeviceWrapper>
      <RouterProvider router={router} />
    </DeviceWrapper>
  );
};

const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: Providers, ...options });

export * from "@testing-library/react";

export { renderWithProviders as render };
