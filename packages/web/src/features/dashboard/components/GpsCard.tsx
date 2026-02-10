import { TimeAgo } from "@shared/components/TimeAgo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Activity } from "react";
import { InfoRow } from "./InfoRow";
import { StatusIndicator } from "./StatusIndicator";

interface GpsCardProps {
  satellites: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  positionTime: Date | null;
}

export function GpsCard({
  satellites,
  latitude,
  longitude,
  altitude,
  positionTime,
}: GpsCardProps) {
  const hasPosition = latitude != null && longitude != null;
  const hasAnyData = hasPosition || satellites != null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="2" x2="22" y1="12" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            GPS
          </span>
          <StatusIndicator
            status={hasPosition ? "online" : "idle"}
            label={hasPosition ? "Fix Acquired" : "No Position"}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Activity mode={hasAnyData ? "visible" : "hidden"}>
          <dl className="flex flex-col gap-0">
            <Activity mode={satellites != null ? "visible" : "hidden"}>
              <InfoRow
                label="Satellites"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">{satellites ?? 0}</span>
                    <span className="text-xs text-muted-foreground">
                      in view
                    </span>
                  </span>
                }
              />
            </Activity>
            <Activity mode={hasPosition ? "visible" : "hidden"}>
              <InfoRow
                label="Latitude"
                value={
                  <span className="font-mono">
                    {(latitude ?? 0).toFixed(6)}
                  </span>
                }
              />
              <InfoRow
                label="Longitude"
                value={
                  <span className="font-mono">
                    {(longitude ?? 0).toFixed(6)}
                  </span>
                }
              />
            </Activity>
            <Activity mode={altitude != null ? "visible" : "hidden"}>
              <InfoRow
                label="Altitude"
                value={<span className="font-mono">{altitude ?? 0}m</span>}
              />
            </Activity>
            <Activity mode={positionTime != null ? "visible" : "hidden"}>
              <InfoRow
                label="Last Fix"
                value={
                  positionTime ? <TimeAgo timestamp={positionTime} /> : "—"
                }
              />
            </Activity>
          </dl>
        </Activity>
        <Activity mode={hasAnyData ? "hidden" : "visible"}>
          <p className="text-sm text-muted-foreground py-4 text-center">
            No GPS data available.
          </p>
        </Activity>
      </CardContent>
    </Card>
  );
}
