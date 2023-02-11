import { LucideIcon, AlignLeftIcon } from "lucide-react";

export interface PageLayoutProps {
  label: string;
  children: React.ReactNode;
  actions?: {
    icon: LucideIcon;
    onClick: () => void;
  }[];
}

export const PageLayout = ({
  label: title,
  actions,
  children
}: PageLayoutProps): JSX.Element => {
  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 border-b-[0.5px] border-slate-300 dark:border-slate-700 md:h-16 md:px-4">
        <button className="pl-4 transition-all hover:text-accent md:hidden">
          <AlignLeftIcon />
        </button>
        <div className="flex flex-1 items-center justify-between px-4 md:px-0">
          <div className="flex w-full items-center">
            <span className="w-full text-lg font-medium">{title}</span>
            <div className="flex justify-end space-x-4">
              {actions?.map((action) => (
                <button
                  className="transition-all hover:text-accent"
                  onClick={action.onClick}
                >
                  <action.icon />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
