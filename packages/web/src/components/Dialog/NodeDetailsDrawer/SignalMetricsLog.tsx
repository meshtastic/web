import { SignalBars } from "@components/generic/SignalIndicator";
import { Button } from "@components/ui/button";
import { ScrollArea } from "@components/ui/scroll-area";
import { Skeleton } from "@components/ui/skeleton";
import {
  getSignalColorForGrade,
  getSignalGrade,
  getSnrLimit,
} from "@core/utils/signalColor";
import { type SignalLog, useSignalLogs } from "@db/hooks/useSignalLogs";
import { Protobuf } from "@meshtastic/core";
import { ArrowLeftIcon, ChevronLeftIcon, InfoIcon } from "lucide-react";
import { Suspense, useMemo, useState } from "react";

interface SignalMetricsLogProps {
  nodeNum: number;
  nodeName: string;
  deviceId: number;
  onBack: () => void;
  modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
}

type TimeRange = "24H" | "48H" | "1W" | "2W" | "4W" | "Max";

const TIME_RANGES: { key: TimeRange; label: string; hours: number }[] = [
  { key: "24H", label: "24H", hours: 24 },
  { key: "48H", label: "48H", hours: 48 },
  { key: "1W", label: "1W", hours: 24 * 7 },
  { key: "2W", label: "2W", hours: 24 * 14 },
  { key: "4W", label: "4W", hours: 24 * 28 },
  { key: "Max", label: "Max", hours: 24 * 365 },
];

interface DataPoint {
  time: number;
  value: number;
}

function normalizeData(
  data: DataPoint[],
  height: number,
  margin: number,
  minVal: number,
  maxVal: number,
): DataPoint[] {
  if (data.length === 0) {
    return [];
  }

  const range = maxVal - minVal || 1;

  return data.map((d) => ({
    time: d.time,
    value:
      height - margin - ((d.value - minVal) / range) * (height - 2 * margin),
  }));
}

function generatePath(
  points: DataPoint[],
  width: number,
  minTime: number,
  maxTime: number,
): string {
  if (points.length === 0) {
    return "";
  }

  const timeRange = maxTime - minTime || 1;

  const pathCommands = points.map((point, index) => {
    const x = ((point.time - minTime) / timeRange) * width;
    const y = point.value;
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  });

  return pathCommands.join(" ");
}

