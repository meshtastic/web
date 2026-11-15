import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@components/shadcn/drawer.tsx";
import { useAppStore, useDeviceStore } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConnectionsList } from "./ConnectionsList.tsx";

export interface ConnectionsDrawerProps {
  /**
   * No device is connected: the drawer stays open with no way to dismiss it,
   * replacing the old full-page Connections screen.
   */
  forced: boolean;
}

/**
 * The Connections drawer. An overlay over whatever page is showing; its open
 * state and view live in the app store, never in the URL.
 */
export function ConnectionsDrawer({ forced }: ConnectionsDrawerProps) {
  const { t } = useTranslation("connections");
  const storeOpen = useAppStore((s) => s.connectionsDrawer.open);
  const closeConnections = useAppStore((s) => s.closeConnections);
  const count = useDeviceStore((s) => s.savedConnections.length);
  const open = forced || storeOpen;

  return (
    <Drawer
      direction="right"
      open={open}
      dismissible={!forced}
      onOpenChange={(next) => {
        if (!next && !forced) {
          closeConnections();
        }
      }}
    >
      <DrawerContent
        data-shadcn-scope=""
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (forced) {
            event.preventDefault();
          }
        }}
        className={cn(
          // Floating inset panel on the right at every size.
          "inset-y-2 right-2 h-auto rounded-2xl border border-border bg-background text-foreground shadow-2xl",
          "w-[min(calc(100vw-16px),440px)]",
          "motion-reduce:transition-none!",
          "data-[vaul-drawer-direction=right]:w-[min(calc(100vw-16px),440px)] data-[vaul-drawer-direction=right]:sm:max-w-none",
        )}
      >
        <DrawerHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5 pb-3 text-left md:text-left">
          <div className="min-w-0">
            <DrawerTitle className="flex items-baseline gap-2 text-2xl font-bold tracking-tight">
              {t("drawer.title")}
              <span className="text-base font-medium tabular-nums text-muted-foreground">
                {count}
              </span>
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("page.description")}
            </DrawerDescription>
          </div>
          {forced ? null : (
            <DrawerClose
              aria-label={t("drawer.close")}
              className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-5" />
            </DrawerClose>
          )}
        </DrawerHeader>
        <div className="@container min-h-0 flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <ConnectionsList />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
