import { Badge } from "@shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { StatusIndicator } from "./StatusIndicator";

interface ConnectivityMethod {
  name: string;
  enabled: boolean;
  connected: boolean;
  details?: string;
}

interface ConnectivityCardProps {
  methods: ConnectivityMethod[];
}

export function ConnectivityCard({ methods }: ConnectivityCardProps) {
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
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" x2="12.01" y1="20" y2="20" />
          </svg>
          Connectivity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {methods.map((method) => (
            <div
              key={method.name}
              className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <StatusIndicator
                  status={
                    !method.enabled
                      ? "idle"
                      : method.connected
                        ? "online"
                        : "warning"
                  }
                  label={method.name}
                />
              </div>
              <div className="flex items-center gap-2">
                {method.details && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {method.details}
                  </span>
                )}
                <Badge
                  variant={method.enabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {method.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
