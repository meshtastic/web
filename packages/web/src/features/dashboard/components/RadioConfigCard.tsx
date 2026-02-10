import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { InfoRow } from "./InfoRow";

interface RadioConfigCardProps {
  region: string;
  modemPreset: string;
  hopLimit: number;
  nodeNum: number;
  macAddress: string;
  hwModel: string;
}

export function RadioConfigCard({
  region,
  modemPreset,
  hopLimit,
  nodeNum,
  macAddress,
  hwModel,
}: RadioConfigCardProps) {
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
            <path d="M12 20h.01" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
            <path d="M5 12.859a10 10 0 0 1 14 0" />
            <path d="M1.5 9.288a15 15 0 0 1 21 0" />
          </svg>
          Radio Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-0">
          <InfoRow
            label="Hardware Model"
            value={<span className="font-mono text-xs">{hwModel}</span>}
          />
          <InfoRow
            label="Node Number"
            value={
              <span className="font-mono text-xs">!{nodeNum.toString(16)}</span>
            }
          />
          <InfoRow
            label="MAC Address"
            value={<span className="font-mono text-xs">{macAddress}</span>}
          />
          <InfoRow label="Region" value={region} />
          <InfoRow
            label="Modem Preset"
            value={modemPreset.replace(/_/g, " ")}
          />
          <InfoRow label="Hop Limit" value={hopLimit.toString()} />
        </dl>
      </CardContent>
    </Card>
  );
}
