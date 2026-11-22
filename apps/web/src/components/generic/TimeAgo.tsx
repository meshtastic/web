import { useNow } from "@components/Nodes/useNow.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import {
  formatRelativeTime,
  relativeRefreshMs,
} from "@core/utils/timeFormat.ts";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface TimeAgoProps {
  timestamp: number | Date;
  locale?: string;
  tooltipOptions?: Intl.DateTimeFormatOptions;
  className?: string;
}

/** "5 minutes ago", kept current, with the full date in a tooltip. */
export const TimeAgo = ({
  timestamp,
  locale: localeProp,
  tooltipOptions,
  className,
}: TimeAgoProps) => {
  const { i18n } = useTranslation();
  const locale =
    localeProp ||
    i18n.language ||
    (typeof navigator !== "undefined" ? navigator.language : "en-US");

  const date = useMemo(() => new Date(timestamp), [timestamp]);

  // Refresh as often as the current unit needs (state adjusted during
  // render when the unit changes).
  const [refreshMs, setRefreshMs] = useState(() =>
    relativeRefreshMs(date, Date.now()),
  );
  const now = useNow(refreshMs);
  const nextRefreshMs = relativeRefreshMs(date, now);
  if (nextRefreshMs !== refreshMs) {
    setRefreshMs(nextRefreshMs);
  }

  const fullDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
        timeStyle: "medium",
        ...tooltipOptions,
      }).format(date),
    [date, locale, tooltipOptions],
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={date.toISOString()} className={className}>
            {formatRelativeTime(date, now, locale)}
          </time>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="top" align="center" sideOffset={5}>
            {fullDate}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};
