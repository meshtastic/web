import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import { Separator } from "@components/UI/Separator";
import { Skeleton } from "@components/UI/Skeleton.tsx";
import type { Message } from "@core/stores/messageStore/types.ts";
import type { TFunction } from "i18next";
import { InboxIcon } from "lucide-react";
import { Fragment, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface ChannelChatProps {
  messages?: Message[];
}

function toTs(d: Message["date"]): number {
  return typeof d === "number" ? d : Date.parse(String(d));
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDateLabelFromDayKey(
  dayKey: number,
  t: TFunction<"common", undefined>,
  fmt: Intl.DateTimeFormat,
): string {
  const todayKey = startOfLocalDay(Date.now());
  const yestKey = todayKey - 24 * 60 * 60 * 1000;

  if (dayKey === todayKey) {
    return t("unit.day.today"); // "Today" from common.json
  }
  if (dayKey === yestKey) {
    return t("unit.day.yesterday"); // "Yesterday" from common.json
  }
  return fmt.format(new Date(dayKey));
}

type DayGroup = { dayKey: number; label: string; items: Message[] };

function groupMessagesByDay(
  messages: Message[],
  t: TFunction<"common", undefined>,
  fmt: Intl.DateTimeFormat,
): DayGroup[] {
  const out: DayGroup[] = [];

  for (const msg of messages) {
    const ts = toTs(msg.date);
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

const DateDelimiter = ({ label }: { label: string }) => (
  <li aria-label={label}>
    <div className="my-2 flex h-3 items-center justify-center">
      <Separator className="bg-slate-100 dark:bg-slate-800" />
      <div className="mx-5 whitespace-nowrap text-center text-xs text-slate-400">
        {label}
      </div>
      <Separator className="bg-slate-100 dark:bg-slate-800" />
    </div>
  </li>
);

const MessageSkeleton = () => {
  console.log("[ChannelChat] Showing MessageSkeleton (Suspense fallback)");
  return (
    <li className="group w-full py-2 relative list-none rounded-md">
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </li>
  );
};

const EmptyState = () => {
  const { t } = useTranslation("messages");
  return (
    <div className="flex flex-1 flex-col place-content-center place-items-center p-8 text-slate-500 dark:text-slate-400">
      <InboxIcon className="mb-2 h-8 w-8" />
      <span className="text-sm">{t("emptyState.text")}</span>
    </div>
  );
};

export const ChannelChat = ({ messages = [] }: ChannelChatProps) => {
  const { i18n, t } = useTranslation();

  const locale = useMemo(
    () =>
      i18n.language ||
      (typeof navigator !== "undefined" ? navigator.language : "en-US"),
    [i18n.language],
  );

  const dayLabelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale],
  );

  // Sort messages by date in case they are stored out of order
  const sorted = useMemo(
    () => [...messages].sort((a, b) => toTs(b.date) - toTs(a.date)),
    [messages],
  );

  const groups = useMemo(
    () => groupMessagesByDay(sorted, t, dayLabelFmt),
    [sorted, dayLabelFmt, t],
  );

  if (!messages.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <EmptyState />
      </div>
    );
  }

  return (
    <ul className="flex flex-col-reverse flex-grow overflow-y-auto px-3 py-2">
      {groups.map(({ dayKey, label, items }) => (
        <Fragment key={dayKey}>
          {/* Render messages first, then delimiter — with flex-col-reverse this shows the delimiter above that day's messages */}
          {items.map((message) => (
            <Suspense
              key={message.messageId ?? `${message.from}-${message.date}`}
              fallback={<MessageSkeleton />}
            >
              <MessageItem message={message} />
            </Suspense>
          ))}
          <DateDelimiter label={label} />
        </Fragment>
      ))}
    </ul>
  );
};
