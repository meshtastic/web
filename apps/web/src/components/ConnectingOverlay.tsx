import { Dialog, DialogContent, DialogTitle } from "@components/UI/Dialog.tsx";
import { useAppStore, useDeviceStore } from "@core/stores";
import type { ConnectionProgressCounters } from "@meshtastic/sdk";
import { useConnectionProgress } from "@meshtastic/sdk-react";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type LineKind = "ok" | "active" | "info";
interface LogLine {
  id: number;
  ts: number;
  kind: LineKind;
  text: string;
}

const SYMBOL: Record<LineKind, string> = {
  ok: "✓",
  active: "→",
  info: "•",
};

const COLOR: Record<LineKind, string> = {
  ok: "text-emerald-400",
  active: "text-sky-300",
  info: "text-zinc-400",
};

/**
 * Full-screen terminal-style log overlay shown while the active device's
 * connection phase is "connecting" or "configuring". Lines are derived
 * from `device.connectionPhase` transitions and `MeshClient.progress`
 * counter bumps — pure consumer of domain signals.
 *
 * Auto-scrolls to the latest line. Auto-dismisses once phase flips to
 * "configured" / "disconnected" / "error".
 */
export const ConnectingOverlay = (): ReactElement | null => {
  const { selectedDeviceId } = useAppStore();
  const { getDevice } = useDeviceStore();
  const device = getDevice(selectedDeviceId);
  const phase = device?.connectionPhase ?? "disconnected";
  const progress = useConnectionProgress();
  const { t } = useTranslation("connections");

  const [lines, setLines] = useState<LogLine[]>([]);
  const idRef = useRef(0);
  const lastPhaseRef = useRef<typeof phase>("disconnected");
  const lastCountersRef = useRef<ConnectionProgressCounters | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = phase === "connecting" || phase === "configuring";

  // Reset the log when a fresh connect cycle starts (idle → connecting).
  useEffect(() => {
    if (phase === "connecting" && lastPhaseRef.current !== "connecting") {
      setLines([]);
      idRef.current = 0;
      lastCountersRef.current = undefined;
    }
    lastPhaseRef.current = phase;
  }, [phase]);

  // High-level phase transitions → log lines.
  useEffect(() => {
    if (phase === "connecting") {
      append("active", t("overlay.log.transportOpening", { defaultValue: "Opening transport…" }));
    } else if (phase === "configuring") {
      append("ok", t("overlay.log.transportReady", { defaultValue: "Transport ready" }));
      append(
        "active",
        t("overlay.log.requestingConfig", { defaultValue: "Requesting configuration" }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Counter bumps → per-event lines.
  useEffect(() => {
    if (progress.phase !== "configuring") {
      if (progress.phase === "configured") {
        append("ok", t("overlay.log.configured", { defaultValue: "Configuration complete" }));
      }
      return;
    }
    const cur = progress.received;
    const prev = lastCountersRef.current ?? {
      config: 0,
      modules: 0,
      channels: 0,
      nodes: 0,
      myInfo: false,
      metadata: false,
    };
    if (cur.config > prev.config) {
      append(
        "info",
        t("overlay.log.configReceived", {
          n: cur.config,
          defaultValue: "Received config section ({{n}})",
        }),
      );
    }
    if (cur.modules > prev.modules) {
      append(
        "info",
        t("overlay.log.moduleReceived", {
          n: cur.modules,
          defaultValue: "Received module config ({{n}})",
        }),
      );
    }
    if (cur.channels > prev.channels) {
      append(
        "info",
        t("overlay.log.channelReceived", {
          n: cur.channels,
          defaultValue: "Received channel ({{n}})",
        }),
      );
    }
    if (cur.nodes > prev.nodes) {
      append(
        "info",
        t("overlay.log.nodeReceived", {
          n: cur.nodes,
          defaultValue: "Received node info ({{n}})",
        }),
      );
    }
    if (cur.myInfo && !prev.myInfo) {
      append("ok", t("overlay.log.myInfo", { defaultValue: "Identity received" }));
    }
    if (cur.metadata && !prev.metadata) {
      append("ok", t("overlay.log.metadata", { defaultValue: "Metadata received" }));
    }
    lastCountersRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Auto-scroll to bottom on new line.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function append(kind: LineKind, text: string): void {
    setLines((prev) => [...prev, { id: ++idRef.current, ts: Date.now(), kind, text }]);
  }

  if (!visible) return null;

  const start = lines[0]?.ts ?? Date.now();

  return (
    <Dialog open>
      <DialogContent
        className="max-w-xl border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <DialogTitle className="ml-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
            {t("overlay.log.header", { defaultValue: "meshtastic — connect" })}
          </DialogTitle>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                phase === "configuring" ? "animate-pulse bg-sky-400" : "bg-amber-400"
              }`}
            />
            {phase}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[360px] min-h-[200px] overflow-y-auto bg-zinc-950 px-4 py-3 font-mono text-[12px] leading-relaxed"
        >
          {lines.length === 0 ? (
            <div className="text-zinc-600">…</div>
          ) : (
            lines.map((line, i) => {
              const isLast = i === lines.length - 1;
              const symbol = isLast && line.kind === "active" ? "→" : SYMBOL[line.kind];
              return (
                <div key={line.id} className="flex items-start gap-3">
                  <span className="shrink-0 select-none text-zinc-600">
                    {String(((line.ts - start) / 1000).toFixed(2)).padStart(6, " ")}s
                  </span>
                  <span className={`shrink-0 select-none ${COLOR[line.kind]}`}>{symbol}</span>
                  <span
                    className={
                      line.kind === "info"
                        ? "text-zinc-300"
                        : line.kind === "ok"
                          ? "text-zinc-100"
                          : "text-zinc-100"
                    }
                  >
                    {line.text}
                    {isLast && line.kind === "active" && (
                      <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-zinc-300" />
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
