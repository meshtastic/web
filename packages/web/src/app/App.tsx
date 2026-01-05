import { ThemeProvider } from "@app/shared/components/ui/theme-provider.tsx";
// import { DialogManager } from "@shared/components/Dialog/DialogManager";
import { Toaster } from "@shared/components/Toaster";
import { Outlet } from "@tanstack/react-router";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Toaster />
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
      <Outlet />
    </ThemeProvider>
  );
}
