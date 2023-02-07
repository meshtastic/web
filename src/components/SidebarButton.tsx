import { cn } from "@app/core/utils/cn.js";

export interface SidebarButtonProps {
  active: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

export const SidebarButton = ({
  active,
  onClick,
  children
}: SidebarButtonProps): JSX.Element => (
  <li className="aspect-w-1 aspect-h-1 w-full" onClick={onClick}>
    <div
      className={cn(
        "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-full ring ring-accent",
        active ? "ring" : "ring-0"
      )}
    >
      {children}
    </div>
  </li>
);
