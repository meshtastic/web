import type { ReactElement } from "react";
import type { FilterOption } from "./Filter";

export type ContactFilterType =
  | "all"
  | "online"
  | "favorites"
  | "direct"
  | "channels";

export interface ContactFilterOption extends FilterOption<ContactFilterType> {
  showUnreadCount?: boolean;
  isOnline?: boolean;
}

export type MessageFilterType = "default" | "unread";

export interface MessageFilterOption extends FilterOption<MessageFilterType> {
  messageCount?: number;
}

export type SortOptions =
  | "favorites"
  | "online"
  | "alphabetical"
  | "last-message";

export interface SortOption {
  id: SortOption;
  label: string;
  icon: ReactElement;
}
