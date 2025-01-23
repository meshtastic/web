import { cn } from "@app/core/utils/cn";
import { Button } from "@components/UI/Button.tsx";
import type { LucideIcon } from "lucide-react";
import type { JSX } from "react";

export interface SidebarButtonProps {
  label: string;
  active?: boolean;
  Icon?: LucideIcon;
  element?: JSX.Element;
  onClick?: () => void;
  className?: string;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  element,
  onClick,
  className
}: SidebarButtonProps): JSX.Element => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className={cn("w-full justify-start gap-2", className)}
  >
    {Icon && <Icon size={16} />}
    {element && element}
    {label}
  </Button>
);
