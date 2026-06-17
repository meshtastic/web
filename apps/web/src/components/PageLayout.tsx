import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { cn } from "@core/utils/cn.ts";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { ErrorBoundary } from "react-error-boundary";

export interface ActionItem {
  key: string;
  icon?: LucideIcon;
  iconClasses?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  label?: string;
  className?: string;
}

export interface PageLayoutProps {
  label: string;
  actions?: ActionItem[];
  children: React.ReactNode;
  leftBar?: React.ReactNode;
  rightBar?: React.ReactNode;
  noPadding?: boolean;
  leftBarClassName?: string;
  rightBarClassName?: string;
  topBarClassName?: string;
  contentClassName?: string;
}

export const PageLayout = ({
  label,
  actions,
  children,
  leftBar,
  rightBar,
  noPadding,
  leftBarClassName,
  rightBarClassName,
  topBarClassName,
  contentClassName,
}: PageLayoutProps) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <div className="flex flex-1 bg-background text-foreground overflow-hidden">
        {/* Left Sidebar */}
        {leftBar && (
          <aside
            className={cn(
              "px-2 pr-0 shrink-0 border-r-[0.5px] border-slate-300 dark:border-slate-700 ",
              leftBarClassName,
            )}
          >
            {leftBar}
          </aside>
        )}

        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header
            className={cn(
              "flex h-14 shrink-0 mt-2 p-2 items-center border-b border-slate-300 dark:border-slate-700",
              topBarClassName,
            )}
          >
            {/* Header Content */}
            <div className="flex flex-1 items-center justify-between min-w-0">
              <span className="text-lg font-medium text-foreground truncate px-2">
                {label}
              </span>
              <div className="flex items-center space-x-1 md:space-x-2 shrink-0 pr-6">
                {actions?.map((action) => {
                  return (
                    <button
                      key={action.key}
                      type="button"
                      disabled={action.disabled || action.isLoading}
                      className={cn(
                        "flex items-center space-x-2 py-2 px-3 rounded-md",
                        "text-foreground transition-colors duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        action.className,
                      )}
                      onClick={action.onClick}
                      aria-label={action.ariaLabel || `Action ${action.key}`}
                      aria-disabled={action.disabled}
                      aria-busy={action.isLoading}
                    >
                      {action.icon &&
                        (action.isLoading ? (
                          <Spinner size="md" />
                        ) : (
                          <action.icon
                            className={cn("h-5 w-5", action.iconClasses)}
                          />
                        ))}
                      {action.label && (
                        <span className="text-sm px-1 pt-0.5">
                          {action.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main
            className={cn(
              "flex-1 flex flex-col",
              "overflow-hidden",
              !noPadding && "px-2",
              contentClassName,
            )}
          >
            {children}
          </main>
          <Footer />
        </div>

        {/* Right Sidebar */}
        {rightBar && (
          <aside
            className={cn(
              "w-56 lg:w-[270px] text-balance shrink-0 border-l border-slate-300 dark:border-slate-700 px-2 overflow-hidden",
              rightBarClassName,
            )}
          >
            {rightBar}
          </aside>
        )}
      </div>
    </ErrorBoundary>
  );
};
