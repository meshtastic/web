import {
  useAllMessages,
  useNodes,
  usePacketLogs,
  useSignalLogs,
  useTelemetryHistory,
} from "@data/hooks";
import type { TelemetryLog } from "@data/schema";
import { useMemo } from "react";

const CHART_LIMIT = 288; // ~24h at 5-min intervals

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Type guard: narrows nullable fields to non-null after filter(). */
function hasFields<T, K extends keyof T>(
  keys: K[],
): (row: T) => row is T & Record<K, NonNullable<T[K]>> {
  return (row): row is T & Record<K, NonNullable<T[K]>> =>
    keys.every((k) => row[k] != null);
}

export interface SignalChartPoint {
  time: string;
  snr: number;
  rssi: number;
}

export interface ChannelUtilChartPoint {
  time: string;
  utilization: number;
  airTime: number;
}

export interface EnvironmentChartPoint {
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
}

export interface MessageActivityChartPoint {
  time: string;
  direct: number;
  channel: number;
}

export interface DeliveryRateChartPoint {
  name: string;
  value: number;
  fill: string;
}

export interface HopCountChartPoint {
  hops: string;
  count: number;
}

export interface NodeSignalChartPoint {
  name: string;
  snr: number;
}

const DELIVERY_STATE_COLORS: Record<string, { label: string; fill: string }> = {
  ack: { label: "Acknowledged", fill: "var(--color-ack)" },
  sent: { label: "Sent", fill: "var(--color-sent)" },
  sending: { label: "Sending", fill: "var(--color-sending)" },
  waiting: { label: "Waiting", fill: "var(--color-waiting)" },
  failed: { label: "Failed", fill: "var(--color-failed)" },
};

export function useDashboardCharts(deviceId: number, nodeNum: number) {
  const { telemetry, isLoading: telemetryLoading } = useTelemetryHistory(
    deviceId,
    nodeNum,
    undefined,
    CHART_LIMIT,
  );
  const { logs: signalLogs, isLoading: signalLoading } = useSignalLogs(
    deviceId,
    nodeNum,
    CHART_LIMIT,
  );
  const { messages } = useAllMessages(nodeNum, 500);
  const { packets } = usePacketLogs(deviceId, CHART_LIMIT);
  const { nodes } = useNodes(deviceId);

  // Telemetry comes sorted desc by time; charts need ascending order.
  // Reverse once, then derive all chart arrays from the same reversed list.
  const ascending = useMemo(() => [...telemetry].reverse(), [telemetry]);

  const channelUtilData = useMemo<ChannelUtilChartPoint[]>(
    () =>
      ascending
        .filter(
          hasFields<TelemetryLog, "time" | "channelUtilization" | "airUtilTx">([
            "time",
            "channelUtilization",
            "airUtilTx",
          ]),
        )
        .map((t) => ({
          time: formatTime(t.time),
          utilization: t.channelUtilization,
          airTime: t.airUtilTx,
        })),
    [ascending],
  );

  const environmentData = useMemo<EnvironmentChartPoint[]>(
    () =>
      ascending
        .filter(
          hasFields<
            TelemetryLog,
            "time" | "temperature" | "relativeHumidity" | "barometricPressure"
          >(["time", "temperature", "relativeHumidity", "barometricPressure"]),
        )
        .map((t) => ({
          time: formatTime(t.time),
          temperature: t.temperature,
          humidity: t.relativeHumidity,
          pressure: t.barometricPressure,
        })),
    [ascending],
  );

  // Signal logs also come desc; reverse for chronological chart order
  const signalData = useMemo<SignalChartPoint[]>(
    () =>
      [...signalLogs].reverse().map((s) => ({
        time: formatTime(s.rxTime),
        snr: s.rxSnr,
        rssi: s.rxRssi,
      })),
    [signalLogs],
  );

  // Message activity: bucket by hour over last 24h
  const messageActivityData = useMemo<MessageActivityChartPoint[]>(() => {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    const recent = messages.filter((m) => m.date.getTime() >= cutoff);

    const buckets = new Map<string, { direct: number; channel: number }>();
    for (const m of recent) {
      const hour = m.date
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        .replace(/:\d{2}$/, ":00");
      const entry = buckets.get(hour) ?? { direct: 0, channel: 0 };
      if (m.type === "direct") entry.direct++;
      else entry.channel++;
      buckets.set(hour, entry);
    }

    return Array.from(buckets.entries()).map(([time, counts]) => ({
      time,
      ...counts,
    }));
  }, [messages]);

  // Delivery rate: group messages by state
  const deliveryRateData = useMemo<DeliveryRateChartPoint[]>(() => {
    const counts = new Map<string, number>();
    for (const m of messages) {
      counts.set(m.state, (counts.get(m.state) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([state, count]) => ({
        name: DELIVERY_STATE_COLORS[state]?.label ?? state,
        value: count,
        fill: DELIVERY_STATE_COLORS[state]?.fill ?? "var(--color-sent)",
      }));
  }, [messages]);

  // Hop count distribution from packet logs
  const hopCountData = useMemo<HopCountChartPoint[]>(() => {
    const buckets: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (const p of packets) {
      if (p.hopStart != null && p.hopLimit != null) {
        const hops = Math.max(0, p.hopStart - p.hopLimit);
        const idx = Math.min(hops, 4) as 0 | 1 | 2 | 3 | 4;
        buckets[idx]++;
      }
    }
    return [
      { hops: "0", count: buckets[0] },
      { hops: "1", count: buckets[1] },
      { hops: "2", count: buckets[2] },
      { hops: "3", count: buckets[3] },
      { hops: "4+", count: buckets[4] },
    ];
  }, [packets]);

  // Node signal: SNR per neighbor, exclude self, sort desc, top 15
  const nodeSignalData = useMemo<NodeSignalChartPoint[]>(() => {
    return nodes
      .filter((n) => n.nodeNum !== nodeNum && n.snr != null && n.snr !== 0)
      .sort((a, b) => (b.snr ?? 0) - (a.snr ?? 0))
      .slice(0, 15)
      .map((n) => ({
        name: n.shortName ?? `!${n.nodeNum.toString(16)}`,
        snr: n.snr ?? 0,
      }));
  }, [nodes, nodeNum]);

  return {
    signalData,
    channelUtilData,
    environmentData,
    messageActivityData,
    deliveryRateData,
    hopCountData,
    nodeSignalData,
    isLoading: telemetryLoading || signalLoading,
  };
}
