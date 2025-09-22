import type { LucideIcon } from "lucide-react";
import { create } from "zustand";

export type ActionItem = {
  key: string;
  icon?: LucideIcon;
  iconClasses?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  label?: string;
  className?: string;
};

type HeaderState = {
  title: string;
  actions: ActionItem[];
  setTitle: (title: string) => void;
  setActions: (actions: ActionItem[]) => void;
  reset: () => void;
};

export const useHeaderStore = create<HeaderState>((set) => ({
  title: "",
  actions: [],
  setTitle: (title) => set({ title }),
  setActions: (actions) => set({ actions }),
  reset: () => set({ title: "", actions: [] }),
}));
