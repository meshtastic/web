import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface TimeAgoProps {
  timestamp: number | Date;
  locale?: string;
  tooltipOptions?: Intl.DateTimeFormatOptions;
  className?: string;
}

const TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

const getRelativeTimeParts = (
  date: Date | number,
): { value: number; unit: Intl.RelativeTimeFormatUnit } => {
  const diffInSeconds = (new Date(date).getTime() - Date.now()) / 1000;

  for (const [unit, secondsInUnit] of TIME_UNITS) {
    if (Math.abs(diffInSeconds) >= secondsInUnit) {
      const value = Math.round(diffInSeconds / secondsInUnit);
      return { value, unit };
    }
  }

  return { value: Math.round(diffInSeconds), unit: "second" };
};

const UPDATE_INTERVALS: Partial<Record<Intl.RelativeTimeFormatUnit, number>> = {
  // For long-term units, an hourly update is more than sufficient.
  year: 1000 * 60 * 60,
  month: 1000 * 60 * 60,

  // When the unit is 'day', check hourly to catch the change to the next day.
  day: 1000 * 60 * 60,

  // When the unit is 'hour', check every thiry seconds to catch the change to the next hour.
  hour: 1000 * 30,

  // When the unit is 'minute', a 15-second check is a good balance.
  minute: 1000 * 15,

  // For 'second', a 3-second check keeps it feeling "live" without being excessive.
  second: 1000 * 3,
};

export const TimeAgo = ({
  timestamp,
  locale: localeProp,
  tooltipOptions,
  className,
}: TimeAgoProps) => {
  const { i18n } = useTranslation();
  const [timeAgo, setTimeAgo] = useState<string>("");

  const locale = useMemo(
    () =>
      localeProp ||
      i18n.language ||
      (typeof navigator !== "undefined" ? navigator.language : "en-US"),
    [localeProp, i18n.language],
  );

  const date = useMemo(() => new Date(timestamp), [timestamp]);

  const fullDate = useMemo(() => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      dateStyle: "full",
      timeStyle: "medium",
    };
    const formatter = new Intl.DateTimeFormat(locale, {
      ...defaultOptions,
      ...tooltipOptions,
    });
    return formatter.format(date);
  }, [date, locale, tooltipOptions]);

  useEffect(() => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    let timerId: ReturnType<typeof setTimeout>;

    const update = () => {
      const { value, unit } = getRelativeTimeParts(date);
      setTimeAgo(rtf.format(value, unit));

      const interval = UPDATE_INTERVALS[unit] || 60000;
      timerId = globalThis.setTimeout(update, interval);
    };

    update();

    return () => {
      clearTimeout(timerId);
    };
  }, [date, locale]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={date.toISOString()} className={className}>
            {timeAgo}
          </time>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
            side="top"
            align="center"
            sideOffset={5}
          >
            {fullDate}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};
