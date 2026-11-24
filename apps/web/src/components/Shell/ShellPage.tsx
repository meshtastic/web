import { IconButton } from "@components/UI/IconButton.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import {
  useCanFitDetailsColumn,
  useIsMobile,
} from "@core/hooks/useIsMobile.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useDetailsWidth } from "@core/shell/useDetailsWidth.ts";
import { cn } from "@core/utils/cn.ts";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useLocation, useMatches } from "@tanstack/react-router";
import { type LucideIcon, MenuIcon, PanelRightIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { DetailsResizeHandle } from "./DetailsResizeHandle.tsx";
import { MobileHeaderControls } from "./MobileHeaderControls.tsx";
import { shouldHideTabBar } from "./navItems.ts";

interface ActionItemBase {
  key: string;
  icon?: LucideIcon;
  iconClasses?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

/** A header action: named by its visible label, or by `ariaLabel` if icon-only. */
export type ActionItem = ActionItemBase &
  (
    | { label: string; ariaLabel?: string }
    | { label?: undefined; ariaLabel: string }
  );

export interface ShellPageProps {
  /** Page title shown in the main header. */
  label: string;
  /**
   * Keep the title for assistive tech only, when the page draws its own
   * visible heading.
   */
  hideLabel?: boolean;
  /** Before the title, e.g. a back button on a mobile sub-screen. */
  leading?: ReactNode;
  /** After the title, before the actions, e.g. a Save button. */
  trailing?: ReactNode;
  actions?: ActionItem[];
  children: ReactNode;
  /** Route-specific sidebar content (~300px column, drawer on mobile). */
  sidebar?: ReactNode;
  /** Accessible name of the sidebar and its mobile drawer trigger. */
  sidebarLabel?: string;
  /** Pinned under the sidebar's scrolling content, e.g. the device card. */
  sidebarFooter?: ReactNode;
  /**
   * Toggleable details panel: a resizable column (320px by default) from
   * `lg`, a drawer below.
   */
  details?: ReactNode;
  detailsLabel?: string;
  /**
   * Bump to show the details panel where it is a drawer (phones,
   * tablets), e.g. when a list row is picked. The column is opened through
   * the remembered toggle instead.
   */
  detailsDrawerRequest?: number;
  noPadding?: boolean;
  contentClassName?: string;
}

/** Remembered across pages and reloads. */
export const DETAILS_PANEL_STORAGE_KEY = "meshtastic:detailsPanelOpen";

const readBoolean = (value: string): boolean => value === "true";

/** The desktop sidebar's width (`w-[300px]`), for the details column's room. */
const SIDEBAR_WIDTH = 300;

interface MobileDrawerProps {
  side: "left" | "right";
  label: string;
  closeLabel: string;
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const MobileDrawer = ({
  side,
  label,
  closeLabel,
  icon: Icon,
  open,
  onOpenChange,
  children,
}: MobileDrawerProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Trigger
      aria-label={label}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-primary hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Icon aria-hidden="true" className="size-5" />
    </DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-xs" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-y-0 z-50 flex w-[300px] max-w-[85vw] flex-col overflow-hidden",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          "bg-surface text-primary shadow-dialog",
          side === "left"
            ? "left-0 pl-[env(safe-area-inset-left)]"
            : "right-0 pr-[env(safe-area-inset-right)]",
        )}
      >
        <DialogPrimitive.Title className="sr-only">
          {label}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-[calc(0.5rem+env(safe-area-inset-top))] right-2 z-10 flex size-11 cursor-pointer items-center justify-center rounded-control text-muted hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <XIcon aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

const SidebarColumn = ({
  content,
  footer,
}: {
  content: ReactNode;
  footer?: ReactNode;
}) => (
  <>
    <div className="min-h-0 flex-1 overflow-y-auto px-2">{content}</div>
    {footer}
  </>
);

/**
 * One route's slice of the app shell, next to the rail:
 * `[sidebar ~300px][main][details 320px, toggleable and resizable]`. Below
 * `md` the sidebar becomes a drawer, and below `lg` the details do too.
 */
export const ShellPage = ({
  label,
  hideLabel = false,
  leading,
  trailing,
  actions,
  children,
  sidebar,
  sidebarLabel,
  sidebarFooter,
  details,
  detailsLabel,
  detailsDrawerRequest,
  noPadding,
  contentClassName,
}: ShellPageProps) => {
  const isMobile = useIsMobile();
  const fitsDetailsColumn = useCanFitDetailsColumn();
  // Phones and tablets: the details panel slides in rather than squeezing
  // the conversation.
  const detailsAsDrawer = isMobile || !fitsDetailsColumn;
  // A full-screen sub-page (conversation, settings section) keeps its header
  // to back, title and its own actions, as the tab bar is hidden there too.
  const fullScreen = useMatches({ select: shouldHideTabBar });
  const { t } = useTranslation("ui");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useLocalStorage<boolean>(
    DETAILS_PANEL_STORAGE_KEY,
    true,
    { serializer: String, deserializer: readBoolean },
  );
  const pathname = useLocation({ select: (location) => location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const detailsWidth = useDetailsWidth(
    rowRef,
    sidebar && !isMobile ? SIDEBAR_WIDTH : 0,
  );
  // The width being dragged, shown live and stored on release.
  const [draftWidth, setDraftWidth] = useState<number | undefined>(undefined);
  const wasMobile = useRef(isMobile);
  const detailsId = useId();

  const sidebarName = sidebarLabel ?? t("navigation.title");
  const detailsName = detailsLabel ?? t("shell.details");
  const closeLabel = t("button.close", { ns: "common" });

  // Navigating or crossing the breakpoint closes any open drawer.
  const layoutKey = `${pathname}|${isMobile}|${detailsAsDrawer}`;
  const [drawersKey, setDrawersKey] = useState(layoutKey);
  if (drawersKey !== layoutKey) {
    setDrawersKey(layoutKey);
    setSidebarOpen(false);
    setMobileDetailsOpen(false);
  }
  const [seenDrawerRequest, setSeenDrawerRequest] =
    useState(detailsDrawerRequest);
  if (seenDrawerRequest !== detailsDrawerRequest) {
    setSeenDrawerRequest(detailsDrawerRequest);
    if (detailsDrawerRequest !== undefined && detailsAsDrawer) {
      setMobileDetailsOpen(true);
    }
  }

  useEffect(() => {
    // Only adopt orphaned focus: the drawer and its trigger unmount with the old
    // route, and again when the breakpoint takes the drawer away.
    const leftMobile = wasMobile.current && !isMobile;
    wasMobile.current = isMobile;
    if ((isMobile || leftMobile) && document.activeElement === document.body) {
      mainRef.current?.focus();
    }
  }, [pathname, isMobile]);

  const showDetailsColumn = Boolean(details) && !detailsAsDrawer && detailsOpen;

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <div
        ref={rowRef}
        className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-chat text-primary"
      >
        {sidebar && !isMobile ? (
          <aside
            aria-label={sidebarName}
            className="flex w-[300px] min-w-[260px] shrink-0 flex-col border-r border-subtle bg-surface"
          >
            <SidebarColumn content={sidebar} footer={sidebarFooter} />
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-1 border-b border-subtle p-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
            {isMobile && sidebar ? (
              <MobileDrawer
                side="left"
                label={sidebarName}
                closeLabel={closeLabel}
                icon={MenuIcon}
                open={sidebarOpen}
                onOpenChange={setSidebarOpen}
              >
                <div className="flex min-h-0 flex-1 flex-col pt-14">
                  <SidebarColumn content={sidebar} footer={sidebarFooter} />
                </div>
              </MobileDrawer>
            ) : null}

            {leading}
            {/* A hidden label leaves the room to `leading`, e.g. a chat's
                name and status line. */}
            <div
              className={cn(
                "flex min-w-0 items-center justify-between",
                hideLabel ? "ml-auto shrink-0" : "flex-1",
              )}
            >
              <span
                className={cn(
                  "truncate px-2 text-header-lg font-semibold",
                  hideLabel && "sr-only",
                )}
              >
                {label}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
                {trailing}
                {actions?.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled={action.disabled || action.isLoading}
                    className={cn(
                      "flex items-center gap-2 rounded-control px-3 py-2 max-md:py-3",
                      "text-primary transition-colors duration-200",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      !action.icon && "max-md:hidden",
                      action.className,
                    )}
                    onClick={action.onClick}
                    aria-label={action.ariaLabel ?? action.label}
                    aria-disabled={action.disabled}
                    aria-busy={action.isLoading}
                  >
                    {action.icon &&
                      (action.isLoading ? (
                        <Spinner size="md" />
                      ) : (
                        <action.icon
                          aria-hidden="true"
                          className={cn("size-5", action.iconClasses)}
                        />
                      ))}
                    {action.label && (
                      <span className="hidden px-1 pt-0.5 text-body md:inline">
                        {action.label}
                      </span>
                    )}
                  </button>
                ))}

                {details && !detailsAsDrawer ? (
                  <IconButton
                    aria-label={detailsName}
                    aria-pressed={detailsOpen}
                    aria-controls={detailsOpen ? detailsId : undefined}
                    variant="rail"
                    icon={<PanelRightIcon className="size-5" />}
                    onClick={() => setDetailsOpen((open) => !open)}
                  />
                ) : null}

                {details && detailsAsDrawer ? (
                  <MobileDrawer
                    side="right"
                    label={detailsName}
                    closeLabel={closeLabel}
                    icon={PanelRightIcon}
                    open={mobileDetailsOpen}
                    onOpenChange={setMobileDetailsOpen}
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-14">
                      {details}
                    </div>
                  </MobileDrawer>
                ) : null}

                {isMobile && !fullScreen ? <MobileHeaderControls /> : null}
              </div>
            </div>
          </header>

          <main
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              "flex flex-1 flex-col overflow-hidden outline-none",
              !noPadding && "px-2",
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>

        {showDetailsColumn ? (
          <aside
            id={detailsId}
            aria-label={detailsName}
            style={{ width: draftWidth ?? detailsWidth.width }}
            className="relative flex shrink-0 flex-col border-l border-subtle bg-surface"
          >
            <DetailsResizeHandle
              label={t("shell.resizeDetails", { name: detailsName })}
              width={draftWidth ?? detailsWidth.width}
              min={detailsWidth.min}
              max={detailsWidth.max}
              onDraft={setDraftWidth}
              onResize={detailsWidth.setWidth}
              onReset={detailsWidth.reset}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-2">{details}</div>
          </aside>
        ) : null}
      </div>
    </ErrorBoundary>
  );
};
