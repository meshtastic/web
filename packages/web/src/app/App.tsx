import { ThemeProvider } from "@app/shared/components/ui/theme-provider.tsx";
import { SidebarProvider } from "@shared/components/ui/sidebar";
import { Toaster } from "@shared/components/Toaster";
import { Outlet } from "@tanstack/react-router";

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
