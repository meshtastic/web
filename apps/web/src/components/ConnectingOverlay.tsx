import { Dialog, DialogContent, DialogTitle } from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useDeviceStore } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { useConnections } from "@app/pages/Connections/useConnections";
import { useConnectionProgress } from "@meshtastic/sdk-react";
import { Bluetooth, Cable, CheckCircle2, Globe, Loader2 } from "lucide-react";
import type { ComponentType, ReactElement } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const STUCK_THRESHOLD_MS = 15_000;
const SUCCESS_DISPLAY_MS = 1_800;

const TRANSPORT_ICON: Record<
  "http" | "bluetooth" | "serial",
  ComponentType<{ className?: string }>
> = {
  http: Globe,
  bluetooth: Bluetooth,
  serial: Cable,
};

/**
 * Hero-card connect overlay. Visible while any saved connection's status
 * is "connecting" or "configuring" — driven from the saved-connection
 * status field rather than `device.connectionPhase` so the overlay shows
 * during transport-open + storage-open (the device entry doesn't exist
 * yet during those phases).
 *
 * Center: device name + transport icon with an animated radial pulse.
 * Surrounding: 4 stat chips (Identity / Channels / Nodes / Metadata)
 * that flip from gray to green as the SDK reports each piece arriving.
 *
 * On `configured`, holds a brief "Connected" affirmation for
 * SUCCESS_DISPLAY_MS and then dismisses. This replaces the old
 * "Connected" toast — overlay is the canonical place to surface
 * connect-flow feedback.
 *
 * Dismisses immediately on `disconnected` / `error`.
 */
