import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";

/** Time in seconds a node is considered "online" after last heard */
export const ONLINE_THRESHOLD_SECONDS = 900; // 15 minutes
export const ONLINE_THRESHOLD_MINUTES = ONLINE_THRESHOLD_SECONDS / 60;

interface OnlineIndicatorProps {
  className?: string;
}

export function OnlineIndicator({ className }: OnlineIndicatorProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "rounded-full border-2 border-background bg-chart-2",
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        Seen in last {ONLINE_THRESHOLD_MINUTES} minutes
      </TooltipContent>
    </Tooltip>
  );
}
