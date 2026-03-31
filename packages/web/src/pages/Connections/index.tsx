import AddConnectionDialog from "@app/components/Dialog/AddConnectionDialog/AddConnectionDialog";
import { TimeAgo } from "@app/components/generic/TimeAgo";
import LanguageSwitcher from "@app/components/LanguageSwitcher";
import { ConnectionStatusBadge } from "@app/components/PageComponents/Connections/ConnectionStatusBadge";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { useConnections } from "@app/pages/Connections/useConnections";
import { connectionTypeIcon, formatConnectionSubtext } from "@app/pages/Connections/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/UI/AlertDialog.tsx";
import { Badge } from "@components/UI/Badge.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@components/UI/Card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  LinkIcon,
  MoreHorizontal,
  RotateCw,
  RouterIcon,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Connections = () => {
  const {
    connections,
    addConnectionAndConnect,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  } = useConnections();
  const { toast } = useToast();
  const navigate = useNavigate({ from: "/" });
  const [addOpen, setAddOpen] = useState(false);
  const isURLHTTPS = useMemo(() => location.protocol === "https:", []);
  const { t } = useTranslation("connections");

  // On first mount, sync statuses and refresh
  useEffect(() => {
    syncConnectionStatuses();
    refreshStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect to the best HTTP connection on first load (after store rehydrates).
  // Bluetooth and Serial require a user gesture to re-select the device, so they are skipped.
  const autoConnectAttempted = useRef(false);
  useEffect(() => {
    if (autoConnectAttempted.current || connections.length === 0) return;

    const httpConnections = connections.filter((c) => c.type === "http");
    if (httpConnections.length === 0) return;

    // Prefer the connection marked as default, otherwise the most recently connected one.
    const candidate =
      httpConnections.find((c) => c.isDefault) ??
      [...httpConnections].sort((a, b) => (b.lastConnectedAt ?? 0) - (a.lastConnectedAt ?? 0))[0];

    autoConnectAttempted.current = true;
    connect(candidate.id).then((ok) => {
      if (ok) navigate({ to: "/" });
    });
  }, [connections, connect, navigate]);

  // Show a quick-reconnect banner for the most recently used BT/Serial connection.
  // These connection types require a user gesture so they can't be auto-connected silently.
  const [quickReconnectTarget, setQuickReconnectTarget] = useState<
    (typeof connections)[number] | null
  >(null);
  const quickReconnectChecked = useRef(false);
  useEffect(() => {
    if (quickReconnectChecked.current || connections.length === 0) return;

    const activeStatuses = new Set(["connected", "configured", "configuring", "connecting"]);
    const candidate = connections
      .filter(
        (c) =>
          (c.type === "bluetooth" || c.type === "serial") &&
          c.lastConnectedAt != null &&
          !activeStatuses.has(c.status),
      )
      .sort((a, b) => (b.lastConnectedAt ?? 0) - (a.lastConnectedAt ?? 0))[0];

    if (!candidate) return;

    quickReconnectChecked.current = true;
    setQuickReconnectTarget(candidate);
  }, [connections]);

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

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between">
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center justify-center w-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("page.title")}</h1>
            <p className="lg:w-4/6 md:w-5/6 text-slate-500 dark:text-slate-400 mt-1">
              {t("page.description")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end ml-2 gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <RouterIcon className="size-5" />
            {t("button.addConnection")}
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      <Separator />

      {quickReconnectTarget && (
        <QuickReconnectBanner
          target={quickReconnectTarget}
          onReconnect={async () => {
            setQuickReconnectTarget(null);
            const ok = await connect(quickReconnectTarget.id, { allowPrompt: true });
            toast({
              title: ok ? t("toasts.connected") : t("toasts.failed"),
              description: ok
                ? t("toasts.nowConnected", {
                    name: quickReconnectTarget.name,
                    interpolation: { escapeValue: false },
                  })
                : t("toasts.checkConnection"),
            });
            if (ok) navigate({ to: "/" });
          }}
          onDismiss={() => setQuickReconnectTarget(null)}
        />
      )}

      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">{t("noConnections.title")} </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-500 dark:text-slate-400">
            {t("noConnections.description")}
          </CardContent>
          <CardFooter>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <RouterIcon className="size-5" />
              {t("button.addConnection")}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              onConnect={async () => {
                const ok = await connect(c.id, { allowPrompt: true });
                toast({
                  title: ok ? t("toasts.connected") : t("toasts.failed"),
                  description: ok
                    ? t("toasts.nowConnected", {
                        name: c.name,
                        interpolation: { escapeValue: false },
                      })
                    : t("toasts.checkConnection"),
                });
                if (ok) {
                  navigate({ to: "/" });
                }
              }}
              onDisconnect={async () => {
                await disconnect(c.id);
                toast({
                  title: t("toasts.disconnected"),
                  description: t("toasts.nowDisconnected", {
                    name: c.name,
                    interpolation: { escapeValue: false },
                  }),
                });
              }}
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
              onRetry={async () => {
                const ok = await connect(c.id, { allowPrompt: true });
                toast({
                  title: ok ? t("toasts.connected") : t("toasts.failed"),
                  description: ok
                    ? t("toasts.nowConnected", {
                        name: c.name,
                        interpolation: { escapeValue: false },
                      })
                    : t("toasts.pickConnectionAgain"),
                });
                if (ok) {
                  navigate({ to: "/" });
                }
              }}
            />
          ))}
        </div>
      )}

      <AddConnectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isHTTPS={isURLHTTPS}
        onSave={async (partial, btDevice) => {
          const created = await addConnectionAndConnect(partial, btDevice);
          if (created) {
            setAddOpen(false);
            toast({
              title: t("toasts.added"),
              description: t("toasts.savedByName", {
                name: created.name,
                interpolation: { escapeValue: false },
              }),
            });
            if (created.status === "connected" || created.status === "configured") {
              navigate({ to: "/" });
            }
          } else {
            toast({
              title: "Unable to connect",
              description: "savedCantConnect",
            });
          }
        }}
      />
    </div>
  );
};

