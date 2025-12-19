import type { LucideIcon } from "lucide-react";

export type SortOption =
  | "favorites"
  | "online"
  | "alphabetical"
  | "last-message";

export interface SortOption {
  id: SortOption;
  label: string;
  icon: LucideIcon;
}

export const sortOptions: SortOption[] = [
  { id: "favorites", label: "Favorites", icon: "Star" },
  { id: "online", label: "Online", icon: "Wifi" },
  { id: "alphabetical", label: "A-Z", icon: "ArrowUpDown" },
  { id: "last-message", label: "Recent", icon: "Clock" },
];
