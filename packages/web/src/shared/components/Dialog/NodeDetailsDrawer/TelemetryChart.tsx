import { useTelemetryHistory } from "@data/hooks";
import { Card, CardContent } from "@shared/components/ui/card";
import { useGetMyNode } from "@shared/hooks/useGetMyNode";
import { isDefined } from "@shared/utils/typeGuards";
import {
  BatteryIcon,
  DropletIcon,
  ThermometerIcon,
  ZapIcon,
} from "lucide-react";
import { useMemo } from "react";

interface TelemetryChartProps {
  nodeNum: number;
  durationHours?: number;
}

interface DataPoint {
  time: number;
  value: number;
}

function normalizeData(
  data: DataPoint[],
  height: number,
  margin: number,
): DataPoint[] {
  if (data.length === 0) {
    return [];
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return data.map((d) => ({
    time: d.time,
    value: height - margin - ((d.value - min) / range) * (height - 2 * margin),
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

function SimpleLineChart({
  data,
  label,
  color,
  unit,
  height = 120,
}: {
  data: DataPoint[];
  label: string;
  color: string;
  unit: string;
  height?: number;
}) {
  const width = 300;
  const margin = 10;

  const { normalizedData, minTime, maxTime, minValue, maxValue } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          normalizedData: [],
          minTime: 0,
          maxTime: 0,
          minValue: 0,
          maxValue: 0,
        };
      }

      const times = data.map((d) => d.time);
      const values = data.map((d) => d.value);

      return {
        normalizedData: normalizeData(data, height, margin),
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
      };
    }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No data available
      </div>
    );
  }

  const path = generatePath(normalizedData, width, minTime, maxTime);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {minValue.toFixed(1)} - {maxValue.toFixed(1)} {unit}
        </span>
      </div>
      <svg
        width={width}
        height={height}
        className="w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title className="sr-only">Telemetry Chart</title>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeDasharray="2,2"
        />

        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {normalizedData.map((point) => {
          const x = ((point.time - minTime) / (maxTime - minTime || 1)) * width;
          return (
            <circle
              key={point.time}
              cx={x}
              cy={point.value}
              r={2}
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function TelemetryChart({
  nodeNum,
  durationHours = 24,
}: TelemetryChartProps) {
  const { myNodeNum } = useGetMyNode();
  const deviceId = myNodeNum ?? 0;

  const sinceTimestamp = useMemo(() => {
    const now = Date.now();
    const cutoff = now - durationHours * 60 * 60 * 1000;
    return Math.floor(cutoff / 1000);
  }, [durationHours]);

  const { telemetry } = useTelemetryHistory(
    deviceId,
    nodeNum,
    sinceTimestamp,
    200,
  );

  const charts = useMemo(() => {
    if (telemetry.length === 0) {
      return {
        battery: [],
        voltage: [],
        temperature: [],
        humidity: [],
      };
    }

    return {
      battery: telemetry.flatMap((t) =>
        isDefined(t.batteryLevel) && isDefined(t.time)
          ? [{ time: t.time.getTime(), value: t.batteryLevel }]
          : [],
      ),
      voltage: telemetry.flatMap((t) =>
        isDefined(t.voltage) && isDefined(t.time)
          ? [{ time: t.time.getTime(), value: t.voltage }]
          : [],
      ),
      temperature: telemetry.flatMap((t) =>
        isDefined(t.temperature) && isDefined(t.time)
          ? [{ time: t.time.getTime(), value: t.temperature }]
          : [],
      ),
      humidity: telemetry.flatMap((t) =>
        isDefined(t.relativeHumidity) && isDefined(t.time)
          ? [{ time: t.time.getTime(), value: t.relativeHumidity }]
          : [],
      ),
    };
  }, [telemetry]);

  const hasData =
    charts.battery.length > 0 ||
    charts.voltage.length > 0 ||
    charts.temperature.length > 0 ||
    charts.humidity.length > 0;

  // Early return if device not connected
  if (!myNodeNum) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            Connect to a device to view telemetry
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            No telemetry data available for the last {durationHours} hours
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/20">
      <CardContent className="p-4 space-y-6">
        {charts.battery.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BatteryIcon className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm">Battery Level</h4>
            </div>
            <SimpleLineChart
              data={charts.battery}
              label="Last 24 hours"
              color="#22c55e"
              unit="%"
            />
          </div>
        )}

        {charts.voltage.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ZapIcon className="h-4 w-4 text-yellow-600" />
              <h4 className="font-medium text-sm">Voltage</h4>
            </div>
            <SimpleLineChart
              data={charts.voltage}
              label="Last 24 hours"
              color="#eab308"
              unit="V"
            />
          </div>
        )}

        {charts.temperature.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThermometerIcon className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-sm">Temperature</h4>
            </div>
            <SimpleLineChart
              data={charts.temperature}
              label="Last 24 hours"
              color="#ef4444"
              unit="°C"
            />
          </div>
        )}

        {charts.humidity.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DropletIcon className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm">Humidity</h4>
            </div>
            <SimpleLineChart
              data={charts.humidity}
              label="Last 24 hours"
              color="#3b82f6"
              unit="%"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
