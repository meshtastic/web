import { useAppStore } from "@core/stores/appStore.js";
import type { ReactNode } from "react";

export interface ThemeControllerProps {
  children: ReactNode;
}

export const ThemeController = ({
  children,
}: ThemeControllerProps): JSX.Element => {
  const { darkMode, accent } = useAppStore();

  return (
    <div data-theme={darkMode ? "dark" : "light"} data-accent={accent}>
      {children}
    </div>
  );
};
