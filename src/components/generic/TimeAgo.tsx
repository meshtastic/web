import { type JSX, useEffect, useState } from "react";

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

export const TimeAgo = ({ timestamp }: TimeAgoProps): JSX.Element => {
  const [timeAgo, setTimeAgo] = useState(getTimeAgo(timestamp));

  useEffect(() => {
    setTimeAgo(getTimeAgo(timestamp));
  }, [timestamp]);

  return <span>{timeAgo}</span>;
};
