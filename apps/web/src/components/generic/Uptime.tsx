export interface UptimeProps {
  seconds: number;
}

const getUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
  const secondsLeft = Math.floor(((seconds % 86400) % 3600) % 60);
  return `${days}d ${hours}h ${minutes}m ${secondsLeft}s`;
};

export const Uptime = ({ seconds }: UptimeProps) => {
  return <span>{getUptime(seconds)}</span>;
};
