import { type JSX, useEffect, useState } from "react";

export interface TimeAgoProps {
  timestamp: number;
}

const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const secondsPast = Math.floor((now - timestamp) / 1000);

  if (secondsPast < 10) return "now";
  if (secondsPast < 60) return `${secondsPast} seconds ago`;
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)} minutes ago`;
  if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)} hours ago`;
  return `${Math.floor(secondsPast / 86400)} days ago`;
};

export const TimeAgo = ({ timestamp }: TimeAgoProps): JSX.Element => {
  const [timeAgo, setTimeAgo] = useState(getTimeAgo(timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(timestamp));
    }, 10000);

    return () => clearInterval(interval);
  }, [timestamp]);

  useEffect(() => {
    setTimeAgo(getTimeAgo(timestamp));
  }, [timestamp]);

  return <span>{timeAgo}</span>;
};