function DualAxisChart({
  rssiData,
  snrData,
  height = 200,
}: {
  rssiData: DataPoint[];
  snrData: DataPoint[];
  height?: number;
}) {
  const width = 320;
  const margin = 20;

  const chartData = useMemo(() => {
    const allTimes = [
      ...rssiData.map((d) => d.time),
      ...snrData.map((d) => d.time),
    ];
    if (allTimes.length === 0) {
      return null;
    }

    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    // RSSI typically ranges from -140 to -20
    const rssiMin = -140;
    const rssiMax = -20;
    const normalizedRssi = normalizeData(
      rssiData,
      height,
      margin,
      rssiMin,
      rssiMax,
    );

    // SNR typically ranges from -20 to 12
    const snrMin = -20;
    const snrMax = 12;
    const normalizedSnr = normalizeData(
      snrData,
      height,
      margin,
      snrMin,
      snrMax,
    );

    return {
      minTime,
      maxTime,
      normalizedRssi,
      normalizedSnr,
      rssiMin,
      rssiMax,
      snrMin,
      snrMax,
    };
  }, [rssiData, snrData, height]);

  if (!chartData || (rssiData.length === 0 && snrData.length === 0)) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No signal data available
      </div>
    );
  }

  const rssiPath = generatePath(
    chartData.normalizedRssi,
    width - 2 * margin,
    chartData.minTime,
    chartData.maxTime,
  );
  const snrPath = generatePath(
    chartData.normalizedSnr,
    width - 2 * margin,
    chartData.minTime,
    chartData.maxTime,
  );

  const startDate = new Date(chartData.minTime);
  const endDate = new Date(chartData.maxTime);
  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // Y-axis labels for both scales
  const rssiLabels = [chartData.rssiMax, -50, -80, -110, chartData.rssiMin];
  const snrLabels = [chartData.snrMax, 4, -4, -12, chartData.snrMin];

  return (
    <div className="space-y-2">
      {/* Date range header */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* RSSI Y-axis labels (left) */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-blue-400 w-8">
          {rssiLabels.map((val) => (
            <span key={val}>{val}</span>
          ))}
        </div>

        {/* SNR Y-axis labels (right) */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-xs text-yellow-400 w-8 text-right">
          {snrLabels.map((val) => (
            <span key={val}>{val}</span>
          ))}
        </div>

        {/* SVG Chart */}
        <svg
          width={width}
          height={height}
          className="mx-auto"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title className="sr-only">Signal Metrics Chart</title>
          <g transform={`translate(${margin}, 0)`}>
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={0}
                y1={height * ratio}
                x2={width - 2 * margin}
                y2={height * ratio}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4,4"
              />
            ))}

            {/* RSSI line (blue) */}
            {rssiPath && (
              <path
                d={rssiPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* SNR line (yellow) */}
            {snrPath && (
              <path
                d={snrPath}
                fill="none"
                stroke="#eab308"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* RSSI points */}
            {chartData.normalizedRssi.map((point) => {
              const x =
                ((point.time - chartData.minTime) /
                  (chartData.maxTime - chartData.minTime || 1)) *
                (width - 2 * margin);
              return (
                <circle
                  key={`rssi-${point.time}`}
                  cx={x}
                  cy={point.value}
                  r={3}
                  fill="#3b82f6"
                />
              );
            })}

            {/* SNR points */}
            {chartData.normalizedSnr.map((point) => {
              const x =
                ((point.time - chartData.minTime) /
                  (chartData.maxTime - chartData.minTime || 1)) *
                (width - 2 * margin);
              return (
                <circle
                  key={`snr-${point.time}`}
                  cx={x}
                  cy={point.value}
                  r={3}
                  fill="#eab308"
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">RSSI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">SNR</span>
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function SignalLogEntry({
  log,
  modemPreset,
}: {
  log: SignalLog;
  modemPreset: Protobuf.Config.Config_LoRaConfig_ModemPreset;
}) {
  const snrLimit = getSnrLimit(modemPreset);
  const { grade, bars } = getSignalGrade(log.rxSnr, log.rxRssi, snrLimit);
  const gradeColor = getSignalColorForGrade(grade);

  // Color SNR based on value
  const snrColor =
    log.rxSnr > 0 ? "#22c55e" : log.rxSnr > -10 ? "#eab308" : "#f97316";
  // Color RSSI based on value
  const rssiColor = log.rxRssi > -100 ? "#eab308" : "#f97316";

  const formatTime = (date: Date) =>
    date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="space-y-1">
        <div className="text-sm font-medium">{formatTime(log.rxTime)}</div>
        <div className="flex gap-4 text-sm">
          <span style={{ color: snrColor }}>SNR {log.rxSnr.toFixed(2)}dB</span>
          <span style={{ color: rssiColor }}>
            RSSI {log.rxRssi.toFixed(0)}dBm
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SignalBars bars={bars} grade={grade} className="h-5 w-6" />
        <span className="text-sm" style={{ color: gradeColor }}>
          Signal {grade}
        </span>
      </div>
    </div>
  );
}

function SignalMetricsLogContent({
  nodeNum,
  nodeName,
  deviceId,
  onBack,
  modemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_FAST,
}: SignalMetricsLogProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24H");
  const { logs } = useSignalLogs(deviceId, nodeNum, 500);

  // Filter logs by time range
  const filteredLogs = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.key === timeRange);
    if (!range) {
      return logs;
    }

    const cutoff = Date.now() - range.hours * 60 * 60 * 1000;
    return logs.filter((log) => log.rxTime.getTime() >= cutoff);
  }, [logs, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const rssiData = filteredLogs.map((log) => ({
      time: log.rxTime.getTime(),
      value: log.rxRssi,
    }));
    const snrData = filteredLogs.map((log) => ({
      time: log.rxTime.getTime(),
      value: log.rxSnr,
    }));
    return { rssiData, snrData };
  }, [filteredLogs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg">{nodeName}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Log count */}
          <div className="text-center text-muted-foreground">
            {filteredLogs.length} Logs
          </div>

          {/* Chart */}
          <DualAxisChart
            rssiData={chartData.rssiData}
            snrData={chartData.snrData}
          />

          {/* Time range selector */}
          <div className="flex rounded-lg overflow-hidden border">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => setTimeRange(range.key)}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  timeRange === range.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Log entries */}
          <div>
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No signal logs for this time range
              </div>
            ) : (
              filteredLogs.map((log) => (
                <SignalLogEntry
                  key={log.id}
                  log={log}
                  modemPreset={modemPreset}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function SignalMetricsLog(props: SignalMetricsLogProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b">
            <Button variant="ghost" size="icon" onClick={props.onBack}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="h-4 w-20 mx-auto" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SignalMetricsLogContent {...props} />
    </Suspense>
  );
}
