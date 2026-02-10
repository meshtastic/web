import type { Channel } from "@data/schema";
import { Badge } from "@shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";

// Channel role enum: 0 = DISABLED, 1 = PRIMARY, 2 = SECONDARY
const CHANNEL_ROLE_LABELS: Record<number, string> = {
  0: "DISABLED",
  1: "PRIMARY",
  2: "SECONDARY",
};

interface ChannelsCardProps {
  channels: Channel[];
}

export function ChannelsCard({ channels }: ChannelsCardProps) {
  const activeChannels = channels.filter((ch) => ch.role !== 0);

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
              <path d="M2 20h.01" />
              <path d="M7 20v-4" />
              <path d="M12 20v-8" />
              <path d="M17 20V8" />
              <path d="M22 4v16" />
            </svg>
            Channels
          </span>
          <Badge variant="secondary" className="text-xs">
            {activeChannels.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {activeChannels.map((channel) => {
            const roleLabel = CHANNEL_ROLE_LABELS[channel.role] ?? "UNKNOWN";
            return (
              <div
                key={channel.channelIndex}
                className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-mono font-semibold text-primary">
                    {channel.channelIndex}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {channel.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PSK: {channel.psk ? "Custom" : "Default"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={channel.role === 1 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {roleLabel}
                  </Badge>
                  {channel.uplinkEnabled && (
                    <Badge variant="outline" className="text-xs">
                      UL
                    </Badge>
                  )}
                  {channel.downlinkEnabled && (
                    <Badge variant="outline" className="text-xs">
                      DL
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