export const ConnectingOverlay = (): ReactElement | null => {
  const savedConnections = useDeviceStore((s) => s.savedConnections);
  const progress = useConnectionProgress();
  const { disconnect } = useConnections();
  const { t } = useTranslation("connections");

  const active = savedConnections.find(
    (c) => c.status === "connecting" || c.status === "configuring",
  );

  // Success affirmation: when the conn we were tracking flips to "configured",
  // hold the overlay for SUCCESS_DISPLAY_MS so the user sees a clear "connected"
  // confirmation (replaces the old toast). Tracked by id so a fresh attempt
  // from another conn doesn't inherit the previous one's success window.
  const [successId, setSuccessId] = useState<number | null>(null);
  const [trackedId, setTrackedId] = useState<number | null>(null);

  useEffect(() => {
    if (active) {
      setTrackedId(active.id);
      // A new attempt cancels any leftover success view.
      setSuccessId(null);
    }
  }, [active?.id]);

  useEffect(() => {
    if (!trackedId) return;
    const conn = savedConnections.find((c) => c.id === trackedId);
    if (!conn) {
      setTrackedId(null);
      setSuccessId(null);
      return;
    }
    if (conn.status === "configured") {
      setSuccessId(trackedId);
      const handle = setTimeout(() => {
        setSuccessId(null);
        setTrackedId(null);
      }, SUCCESS_DISPLAY_MS);
      return () => clearTimeout(handle);
    }
    if (conn.status === "disconnected" || conn.status === "error") {
      setTrackedId(null);
      setSuccessId(null);
    }
  }, [trackedId, savedConnections]);

  // Stuck-detection: once an attempt has been visible for STUCK_THRESHOLD_MS,
  // surface a Cancel button so the user can bail out of the overlay even when
  // `onConfigComplete` never arrives (firmware in CLI / bootloader, framing
  // out of sync, etc.). Resets when a fresh attempt starts.
  const [showCancel, setShowCancel] = useState(false);
  useEffect(() => {
    if (!active) {
      setShowCancel(false);
      return;
    }
    setShowCancel(false);
    const handle = setTimeout(() => setShowCancel(true), STUCK_THRESHOLD_MS);
    return () => clearTimeout(handle);
  }, [active?.id]);

  const successConn =
    successId != null ? (savedConnections.find((c) => c.id === successId) ?? null) : null;
  const display = active ?? successConn;

  if (!display) return null;

  const Icon = TRANSPORT_ICON[display.type];
  const counters =
    progress.phase === "configuring" || progress.phase === "configured"
      ? progress.received
      : { config: 0, modules: 0, channels: 0, nodes: 0, myInfo: false, metadata: false };

  const isSuccess = successConn != null && !active;
  const isConnecting = !isSuccess && display.status === "connecting";
  const phaseLabel = isSuccess
    ? t("overlay.phase.connected", { defaultValue: "Connected" })
    : isConnecting
      ? t("overlay.phase.connecting", { defaultValue: "Opening transport…" })
      : t("overlay.phase.configuring", { defaultValue: "Streaming configuration…" });

  return (
    <Dialog open>
      <DialogContent
        className="max-w-sm overflow-hidden bg-background-primary p-0 text-text-primary shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {isSuccess
            ? t("overlay.srTitleConnected", { defaultValue: "Connected to device" })
            : t("overlay.srTitle", { defaultValue: "Connecting to device" })}
        </DialogTitle>

        <div className="flex flex-col items-center gap-6 px-8 pt-10 pb-8">
          {/* Hero icon. In success state the radial pings stop and the badge
              swaps to a checkmark over the brand green, so the visual flip is
              immediate. */}
          <div className="relative flex h-28 w-28 items-center justify-center">
            {!isSuccess && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-link/20 [animation-duration:1.8s]" />
                <span className="absolute inset-3 animate-ping rounded-full bg-link/30 [animation-duration:2.4s] [animation-delay:0.4s]" />
              </>
            )}
            <span
              className={cn(
                "absolute inset-6 rounded-full shadow-lg",
                isSuccess ? "bg-green-500 shadow-green-500/40" : "bg-link shadow-link/40",
              )}
            />
            {isSuccess ? (
              <CheckCircle2 className="relative h-10 w-10 text-background-primary" />
            ) : (
              <Icon className="relative h-9 w-9 text-background-primary" />
            )}
          </div>

          {/* Name + phase */}
          <div className="text-center">
            <div className="text-lg font-semibold tracking-tight text-text-primary">
              {display.name}
            </div>
            <div
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 text-xs",
                isSuccess
                  ? "font-medium text-green-600 dark:text-green-400"
                  : "text-text-secondary",
              )}
            >
              {!isSuccess && <Loader2 className="h-3 w-3 animate-spin" />}
              {phaseLabel}
            </div>
          </div>

          {/* Stat chips — 2x2 grid. In success state all chips snap to "done"
              styling regardless of the counter values that were observed
              mid-stream. */}
          <div className="grid w-full grid-cols-2 gap-2">
            <Chip
              label={t("overlay.chip.identity", { defaultValue: "Identity" })}
              done={isSuccess || counters.myInfo}
            />
            <Chip
              label={t("overlay.chip.metadata", { defaultValue: "Metadata" })}
              done={isSuccess || counters.metadata}
            />
            <Chip
              label={t("overlay.chip.channels", { defaultValue: "Channels" })}
              count={counters.channels}
              done={isSuccess || (counters.channels > 0 && progress.phase === "configured")}
            />
            <Chip
              label={t("overlay.chip.nodes", { defaultValue: "Nodes" })}
              count={counters.nodes}
              done={isSuccess || (counters.nodes > 0 && progress.phase === "configured")}
            />
          </div>

          {!isSuccess && showCancel && (
            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-xs text-text-secondary">
                {t("overlay.stuckHint", {
                  defaultValue:
                    "Taking longer than usual. The device may be in CLI / bootloader mode, or the firmware isn't responding to config requests.",
                })}
              </p>
              <Button type="button" variant="outline" onClick={() => void disconnect(display.id)}>
                {t("overlay.cancel", { defaultValue: "Cancel" })}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ChipProps {
  label: string;
  count?: number;
  done: boolean;
}

function Chip({ label, count, done }: ChipProps): ReactElement {
  const filled = count !== undefined ? count > 0 : done;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        filled
          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
          : "border-text-secondary/30 bg-text-secondary/5 text-text-secondary",
      )}
    >
      <span className="font-medium">{label}</span>
      {count !== undefined ? (
        <span className="font-mono text-xs tabular-nums">{count}</span>
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <span className="h-4 w-4 rounded-full border border-dashed border-text-secondary/50" />
      )}
    </div>
  );
}
