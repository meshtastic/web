import { render } from "@testing-library/react";
import type { ReactElement } from "react";

function customRender(ui: ReactElement, options = {}) {
  return render(ui, {
    // wrapper: ({ children }) => <MapProvider>{children}</MapProvider>,
    ...options,
  });
}

export * from "@testing-library/react";
export { customRender as render };
