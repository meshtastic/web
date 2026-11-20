import { TimeAgo } from "@app/components/generic/TimeAgo";
import type {
  Connection,
  ConnectionId,
} from "@app/core/stores/deviceStore/types";
import { useConnections } from "@app/pages/Connections/useConnections";
import {
  connectionTypeIcon,
  formatConnectionSubtext,
  testHttpReachable,
} from "@app/pages/Connections/utils";
import { CertificateGuide } from "@components/CertificateGuide.tsx";
import { Button } from "@components/UI/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import { useAppStore } from "@core/stores";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import {
  LinkIcon,
  MoreHorizontal,
  PlusIcon,
  RotateCw,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import {
  createElement,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

/** Tonal, rounded surface shared by cards and the empty state. */
const surfaceClasses =
  "rounded-xl bg-slate-100 ring-1 ring-border ring-inset dark:bg-slate-800";

const primaryButtonClasses =
  "h-auto min-h-11 gap-2 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 focus:ring-ring dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90";

const secondaryButtonClasses =
  "h-auto min-h-11 gap-2 rounded-xl bg-background px-4 text-foreground ring-1 ring-input ring-inset hover:bg-muted focus:ring-ring dark:bg-background dark:text-foreground dark:hover:bg-muted";

const destructiveButtonClasses =
  "h-auto min-h-11 gap-2 rounded-xl bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90 focus:ring-ring dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/90";

export interface ConnectionsListProps {
  /** The "Add connection" button, so the drawer can return focus to it. */
  addButtonRef?: RefObject<HTMLButtonElement | null>;
}

/** Where focus goes once a row is deleted: a row's menu button, or Add. */
type FocusTarget = { row: ConnectionId } | "add";

export const ConnectionsList = ({ addButtonRef }: ConnectionsListProps) => {
  const {
    connections,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  } = useConnections();
  const { toast } = useToast();
  const closeConnections = useAppStore((s) => s.closeConnections);
  const setConnectionsView = useAppStore((s) => s.setConnectionsView);
  const { t } = useTranslation("connections");
  // The one connection whose actions are swapped for the delete strip.
  const [confirmingId, setConfirmingId] = useState<ConnectionId | undefined>(
    undefined,
  );
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<FocusTarget | undefined>(undefined);

  // On first mount, sync statuses and refresh
  useEffect(() => {
    syncConnectionStatuses();
    refreshStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const copy = [...connections];
    return copy.sort((a, b) => {
      if (a.isDefault && !b.isDefault) {
        return -1;
      }
      if (!a.isDefault && b.isDefault) {
        return 1;
      }
      const aConnected = a.status === "connected" || a.status === "configured";
      const bConnected = b.status === "connected" || b.status === "configured";
      if (aConnected && !bConnected) {
        return -1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [connections]);

  // After a delete the rows have re-rendered; move focus to the chosen one.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = undefined;
    if (target === "add") {
      addButtonRef?.current?.focus();
      return;
    }
    const row = listRef.current?.querySelector(
      `[data-connection-id="${target.row}"] [data-row-focus]`,
    );
    if (row instanceof HTMLElement) {
      row.focus();
    }
  }, [connections, addButtonRef]);

  const focusTargetAfter = (index: number): FocusTarget => {
    const next = sorted[index + 1] ?? sorted[index - 1];
    return next ? { row: next.id } : "add";
  };

  const connectAndClose = async (c: Connection, failureKey: string) => {
    const ok = await connect(c.id, { allowPrompt: true });
    // Success needs no toast: the connecting overlay shows it.
    if (ok) {
      closeConnections();
    } else {
      toast({
        title: t("toasts.failed"),
        description: t(failureKey),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Toolbar: description beside the primary action once there is room. */}
      <div className="flex flex-col gap-3 @sm:flex-row @sm:items-center @sm:justify-between">
        <p className="min-w-0 text-sm text-muted-foreground @sm:flex-1">
          {t("page.description")}
        </p>
        <Button
          ref={addButtonRef}
          onClick={() => setConnectionsView("add")}
          className={cn(primaryButtonClasses, "shrink-0")}
        >
          <PlusIcon className="size-5" />
          {t("drawer.addConnection")}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div
          className={cn(
            surfaceClasses,
            "flex flex-col items-start gap-3 p-5 @md:p-6",
          )}
        >
          <h3 className="text-base font-semibold @md:text-lg">
            {t("noConnections.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("noConnections.description")}
          </p>
        </div>
      ) : (
        <ul
          ref={listRef}
          className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-3"
        >
          {sorted.map((c, index) => (
            <li key={c.id} className="min-w-0" data-connection-id={c.id}>
              <ConnectionCard
                connection={c}
                confirmingDelete={confirmingId === c.id}
                onRequestDelete={() => setConfirmingId(c.id)}
                onCancelDelete={() => setConfirmingId(undefined)}
                onConnect={() => connectAndClose(c, "toasts.checkConnection")}
                onRetry={() => connectAndClose(c, "toasts.pickConnectionAgain")}
                onDisconnect={() => disconnect(c.id)}
                onSetDefault={() => {
                  setDefaultConnection(c.id);
                  toast({
                    title: t("toasts.defaultSet"),
                    description: t("toasts.defaultConnection", {
                      name: c.name,
                      interpolation: { escapeValue: false },
                    }),
                  });
                }}
                onDelete={async () => {
                  pendingFocus.current = focusTargetAfter(index);
                  setConfirmingId(undefined);
                  await disconnect(c.id);
                  removeConnection(c.id);
                  toast({
                    title: t("toasts.deleted"),
                    description: t("toasts.deletedByName", {
                      name: c.name,
                      interpolation: { escapeValue: false },
                    }),
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

type StatusTone = "connected" | "busy" | "online" | "error" | "idle";

function statusTone(status: Connection["status"]): StatusTone {
  switch (status) {
    case "connected":
    case "configured":
      return "connected";
    case "connecting":
    case "configuring":
      return "busy";
    case "online":
      return "online";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

const statusDot: Record<StatusTone, string> = {
  connected: "bg-emerald-500",
  busy: "bg-amber-500",
  online: "bg-sky-500",
  error: "bg-red-500",
  idle: "bg-muted-foreground/40",
};

function StatusPill({
  status,
  reconnect,
  className,
}: {
  status: Connection["status"];
  reconnect?: Connection["reconnect"];
  className?: string;
}) {
  const { t } = useTranslation("connections");
  const tone = statusTone(status);
  const label = reconnect
    ? t("status.reconnecting", {
        attempt: reconnect.attempt,
        max: reconnect.maxAttempts,
      })
    : tone === "connected"
      ? "connected"
      : status;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-background px-2.5 py-0.5 text-sm font-medium capitalize text-muted-foreground ring-1 ring-border ring-inset",
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", statusDot[tone])}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function ConnectionCard({
  connection,
  confirmingDelete,
  onRequestDelete,
  onCancelDelete,
  onConnect,
  onDisconnect,
  onSetDefault,
  onDelete,
  onRetry,
}: {
  connection: Connection;
  confirmingDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSetDefault: () => void;
  onDelete: () => void | Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const { t } = useTranslation("connections");
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The menu returns focus to its trigger as it closes; when the strip is
  // opening, focus belongs to Cancel instead. The strip is already rendered
  // by the time the menu's focus scope unmounts, so it is focused there.
  const focusCancelOnMenuClose = useRef(false);

  const cancelDelete = () => {
    onCancelDelete();
    menuTriggerRef.current?.focus();
  };

  // Escape cancels the strip; the drawer ignores it (see ConnectionsDrawer).
  const onStripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelDelete();
    }
  };

  const isBusy =
    connection.status === "connecting" || connection.status === "configuring";
  const isConnected =
    connection.status === "connected" || connection.status === "configured";
  const isError = connection.status === "error";

  return (
    <article
      className={cn(
        surfaceClasses,
        "flex h-full flex-col divide-y divide-border p-3 @md:p-4",
      )}
      aria-label={connection.name}
    >
      <div className="flex items-start gap-3 pb-3">
        {/* Avatar steps up with the drawer. */}
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border ring-inset @md:size-10 @xl:size-11"
          aria-hidden="true"
        >
          {createElement(connectionTypeIcon(connection.type), {
            className: "size-4 @md:size-5",
          })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 break-words text-base font-semibold @md:text-lg">
              {connection.name}
            </h3>
            {connection.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-border ring-inset">
                <Star className="size-3.5 fill-amber-500 text-amber-500" />
                {t("default")}
              </span>
            ) : null}
            {/* At wide sizes the status sits inline with the name. */}
            <StatusPill
              status={connection.status}
              reconnect={connection.reconnect}
              className="hidden @xl:flex"
            />
          </div>
          <p className="mt-0.5 break-all text-sm text-muted-foreground">
            {formatConnectionSubtext(connection)}
          </p>
          <StatusPill
            status={connection.status}
            reconnect={connection.reconnect}
            className="mt-2 @xl:hidden"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuTriggerRef}
              data-row-focus=""
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus:ring-ring dark:text-muted-foreground dark:hover:bg-background dark:hover:text-foreground"
            >
              <MoreHorizontal className="size-5" />
              <span className="sr-only">{t("moreActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            data-shadcn-scope=""
            onCloseAutoFocus={(event) => {
              if (focusCancelOnMenuClose.current) {
                focusCancelOnMenuClose.current = false;
                event.preventDefault();
                cancelRef.current?.focus();
              }
            }}
            className="min-w-44 rounded-xl border-border bg-popover p-1 text-popover-foreground shadow-lg dark:border-border dark:bg-popover dark:text-popover-foreground"
          >
            {connection.type === "http" ? (
              <DropdownMenuItem
                className="min-h-11 gap-2 rounded-lg px-3 focus:bg-muted dark:focus:bg-muted"
                onClick={() => onSetDefault()}
              >
                {connection.isDefault ? (
                  <StarOff className="size-4" />
                ) : (
                  <Star className="size-4" />
                )}
                {connection.isDefault
                  ? t("button.unsetDefault")
                  : t("button.setDefault")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="min-h-11 gap-2 rounded-lg px-3 text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/10"
              onSelect={() => {
                focusCancelOnMenuClose.current = true;
                onRequestDelete();
              }}
            >
              <Trash2 className="size-4" />
              {t("button.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="py-3 text-sm text-muted-foreground">
        {connection.error ? (
          <div className="space-y-1">
            <p className="text-sm text-red-700 dark:text-red-400">
              {connection.error}
            </p>
            {connection.type === "http" &&
              connection.url.startsWith("https:") && (
                <CertificateGuide
                  uncertain={connection.errorKind !== "cert"}
                  url={connection.url}
                  retest={async () =>
                    (await testHttpReachable(connection.url)).reachable
                  }
                  onTrusted={() => void onConnect()}
                />
              )}
          </div>
        ) : connection.lastConnectedAt ? (
          <p>
            {t("lastConnectedAt", { date: "" })}{" "}
            <TimeAgo
              timestamp={connection.lastConnectedAt}
              className="text-sm text-muted-foreground"
            />
          </p>
        ) : (
          <p>{t("neverConnected")}</p>
        )}
      </div>

      {confirmingDelete ? (
        <div
          data-inline-confirm=""
          className="mt-auto flex flex-col gap-3 pt-3 @sm:flex-row @sm:items-center @sm:justify-between"
        >
          <p className="min-w-0 break-words text-sm font-medium">
            {t("drawer.deleteConfirm", { name: connection.name })}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              ref={cancelRef}
              className={secondaryButtonClasses}
              onClick={cancelDelete}
              onKeyDown={onStripKeyDown}
            >
              {t("button.cancel")}
            </Button>
            <Button
              className={destructiveButtonClasses}
              onClick={() => void onDelete()}
              onKeyDown={onStripKeyDown}
            >
              <Trash2 className="size-4" />
              {t("button.delete")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-2 pt-3">
          {isConnected ? (
            <Button
              className={secondaryButtonClasses}
              onClick={() => void onDisconnect()}
              disabled={isBusy}
            >
              {t("button.disconnect")}
            </Button>
          ) : (
            <Button
              className={primaryButtonClasses}
              onClick={() => void (isError ? onRetry() : onConnect())}
              disabled={isBusy}
            >
              {isError ? (
                <>
                  <RotateCw className="size-4" />
                  {t("button.retry")}
                </>
              ) : (
                <>
                  <LinkIcon className="size-4" />
                  {t("button.connect")}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
