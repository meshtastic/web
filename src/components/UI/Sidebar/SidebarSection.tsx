import type { LucideIcon } from "lucide-react";

export interface SidebarSectionProps {
  title: string;
  action?: {
    icon: LucideIcon;
    onClick: () => void;
  };
  subheader?: string;
  children: React.ReactNode;
}

export const SidebarSection = ({
  title,
  action,
  children
}: SidebarSectionProps): JSX.Element => (
  <div className="space-y-1.5">
    <div className="mb-2 flex items-center justify-between px-2">
      <div className="font-medium">{title}</div>
      {action && (
        <button
          className="transition-all duration-300 hover:text-accent"
          onClick={() => action.onClick}
        >
          <action.icon size={16} />
        </button>
      )}
    </div>
    <ul className="space-y-1">{children}</ul>
  </div>
);
