import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";

export interface TimeAgoProps {
  timestamp: number;
}

const getTimeAgo = (
  unixTimestamp: number,
  locale: Intl.LocalesArgument = "en",
): string => {
  const timestamp = new Date(unixTimestamp);
  const diff = (new Date().getTime() - timestamp.getTime()) / 1000;

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (years > 0) {
    return rtf.format(0 - years, "year");
  }
  if (months > 0) {
    return rtf.format(0 - months, "month");
  }
  if (days > 0) {
    return rtf.format(0 - days, "day");
  }
  if (hours > 0) {
    return rtf.format(0 - hours, "hour");
  }
  if (minutes > 0) {
    return rtf.format(0 - minutes, "minute");
  }
  return rtf.format(Math.floor(0 - diff), "second");
};

export const TimeAgo = ({ timestamp }: TimeAgoProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span>{getTimeAgo(timestamp)}</span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
            side="top"
            align="center"
            sideOffset={5}
          >
            {new Date(timestamp).toLocaleString()}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};
