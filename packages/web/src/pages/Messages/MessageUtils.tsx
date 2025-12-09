import { Separator } from "@components/ui/separator";
import type { Message } from "@db/schema";

export type DayGroup = { dayKey: number; label: string; items: Message[] };

// Helper functions for message grouping by day
export function toTimestamp(d: Message["date"]): number {
  return typeof d === "number" ? d : Date.parse(String(d));
}

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDateLabelFromDayKey(
  dayKey: number,
  t: (key: string) => string,
  fmt: Intl.DateTimeFormat,
): string {
  const todayKey = startOfLocalDay(Date.now());
  const yestKey = todayKey - 24 * 60 * 60 * 1000;

  if (dayKey === todayKey) {
    return t("unit.day.today");
  }
  if (dayKey === yestKey) {
    return t("unit.day.yesterday");
  }
  return fmt.format(new Date(dayKey));
}

export function groupMessagesByDay(
  messages: Message[],
  t: (key: string) => string,
  fmt: Intl.DateTimeFormat,
): DayGroup[] {
  const out: DayGroup[] = [];

  for (const msg of messages) {
    const ts = toTimestamp(msg.date);
    const dayKey = startOfLocalDay(ts);
    const last = out[out.length - 1];
    if (last && last.dayKey === dayKey) {
      last.items.push(msg);
    } else {
      out.push({
        dayKey,
        label: formatDateLabelFromDayKey(dayKey, t, fmt),
        items: [msg],
      });
    }
  }
  return out;
}

export const DateDelimiter = ({ label }: { label: string }) => (
  <div className="my-3 flex h-3 items-center justify-center">
    <Separator />
    <div className="mx-5 whitespace-nowrap text-center text-xs text-muted-foreground">
      {label}
    </div>
    <Separator />
  </div>
);
