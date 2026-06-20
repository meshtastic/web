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
 * Auto-dismisses on "configured" (with a brief success state) or
 * "disconnected" / "error".
 */
export const ConnectingOverlay = (): ReactElement | null => {
  const savedConnections = useDeviceStore((s) => s.savedConnections);
  const progress = useConnectionProgress();
  const { disconnect } = useConnections();
  const { t } = useTranslation("connections");

  const active = savedConnections.find(
    (c) => c.status === "connecting" || c.status === "configuring",
  );

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
    const t = setTimeout(() => setShowCancel(true), STUCK_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, [active?.id]);

  if (!active) return null;

  const Icon = TRANSPORT_ICON[active.type];
  const counters =
    progress.phase === "configuring" || progress.phase === "configured"
      ? progress.received
      : {
          config: 0,
          modules: 0,
          channels: 0,
          nodes: 0,
          myInfo: false,
          metadata: false,
        };

  const isConnecting = active.status === "connecting";
  const phaseLabel = isConnecting
    ? t("overlay.phase.connecting", { defaultValue: "Opening transport…" })
    : t("overlay.phase.configuring", {
        defaultValue: "Streaming configuration…",
      });

  return (
    <Dialog open>
      <DialogContent
        className="max-w-sm overflow-hidden bg-background-primary p-0 text-text-primary shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {t("overlay.srTitle", { defaultValue: "Connecting to device" })}
        </DialogTitle>

        <div className="flex flex-col items-center gap-6 px-8 pt-10 pb-8">
          {/* Hero icon with radial pings — uses the theme link color so light
              and dark modes both look at-home. */}
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-link/20 [animation-duration:1.8s]" />
            <span className="absolute inset-3 animate-ping rounded-full bg-link/30 [animation-duration:2.4s] [animation-delay:0.4s]" />
            <span className="absolute inset-6 rounded-full bg-link shadow-lg shadow-link/40" />
            <Icon className="relative h-9 w-9 text-background-primary" />
          </div>

          {/* Name + phase */}
          <div className="text-center">
            <div className="text-lg font-semibold tracking-tight text-text-primary">
              {active.name}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              {phaseLabel}
            </div>
          </div>

          {/* Stat chips — 2x2 grid */}
          <div className="grid w-full grid-cols-2 gap-2">
            <Chip
              label={t("overlay.chip.identity", { defaultValue: "Identity" })}
              done={counters.myInfo}
            />
            <Chip
              label={t("overlay.chip.metadata", { defaultValue: "Metadata" })}
              done={counters.metadata}
            />
            <Chip
              label={t("overlay.chip.channels", { defaultValue: "Channels" })}
              count={counters.channels}
              done={counters.channels > 0 && progress.phase === "configured"}
            />
            <Chip
              label={t("overlay.chip.nodes", { defaultValue: "Nodes" })}
              count={counters.nodes}
              done={counters.nodes > 0 && progress.phase === "configured"}
            />
          </div>

          {showCancel && (
            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-xs text-text-secondary">
                {t("overlay.stuckHint", {
                  defaultValue:
                    "Taking longer than usual. The device may be in CLI / bootloader mode, or the firmware isn't responding to config requests.",
                })}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void disconnect(active.id)}
              >
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
