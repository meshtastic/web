import { ThemeProvider } from "@app/shared/components/ui/theme-provider.tsx";
import { setupMessageHooks } from "@core/services/setupMessageHooks";
import { SidebarProvider } from "@shared/components/ui/sidebar";
import { Toaster } from "@shared/components/Toaster";
import { Outlet } from "@tanstack/react-router";

// Initialize message hooks once at app startup
setupMessageHooks();

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <SidebarProvider className="flex h-screen">
        <Toaster />
        <Outlet />
      </SidebarProvider>
    </ThemeProvider>
  );
}
