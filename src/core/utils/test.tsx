import {
  createMemoryHistory,
  createRouter,
  Outlet,
  RootRoute,
  Route,
  RouterProvider,
} from "@tanstack/react-router";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import type { FunctionComponent, ReactElement, ReactNode } from "react";

// a root route for the test router.
const rootRoute = new RootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  ui?: ReactElement;
}

let currentRouter: ReturnType<typeof createRouter> | null = null;

/**
 * Custom render function for testing components that need TanStack Router context.
 * @param ui The main ReactElement to render (your component under test).
 * @param options Custom render options including initialEntries for the router.
 * @returns An object containing the testing-library render result and the router instance.
 */
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  const { initialEntries = ["/"], ...renderOptions } = options;

  // A specific route that renders the component under test (ui).
  // It defaults to the first path in initialEntries or '/'.
  const testComponentRoute = new Route({
    getParentRoute: () => rootRoute,
    path: initialEntries[0] || "/",
    component: () => ui, // The component passed to render will be the element for this route
  });

  const routeTree = rootRoute.addChildren([testComponentRoute]);

  const router = createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree,
    // You can add default error components or other router options if needed for tests.
    // defaultErrorComponent: ({ error }) => <div>Test Error: {error.message}</div>,
  });

  currentRouter = router; // Store the router instance for access in tests

  const Wrapper: FunctionComponent<{ children?: ReactNode }> = (
    { children },
  ) => {
    return (
      <>
        <RouterProvider router={router} />
        {children}
      </>
    );
  };

  const renderResult = rtlRender(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    router,
  };
};

export * from "@testing-library/react";
export { customRender as render };
export const getTestRouter = () => currentRouter;
