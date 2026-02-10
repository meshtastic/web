import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Activity } from "react";
import { InfoRow } from "./InfoRow";
import { StatusIndicator } from "./StatusIndicator";

interface MqttCardProps {
  enabled: boolean;
  address: string;
  username: string;
  encryptionEnabled: boolean;
  jsonEnabled: boolean;
  tlsEnabled: boolean;
  proxyToClientEnabled: boolean;
  mapReportingEnabled: boolean;
  root: string;
}

export function MqttCard({
  enabled,
  address,
  username,
  encryptionEnabled,
  jsonEnabled,
  tlsEnabled,
  proxyToClientEnabled,
  mapReportingEnabled,
  root,
}: MqttCardProps) {
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
              <rect width="20" height="14" x="2" y="3" rx="2" />
              <line x1="8" x2="16" y1="21" y2="21" />
              <line x1="12" x2="12" y1="17" y2="21" />
            </svg>
            MQTT
          </span>
          <StatusIndicator
            status={enabled ? "online" : "idle"}
            label={enabled ? "Enabled" : "Disabled"}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Activity mode={enabled ? "visible" : "hidden"}>
          <dl className="flex flex-col gap-0">
            <InfoRow
              label="Server"
              value={
                <span className="font-mono text-xs">
                  {address || "default"}
                </span>
              }
            />
            <Activity mode={root ? "visible" : "hidden"}>
              <InfoRow
                label="Root Topic"
                value={<span className="font-mono text-xs">{root}</span>}
              />
            </Activity>
            <Activity mode={username ? "visible" : "hidden"}>
              <InfoRow
                label="Username"
                value={<span className="font-mono text-xs">{username}</span>}
              />
            </Activity>
            <InfoRow
              label="Encryption"
              value={encryptionEnabled ? "Enabled" : "Disabled"}
            />
            <InfoRow
              label="JSON Output"
              value={jsonEnabled ? "Enabled" : "Disabled"}
            />
            <InfoRow label="TLS" value={tlsEnabled ? "Enabled" : "Disabled"} />
            <InfoRow
              label="Proxy to Client"
              value={proxyToClientEnabled ? "Enabled" : "Disabled"}
            />
            <InfoRow
              label="Map Reporting"
              value={mapReportingEnabled ? "Enabled" : "Disabled"}
            />
          </dl>
        </Activity>
        <Activity mode={enabled ? "hidden" : "visible"}>
          <p className="text-sm text-muted-foreground py-4 text-center">
            MQTT is not enabled on this device.
          </p>
        </Activity>
      </CardContent>
    </Card>
  );
}
