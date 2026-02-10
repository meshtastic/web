import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Activity } from "react";

interface TelemetryCardProps {
  airUtilTx: number | null;
  channelUtilization: number | null;
  uptimeSeconds: number | null;
  voltage: number | null;
  temperature: number | null;
  relativeHumidity: number | null;
  barometricPressure: number | null;
}

export function TelemetryCard({
  airUtilTx,
  channelUtilization,
  uptimeSeconds,
  voltage,
  temperature,
  relativeHumidity,
  barometricPressure,
}: TelemetryCardProps) {
  const hasEnvironment =
    temperature != null ||
    relativeHumidity != null ||
    barometricPressure != null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-primary"
            aria-hidden="true"
          >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
          </svg>
          Telemetry
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Device Metrics */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Device Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              label="Air Util TX"
              value={airUtilTx != null ? `${airUtilTx.toFixed(1)}%` : "—"}
            />
            <MetricTile
              label="Ch. Utilization"
              value={
                channelUtilization != null
                  ? `${channelUtilization.toFixed(1)}%`
                  : "—"
              }
            />
            <MetricTile
              label="Voltage"
              value={voltage != null ? `${voltage.toFixed(2)}V` : "—"}
            />
            <MetricTile
              label="Uptime"
              value={
                uptimeSeconds != null ? formatUptimeCompact(uptimeSeconds) : "—"
              }
            />
          </div>
        </div>

        {/* Environment Telemetry */}
        <Activity mode={hasEnvironment ? "visible" : "hidden"}>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Environment
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Activity mode={temperature != null ? "visible" : "hidden"}>
                <MetricTile
                  label="Temperature"
                  value={`${(temperature ?? 0).toFixed(1)}\u00B0C`}
                />
              </Activity>
              <Activity mode={relativeHumidity != null ? "visible" : "hidden"}>
                <MetricTile
                  label="Humidity"
                  value={`${(relativeHumidity ?? 0).toFixed(1)}%`}
                />
              </Activity>
              <Activity
                mode={barometricPressure != null ? "visible" : "hidden"}
              >
                <MetricTile
                  label="Pressure"
                  value={`${(barometricPressure ?? 0).toFixed(1)} hPa`}
                />
              </Activity>
            </div>
          </div>
        </Activity>
      </CardContent>
    </Card>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border border-border/50 bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatUptimeCompact(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
