import { useAppStore } from "@app/core/stores/appStore.js";
import type React from "react";

export interface ThemeControllerProps {
  children: React.ReactNode;
}

export const ThemeController = ({
  children
}: ThemeControllerProps): JSX.Element => {
  const { darkMode, accent } = useAppStore();

  return (
    <div data-theme={darkMode ? "dark" : "light"} data-accent={accent}>
      {children}
    </div>
  );
};
