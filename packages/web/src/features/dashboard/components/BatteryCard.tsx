import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import { InfoRow } from "./InfoRow";

interface BatteryCardProps {
  percent: number | null;
  voltage: number | null;
}

// Meshtastic uses batteryLevel > 100 to indicate plugged in with no battery
const PLUGGED_IN_NO_BATTERY = 101;

function isPluggedIn(percent: number | null): boolean {
  return percent === PLUGGED_IN_NO_BATTERY;
}

function getDisplayPercent(percent: number | null): number {
  if (percent === null || percent > 100) return 0;
  return percent;
}

function getBatteryColor(percent: number | null): string {
  if (percent === null) return "bg-muted-foreground";
  if (isPluggedIn(percent)) return "bg-[var(--success)]";
  if (percent > 50) return "bg-[var(--success)]";
  if (percent > 20) return "bg-[var(--warning)]";
  return "bg-[var(--destructive)]";
}

function getBatteryLabel(percent: number | null): string {
  if (percent === null) return "Unknown";
  if (isPluggedIn(percent)) return "External Power";
  if (percent > 75) return "Excellent";
  if (percent > 50) return "Good";
  if (percent > 20) return "Low";
  return "Critical";
}

export function BatteryCard({ percent, voltage }: BatteryCardProps) {
  const displayPercent = getDisplayPercent(percent);
  const batteryColor = getBatteryColor(percent);
  const pluggedIn = isPluggedIn(percent);

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
            <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
            <line x1="22" x2="22" y1="11" y2="13" />
          </svg>
          Battery
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">
            {pluggedIn ? "AC" : percent !== null ? `${displayPercent}%` : "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            {getBatteryLabel(percent)}
          </span>
        </div>
        {!pluggedIn && (
          <div className="relative">
            <Progress value={displayPercent} className="h-3" />
            <div
              className={`absolute left-0 top-0 h-3 rounded-full transition-all ${batteryColor}`}
              style={{ width: `${displayPercent}%` }}
            />
          </div>
        )}
        <dl>
          <InfoRow
            label="Voltage"
            value={voltage !== null ? `${voltage.toFixed(2)}V` : "—"}
          />
          <InfoRow
            label="Power Source"
            value={pluggedIn ? "External Power" : "Battery"}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
