import { cn } from "@app/core/utils/cn.ts";
import { AlignLeftIcon, type LucideIcon } from "lucide-react";
import Footer from "./UI/Footer";

export interface PageLayoutProps {
  label: string;
  noPadding?: boolean;
  children: React.ReactNode;
  actions?: {
    icon: LucideIcon;
    iconClasses?: string;
    onClick: () => void;
  }[];
}

export const PageLayout = ({
  label,
  noPadding,
  actions,
  children,
}: PageLayoutProps): JSX.Element => {
  return (
    <>
      <div className="relative flex h-full w-full flex-col">
        <div className="flex h-14 shrink-0 border-b-[0.5px]  border-slate-300 dark:border-slate-700 md:h-16 md:px-4">
          <button
            type="button"
            className="pl-4 transition-all hover:text-accent md:hidden"
          >
            <AlignLeftIcon />
          </button>
          <div className="flex flex-1 items-center justify-between px-4 md:px-0">
            <div className="flex w-full items-center">
              <span className="w-full text-lg font-medium">{label}</span>
              <div className="flex justify-end space-x-4">
                {actions?.map((action, index) => (
                  <button
                    key={action.icon.displayName}
                    type="button"
                    className="transition-all hover:text-accent"
                    onClick={action.onClick}
                  >
                    <action.icon className={action.iconClasses} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "flex h-full w-full flex-col overflow-y-auto",
            !noPadding && "pl-3 pr-3 ",
          )}
        >
          {children}
          <Footer />
        </div>
      </div>
    </>
  );
};
