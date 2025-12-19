import { Mail, MessageSquare } from "lucide-react";
import type { FilterOption } from "./Filter.tsx";
import type { MessageFilterType } from "./FilterTypes.ts";

export const messageFilterOptions: FilterOption<MessageFilterType>[] = [
  { id: "default", label: "default", icon: MessageSquare },
  { id: "unread", label: "Unread Only", icon: Mail },
];
