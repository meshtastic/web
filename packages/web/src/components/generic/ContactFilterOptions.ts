import type { FilterOption } from "./Filter.tsx";
import type { ContactFilterType } from "./FilterTypes.ts";

export const contactFilterOptions: FilterOption<ContactFilterType>[] = [
  { id: "all", label: "All Contacts", icon: "Users" },
  { id: "online", label: "Online Only", icon: "Wifi", isOnline: true },
  { id: "favorites", label: "Favorites Only", icon: "Heart", isFavorite: true },
  { id: "direct", label: "Direct Messages", icon: "MessageSquare" },
  { id: "channels", label: "Channels", icon: "Hash" },
];
