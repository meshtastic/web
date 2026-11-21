import { Button } from "@components/UI/Button.tsx";
import { EmptyState } from "@components/UI/EmptyState.tsx";
import { mostRecentConnection } from "@core/connections/status.ts";
import type { Connection } from "@core/stores/deviceStore/types.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { useConnections } from "@app/pages/Connections/useConnections";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/** The Meshtastic mark, as the welcome wizard draws it. */
const MeshtasticMark = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 18 6-10 4 7" />
    <path d="m12 18 5-9 4 9" />
  </svg>
);

export interface NoRadioEmptyStateProps {
  /** The saved radio to offer a one-click reconnect to, if any. */
  recent?: Pick<Connection, "id" | "name">;
  /** A reconnect to `recent` is in flight. */
  reconnecting: boolean;
  onConnect: () => void;
  onReconnect: () => void;
}

/** What the app shows behind the Connections drawer with no radio. */
export function NoRadioEmptyState({
  recent,
  reconnecting,
  onConnect,
  onReconnect,
}: NoRadioEmptyStateProps) {
  const { t } = useTranslation("connections");
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-app px-4 py-10 text-primary">
      <EmptyState
        icon={<MeshtasticMark />}
        title={t("noRadio.title")}
        description={t("noRadio.description")}
        headingLevel="h1"
      >
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {recent ? (
            <Button
              type="button"
              variant="primary"
              size="touch"
              disabled={reconnecting}
              onClick={onReconnect}
            >
              {reconnecting
                ? t("noRadio.connecting", { name: recent.name })
                : t("noRadio.reconnect", { name: recent.name })}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={recent ? "secondary" : "primary"}
            size="touch"
            onClick={onConnect}
          >
            {t("noRadio.connect")}
          </Button>
        </div>
      </EmptyState>
    </main>
  );
}

/**
 * The page with no radio connected: offers the radio reached most recently
 * in one click (a granted USB port or paired Bluetooth device reopens
 * without a picker) and opens the Connections drawer for anything else.
 */
export function NoRadioScreen() {
  const { t } = useTranslation("connections");
  const { toast } = useToast();
  const { connect, refreshStatuses } = useConnections();
  const openConnections = useAppStore((s) => s.openConnections);
  const recent = useDeviceStore((s) =>
    mostRecentConnection(s.savedConnections),
  );
  const [reconnecting, setReconnecting] = useState(false);

  // Finds the ports and devices the browser already granted, so Reconnect
  // reuses them instead of showing a picker.
  const recentId = recent?.id;
  useEffect(() => {
    if (recentId === undefined) return;
    void refreshStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentId]);

  const onReconnect = async () => {
    if (!recent) return;
    setReconnecting(true);
    try {
      const ok = await connect(recent.id, { allowPrompt: true });
      if (!ok) {
        toast({
          title: t("toasts.failed"),
          description: t("toasts.checkConnection"),
        });
        // The drawer shows the error and a Retry on the entry.
        openConnections();
      }
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <NoRadioEmptyState
      recent={recent}
      reconnecting={reconnecting}
      onConnect={() => openConnections()}
      onReconnect={() => void onReconnect()}
    />
  );
}
