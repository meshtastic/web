import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@components/shadcn/drawer.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { useConnections } from "@app/pages/Connections/useConnections";
import { ArrowLeft, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AddConnectionForm } from "./AddConnectionForm.tsx";
import { ConnectionsList } from "./ConnectionsList.tsx";

export interface ConnectionsDrawerProps {
  /**
   * No device is connected: the drawer stays open with no way to dismiss it,
   * replacing the old full-page Connections screen.
   */
  forced: boolean;
}

const iconButtonClasses =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The Connections drawer. An overlay over whatever page is showing; its open
 * state and view live in the app store, never in the URL.
 */
export function ConnectionsDrawer({ forced }: ConnectionsDrawerProps) {
  const storeOpen = useAppStore((s) => s.connectionsDrawer.open);
  const closeConnections = useAppStore((s) => s.closeConnections);
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
          "motion-reduce:transition-none!",
          "data-[vaul-drawer-direction=right]:w-[min(calc(100vw-16px),440px)] data-[vaul-drawer-direction=right]:sm:max-w-none",
        )}
      >
        <DrawerBody forced={forced} />
      </DrawerContent>
    </Drawer>
  );
}

/** Mounted only while the drawer is open, so each opening starts fresh. */
function DrawerBody({ forced }: { forced: boolean }) {
  const { t } = useTranslation("connections");
  const { toast } = useToast();
  const view = useAppStore((s) => s.connectionsDrawer.view);
  const setConnectionsView = useAppStore((s) => s.setConnectionsView);
  const closeConnections = useAppStore((s) => s.closeConnections);
  const count = useDeviceStore((s) => s.savedConnections.length);
  const { addConnectionAndConnect } = useConnections();
  const isURLHTTPS = useMemo(() => location.protocol === "https:", []);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Set when a view is popped, so the list can return focus to its trigger.
  const returnFocusToAdd = useRef(false);

  const isList = view === "list";

  // Focus: the title on push, the "Add connection" button on pop.
  useEffect(() => {
    if (!isList) {
      titleRef.current?.focus();
    } else if (returnFocusToAdd.current) {
      returnFocusToAdd.current = false;
      addButtonRef.current?.focus();
    }
  }, [isList]);

  const goBack = () => {
    returnFocusToAdd.current = true;
    setConnectionsView("list");
  };

  return (
    <>
      <DrawerHeader className="flex flex-row items-start gap-2 px-4 pt-4 pb-3 text-left md:text-left">
        {isList ? null : (
          <button
            type="button"
            onClick={goBack}
            aria-label={t("drawer.back")}
            className={cn(iconButtonClasses, "-ml-1")}
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1 self-center">
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="flex items-baseline gap-2 text-2xl font-bold tracking-tight outline-none"
          >
            {isList ? t("drawer.title") : t("drawer.addConnection")}
            {isList ? (
              <span className="text-base font-medium tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {t("page.description")}
          </DrawerDescription>
        </div>
        {forced ? null : (
          <DrawerClose
            aria-label={t("drawer.close")}
            className={cn(iconButtonClasses, "-mr-1")}
          >
            <XIcon className="size-5" />
          </DrawerClose>
        )}
      </DrawerHeader>
      <div className="@container min-h-0 flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {isList ? (
          <ConnectionsList addButtonRef={addButtonRef} />
        ) : (
          <AddConnectionForm
            isHTTPS={isURLHTTPS}
            onSave={async (partial, btDevice) => {
              const created = await addConnectionAndConnect(partial, btDevice);
              if (!created) {
                toast({
                  title: t("toasts.failed"),
                  description: t("toasts.savedCantConnect"),
                });
                return;
              }
              toast({
                title: t("toasts.added"),
                description: t("toasts.savedByName", {
                  name: created.name,
                  interpolation: { escapeValue: false },
                }),
              });
              if (
                created.status === "connected" ||
                created.status === "configured"
              ) {
                closeConnections();
              } else {
                goBack();
              }
            }}
          />
        )}
      </div>
    </>
  );
}
