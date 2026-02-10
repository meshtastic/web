import { NodeAvatar } from "@shared/components/NodeAvatar";
import { Badge } from "@shared/components/ui/badge";
import { Activity } from "react";
import { StatusIndicator } from "./StatusIndicator";

interface DeviceHeaderProps {
  nodeNum: number;
  longName: string | null;
  role: string | null;
  firmwareVersion: string | null;
  isConnected: boolean;
  uptimeSeconds: number | null;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "< 1m";
}

export function DeviceHeader({
  nodeNum,
  longName,
  role,
  firmwareVersion,
  isConnected,
  uptimeSeconds,
}: DeviceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <NodeAvatar
          nodeNum={nodeNum}
          longName={longName ?? undefined}
          size="lg"
          clickable={false}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground">
              {longName ?? `Node ${nodeNum}`}
            </h1>
            <StatusIndicator
              status={isConnected ? "online" : "offline"}
              label={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <Activity mode={role ? "visible" : "hidden"}>
              <Badge variant="secondary" className="text-xs">
                {role ?? ""}
              </Badge>
            </Activity>
            <Activity mode={firmwareVersion ? "visible" : "hidden"}>
              <Badge variant="outline" className="text-xs font-mono">
                v{firmwareVersion ?? ""}
              </Badge>
            </Activity>
            <Activity mode={uptimeSeconds != null ? "visible" : "hidden"}>
              <span className="text-xs text-muted-foreground">
                Uptime: {formatUptime(uptimeSeconds ?? 0)}
              </span>
            </Activity>
          </div>
        </div>
      </div>
    </div>
  );
}
