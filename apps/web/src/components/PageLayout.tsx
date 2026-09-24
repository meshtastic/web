import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { cn } from "@core/utils/cn.ts";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLocation } from "@tanstack/react-router";
import { type LucideIcon, MenuIcon, UsersIcon, XIcon } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";

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

interface MobileBarProps {
  side: "left" | "right";
  label: string;
  closeLabel: string;
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const MobileBar = ({
  side,
  label,
  closeLabel,
  icon: Icon,
  open,
  onOpenChange,
  children,
}: MobileBarProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Trigger
      aria-label={label}
      className="flex shrink-0 items-center rounded-md p-3 text-foreground"
    >
      <Icon className="h-5 w-5" />
    </DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-y-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto",
          "bg-background-primary text-text-primary shadow-xl",
          side === "left" ? "left-0" : "right-0",
        )}
      >
        <DialogPrimitive.Title className="sr-only">
          {label}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-2 right-2 z-10 flex items-center rounded-md p-3 text-foreground"
        >
          <XIcon className="h-5 w-5" />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

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
  const isMobile = useIsMobile();
  const { t } = useTranslation("ui");
  const [leftBarOpen, setLeftBarOpen] = useState(false);
  const [rightBarOpen, setRightBarOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const wasMobile = useRef(isMobile);

  useEffect(() => {
    setLeftBarOpen(false);
    setRightBarOpen(false);
    // Only adopt orphaned focus: the drawer and its trigger unmount with the old
    // route, and again when the breakpoint takes the drawer away.
    const leftMobile = wasMobile.current && !isMobile;
    wasMobile.current = isMobile;
    if ((isMobile || leftMobile) && document.activeElement === document.body) {
      mainRef.current?.focus();
    }
  }, [pathname, isMobile]);

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <div className="flex flex-1 bg-background text-foreground overflow-hidden">
        {/* Left Sidebar */}
        {leftBar && !isMobile && (
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
            {isMobile && leftBar && (
              <MobileBar
                side="left"
                label={t("navigation.title")}
                closeLabel={t("button.close", { ns: "common" })}
                icon={MenuIcon}
                open={leftBarOpen}
                onOpenChange={setLeftBarOpen}
              >
                {leftBar}
              </MobileBar>
            )}

            {/* Header Content */}
            <div className="flex flex-1 items-center justify-between min-w-0">
              <span className="text-lg font-medium text-foreground truncate px-2">
                {label}
              </span>
              <div className="flex items-center space-x-1 md:space-x-2 shrink-0 pr-2 md:pr-6">
                {actions?.map((action) => {
                  return (
                    <button
                      key={action.key}
                      type="button"
                      disabled={action.disabled || action.isLoading}
                      className={cn(
                        "flex items-center space-x-2 py-2 px-3 rounded-md max-md:py-3",
                        "text-foreground transition-colors duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        !action.icon && "max-md:hidden",
                        action.className,
                      )}
                      onClick={action.onClick}
                      aria-label={
                        action.ariaLabel ||
                        action.label ||
                        `Action ${action.key}`
                      }
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
                        <span className="text-sm px-1 pt-0.5 hidden md:inline">
                          {action.label}
                        </span>
                      )}
                    </button>
                  );
                })}

                {isMobile && rightBar && (
                  <MobileBar
                    side="right"
                    label={t("navigation.nodes")}
                    closeLabel={t("button.close", { ns: "common" })}
                    icon={UsersIcon}
                    open={rightBarOpen}
                    onOpenChange={setRightBarOpen}
                  >
                    {rightBar}
                  </MobileBar>
                )}
              </div>
            </div>
          </header>

          <main
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              "flex-1 flex flex-col outline-none",
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
        {rightBar && !isMobile && (
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
