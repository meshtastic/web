import { Protobuf } from "@core/protobuf.ts";
import type { Message } from "@core/storage/types.ts";
import {
  type LoRaSignalSettings,
  rssiQuality,
  type SignalQuality,
  snrQuality,
} from "@core/utils/signalQuality.ts";
import { type DayGroup, groupByDay } from "@core/utils/timeFormat.ts";
import type { DeliveryLine } from "./deliveryView.ts";
import { shownRelayNode } from "./relayNode.ts";
import type { ThreadMessage } from "./thread.ts";
import type { TracerouteView } from "./tracerouteView.ts";

/**
 * What the message list renders, in order: bubbles, and in a direct
 * conversation the traceroute results exchanged with the peer. Pure: the
 * component maps entries to elements.
 */

/** Packet ids are only unique per sender, so keys and DOM ids use both. */
export const messageKey = (message: Pick<Message, "id" | "from">): string =>
  `${message.from}:${message.id}`;

export interface MessageEntry {
  readonly kind: "message";
  readonly key: string;
  readonly at: Date;
  readonly thread: ThreadMessage;
  /**
   * Start of a run from one sender: draw the header above the bubble
   * (avatar, name and time for incoming, the time for mine). Later bubbles
   * in the run leave it out.
   */
  readonly startsRun: boolean;
}

export interface TracerouteEntry {
  readonly kind: "traceroute";
  readonly key: string;
  readonly at: Date;
  readonly trace: TracerouteView;
}

export type TimelineEntry = MessageEntry | TracerouteEntry;

/**
 * Bubbles from one sender closer together than this share one header, as
 * on Android (GROUPING_WINDOW_MILLIS). The header carries the run's only
 * visible time, so a run never spans more than this.
 */
export const SENDER_RUN_WINDOW_MS = 10 * 60_000;

/**
 * Whether `current` continues `previous`'s run: both mine, or both
 * incoming from the same node; on the same day, within `windowMs`
 * (inclusive).
 */
export const continuesRun = (
  previous: TimelineEntry | undefined,
  current: ThreadMessage,
  windowMs: number = SENDER_RUN_WINDOW_MS,
): boolean => {
  if (!previous || previous.kind !== "message") {
    return false;
  }
  const prev = previous.thread;
  if (prev.outgoing !== current.outgoing) {
    return false;
  }
  if (!current.outgoing && prev.message.from !== current.message.from) {
    return false;
  }
  const gap = current.message.rxTime.getTime() - prev.message.rxTime.getTime();
  return (
    gap >= 0 &&
    gap <= windowMs &&
    prev.message.rxTime.toDateString() === current.message.rxTime.toDateString()
  );
};

/**
 * Merges messages (oldest first) and traceroutes (unordered) by time.
 * On a tie the message comes first, so a "let me run a traceroute" bubble
 * sits above its result.
 */
export const buildTimeline = (
  messages: readonly ThreadMessage[],
  traceroutes: readonly TracerouteView[] = [],
): TimelineEntry[] => {
  const traces = [...traceroutes].sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
  const out: TimelineEntry[] = [];
  let t = 0;
  const pushTrace = (trace: TracerouteView) => {
    out.push({
      kind: "traceroute",
      key: `trace:${trace.from}:${trace.id}`,
      at: trace.at,
      trace,
    });
  };
  for (const thread of messages) {
    const at = thread.message.rxTime;
    while (t < traces.length) {
      const trace = traces[t];
      if (!trace || trace.at.getTime() >= at.getTime()) {
        break;
      }
      pushTrace(trace);
      t++;
    }
    out.push({
      kind: "message",
      key: messageKey(thread.message),
      at,
      thread,
      startsRun: !continuesRun(out.at(-1), thread),
    });
  }
  for (; t < traces.length; t++) {
    const trace = traces[t];
    if (trace) {
      pushTrace(trace);
    }
  }
  return out;
};

/** The timeline split under date separators. */
export const groupTimeline = (
  entries: readonly TimelineEntry[],
): DayGroup<TimelineEntry>[] => groupByDay(entries, (entry) => entry.at);

/**
 * How an incoming message reached us, for the meta line under its bubble:
 * "9:21 · 2 hops" on a channel, plus "· SNR −9 dB" in a direct message.
 * SNR is only meaningful when the packet came straight from the sender.
 */
export interface IncomingMeta {
  /** `0` means heard directly; undefined when the radio didn't say. */
  readonly hops?: number;
  readonly snr?: number;
  readonly snrQuality?: SignalQuality;
  readonly rssi?: number;
  readonly rssiQuality?: SignalQuality;
  readonly viaMqtt: boolean;
  readonly signed: boolean;
  /** A transport worth calling out (MQTT, UDP, API), like the old list. */
  readonly transport?: "mqtt" | "udp" | "api";
}

const Transport = Protobuf.Mesh.MeshPacket_TransportMechanism;

export const incomingMeta = (
  message: Message,
  options: {
    /**
     * Show SNR / RSSI. Only meaningful when the sender was heard directly:
     * on a relayed packet they describe the last relay's link, not the
     * sender's, so they stay hidden then.
     */
    readonly includeSignal: boolean;
    /** Rates SNR against the decode floor of these settings. */
    readonly lora?: LoRaSignalSettings;
  },
): IncomingMeta => {
  const viaMqtt =
    message.viaMqtt === true || message.transport === Transport.TRANSPORT_MQTT;
  const direct = message.hopsAway === 0 && !viaMqtt;
  const transport = viaMqtt
    ? "mqtt"
    : message.transport === Transport.TRANSPORT_MULTICAST_UDP
      ? "udp"
      : message.transport === Transport.TRANSPORT_API
        ? "api"
        : undefined;
  return {
    ...(message.hopsAway === undefined ? {} : { hops: message.hopsAway }),
    ...(options.includeSignal && direct && message.snr !== undefined
      ? {
          snr: message.snr,
          snrQuality: snrQuality(message.snr, options.lora),
        }
      : {}),
    ...(options.includeSignal && direct && message.rssi !== undefined
      ? { rssi: message.rssi, rssiQuality: rssiQuality(message.rssi) }
      : {}),
    viaMqtt,
    signed: message.signed === true,
    ...(transport ? { transport } : {}),
  };
};

/**
 * The line under an incoming bubble shows one reading, as on Android: the
 * signal when the sender was heard directly (SNR / RSSI present), else
 * the hop count.
 */
export const showsSignal = (meta: IncomingMeta): boolean =>
  meta.snr !== undefined || meta.rssi !== undefined;

/** Text colour token for a signal rating. */
export const signalTone = (quality: SignalQuality): string =>
  quality === "good"
    ? "text-accent"
    : quality === "fair"
      ? "text-warning"
      : "text-danger";

/** Which entries of the actions bar a bubble offers. */
export interface MessageActionsAvailability {
  readonly react: boolean;
  readonly reply: boolean;
  readonly copy: boolean;
  /**
   * The delivery details dialog: always for an outgoing message, and for a
   * received one when it names a relay.
   */
  readonly deliveryDetails: boolean;
  readonly retry: boolean;
}

export const actionsFor = (
  thread: ThreadMessage,
  connected: boolean,
  /** The bubble's delivery line; Retry only when it says retrying can help. */
  delivery: DeliveryLine | undefined,
): MessageActionsAvailability => ({
  react: connected,
  reply: connected,
  copy: thread.message.text.length > 0,
  deliveryDetails:
    thread.outgoing || shownRelayNode(thread.message, false) !== undefined,
  retry: connected && delivery?.kind === "failed" && delivery.retryable,
});
