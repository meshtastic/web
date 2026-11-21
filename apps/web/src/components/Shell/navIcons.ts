import {
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  NetworkIcon,
  SettingsIcon,
} from "lucide-react";
import type { NavDestination } from "./navItems.ts";

/** Icon per top-level destination, shared by the rail and the tab bar. */
export const navIcons = {
  messages: MessageSquareIcon,
  nodes: NetworkIcon,
  map: MapIcon,
  settings: SettingsIcon,
} as const satisfies Record<NavDestination, LucideIcon>;