function QuickReconnectBanner({
  target,
  onReconnect,
  onDismiss,
}: {
  target: Connection;
  onReconnect: () => Promise<void>;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("connections");
  const Icon = connectionTypeIcon(target.type);
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <Icon className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-blue-900 dark:text-blue-100 truncate">
          {t("quickReconnect.title", { name: target.name })}
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t("quickReconnect.description")}
        </p>
      </div>
      <Button className="gap-2 shrink-0" onClick={onReconnect}>
        <LinkIcon className="size-4" />
        {t("button.reconnect")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
        onClick={onDismiss}
      >
        <X className="size-4" />
        <span className="sr-only">{t("button.dismiss")}</span>
      </Button>
    </div>
  );
}

function TypeBadge({ type }: { type: Connection["type"] }) {
  const Icon = connectionTypeIcon(type);
  const label = type === "http" ? "HTTP" : type === "bluetooth" ? "Bluetooth" : "Serial";
  return (
    <Badge variant="default" className="gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

function ConnectionCard({
  connection,
  onConnect,
  onDisconnect,
  onSetDefault,
  onDelete,
  onRetry,
}: {
  connection: Connection;
  onConnect: () => Promise<boolean> | Promise<void>;
  onDisconnect: () => Promise<void> | Promise<void>;
  onSetDefault: () => void;
  onDelete: () => void;
  onRetry: () => Promise<boolean> | Promise<void>;
}) {
  const { t } = useTranslation("connections");

  const Icon = connectionTypeIcon(connection.type);
  const isBusy = connection.status === "connecting" || connection.status === "configuring";
  const isConnected = connection.status === "connected" || connection.status === "configured";
  const isError = connection.status === "error";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Icon className="size-4 text-slate-500 dark:text-slate-400" />
              <span className="truncate">{connection.name}</span>
              {connection.isDefault ? (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  {t("default")}
                </Badge>
              ) : null}
            </CardTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <TypeBadge type={connection.type} />
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {formatConnectionSubtext(connection)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatusBadge status={connection.status} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">{t("moreActions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {connection.type === "http" && connection.isDefault && (
                  <DropdownMenuItem className="gap-2" onClick={() => onSetDefault()}>
                    <StarOff className="size-4" />
                    {t("button.unsetDefault")}
                  </DropdownMenuItem>
                )}
                {connection.type === "http" && !connection.isDefault && (
                  <DropdownMenuItem className="gap-2" onClick={() => onSetDefault()}>
                    <Star className="size-4" />
                    {t("button.setDefault")}
                  </DropdownMenuItem>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="size-4" />
                      {t("button.delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteConnection")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("areYouSure", { name: connection.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("button.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => onDelete()}
                      >
                        {t("button.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {connection.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{connection.error}</p>
        ) : connection.lastConnectedAt ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("lastConnectedAt", { date: "" })}{" "}
            <TimeAgo
              timestamp={connection.lastConnectedAt}
              className="text-sm text-slate-500 dark:text-slate-400"
            />
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("neverConnected")}</p>
        )}
      </CardContent>
      <CardFooter className="flex items-center gap-2 mt-auto">
        {isConnected ? (
          <Button
            variant="subtle"
            className="gap-2"
            onClick={() => onDisconnect()}
            disabled={isBusy}
          >
            {t("button.disconnect")}
          </Button>
        ) : (
          <Button
            className="gap-2"
            onClick={() => (isError ? onRetry() : onConnect())}
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
      </CardFooter>
    </Card>
  );
}
