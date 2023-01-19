import TimeAgoReact from "timeago-react";

export interface TimeAgoProps {
  timestamp: number;
}

export const TimeAgo = ({ timestamp }: TimeAgoProps): JSX.Element => {
  return <TimeAgoReact datetime={timestamp} opts={{ minInterval: 10 }} />;
};
