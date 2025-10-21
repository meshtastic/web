export { ThemeProvider, useTheme } from "@/components/theme-provider";
export * from "@/components/ui/badge.tsx";
export * from "@/components/ui/sidebar";
export { AppSidebar } from "./lib/components/index.ts";

// Types
export type {
  AppSidebarProps,
  NavLink,
  SidebarSectionProps,
} from "./lib/components/Sidebar/AppSidebar.tsx";

export { ThemeToggle } from "./lib/components/theme-toggle.tsx";
