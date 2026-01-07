import { useConnect } from "@data/hooks";
import type { Connection } from "@data/index";
import LanguageSwitcher from "@shared/components/LanguageSwitcher.tsx";
import { TimeAgo } from "@shared/components/TimeAgo.tsx";
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
} from "@shared/components/ui/alert-dialog";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Separator } from "@shared/components/ui/separator";
import { useToast } from "@shared/hooks/useToast.ts";
import { useNavigate } from "@tanstack/react-router";
import {
  LinkIcon,
  MoreHorizontal,
  RotateCw,
  RouterIcon,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddConnectionDialog } from "../components/AddConnectionDialog/AddConnectionDialog.tsx";
import { ConfigProgressIndicator } from "../components/ConfigProgressIndicator.tsx";
import { ConnectionStatusBadge } from "../components/ConnectionStatusBadge.tsx";
import { connectionTypeIcon, formatConnectionSubtext } from "../utils.ts";

export const ConnectPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const isURLHTTPS = useMemo(() => location.protocol === "https:", []);
  const { t } = useTranslation("connections");

  // Navigate to messages when connection succeeds
  const handleNavigationIntent = useCallback(
    (intent: { nodeNum: number }) => {
      navigate({
        to: "/$nodeNum/messages",
        params: { nodeNum: String(intent.nodeNum) },
        search: { channel: 0 },
      });
    },
    [navigate],
  );

  const {
    connections,
    addConnection,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  } = useConnect({
    onNavigationIntent: handleNavigationIntent,
  });

  // On first mount, sync statuses and refresh
  // biome-ignore lint/correctness/useExhaustiveDependencies: This can cause the icon to refresh too often
  useEffect(() => {
    syncConnectionStatuses();
    refreshStatuses();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...connections];
    return copy.sort((a, b) => {
      // Sort by lastConnectedAt descending (most recent first)
      // Connections that have never been connected go to the end
      const aTime = a.lastConnectedAt?.getTime() ?? 0;
      const bTime = b.lastConnectedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [connections]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between">
        <div className="flex items-stretch gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("page.title")}
            </h1>
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

      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("noConnections.title")}{" "}
            </CardTitle>
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
                const ok = await connect(c.id, {
                  allowPrompt: true,
                  skipConfig: false, // Debug: set to true to skip config sync
                });
                toast({
                  title: ok ? t("toasts.connected") : t("toasts.failed"),
                  description: ok
                    ? t("toasts.nowConnected", {
                        name: c.name,
                        interpolation: { escapeValue: false },
                      })
                    : t("toasts.checkConnection"),
                });
                // Navigation handled by ConnectionService after config complete
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
                const ok = await connect(c.id, {
                  allowPrompt: true,
                  skipConfig: false, // Debug: set to true to skip config sync
                });
                toast({
                  title: ok ? t("toasts.connected") : t("toasts.failed"),
                  description: ok
                    ? t("toasts.nowConnected", {
                        name: c.name,
                        interpolation: { escapeValue: false },
                      })
                    : t("toasts.pickConnectionAgain"),
                });
                // Navigation handled by ConnectionService after config complete
              }}
            />
          ))}
        </div>
      )}

      <AddConnectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isHTTPS={isURLHTTPS}
        onSave={async (partial) => {
          const created = await addConnection(partial);
          if (created) {
            setAddOpen(false);
            toast({
              title: t("toasts.added"),
              description: t("toasts.savedByName", {
                name: created.name,
                interpolation: { escapeValue: false },
              }),
            });
          }
        }}
      />
    </div>
  );
};

function TypeBadge({ type }: { type: Connection["type"] }) {
  const Icon = connectionTypeIcon(type);
  const label =
    type === "http" ? "HTTP" : type === "bluetooth" ? "Bluetooth" : "Serial";
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
  const isBusy =
    connection.status === "connecting" || connection.status === "configuring";
  const isConnected =
    connection.status === "connected" || connection.status === "configured";
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm md:text-base">
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
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => onSetDefault()}
                  >
                    <StarOff className="size-4" />
                    {t("button.unsetDefault")}
                  </DropdownMenuItem>
                )}
                {connection.type === "http" && !connection.isDefault && (
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => onSetDefault()}
                  >
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
                      <AlertDialogTitle>
                        {t("deleteConnection")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("areYouSure", { name: connection.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("button.cancel")}
                      </AlertDialogCancel>
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
        {connection.status === "configuring" ? (
          <ConfigProgressIndicator />
        ) : connection.error ? (
          <p className="text-sm md:text-base text-red-600 dark:text-red-400">
            {connection.error}
          </p>
        ) : connection.lastConnectedAt ? (
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
            {t("lastConnectedAt", { date: "" })}{" "}
            <TimeAgo
              timestamp={connection.lastConnectedAt.getTime()}
              className="text-sm md:text-base text-slate-500 dark:text-slate-400"
            />
          </p>
        ) : (
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
            {t("neverConnected")}
          </p>
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
        ) : isBusy ? (
          <>
            <Button className="gap-2" disabled>
              <RotateCw className="size-4 animate-spin" />
              {t("button.connecting")}
            </Button>
            <Button
              variant="subtle"
              className="gap-2"
              onClick={() => onDisconnect()}
            >
              <X className="size-4" />
              {t("button.cancel")}
            </Button>
          </>
        ) : (
          <Button
            className="gap-2"
            onClick={() => (isError ? onRetry() : onConnect())}
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
