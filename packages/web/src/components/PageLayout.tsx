import { ErrorPage } from "@components/UI/ErrorPage.tsx";
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
  children,
  noPadding,
  contentClassName,
}: PageLayoutProps) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <div className="flex flex-1 text-foreground overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
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
        </div>
      </div>
    </ErrorBoundary>
  );
};
