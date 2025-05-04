import React from "react";
import { cn } from "@core/utils/cn.ts";
import { type LucideIcon } from "lucide-react";
import Footer from "@components/UI/Footer.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";

export interface ActionItem {
  key: string;
  icon: LucideIcon;
  iconClasses?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
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
              <div className="flex items-center space-x-3 md:space-x-4 shrink-0">
                {actions?.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled={action.disabled || action.isLoading}
                    className="text-foreground transition-colors hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={action.onClick}
                    aria-label={action.ariaLabel || `Action ${action.key}`}
                    aria-disabled={action.disabled}
                    aria-busy={action.isLoading}
                  >
                    <div className="mr-6">
                      {action.isLoading ? <Spinner size="md" /> : (
                        <action.icon
                          className={cn("h-5 w-5", action.iconClasses)}
                        />
                      )}
                    </div>
                  </button>
                ))}
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
              "w-48 lg:w-[270px] shrink-0 border-l border-slate-300 dark:border-slate-700 px-2 overflow-hidden",
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
