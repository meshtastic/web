import type { TracerouteView } from "@core/messaging/tracerouteView.ts";
import { cn } from "@core/utils/cn.ts";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

export interface TracerouteCardProps {
  trace: TracerouteView;
  /** Clock time it arrived, already formatted. */
  time: string;
  nameOf: (nodeNum: number) => string;
  locale: string;
}

const Path = ({
  nodes,
  label,
  nameOf,
}: {
  nodes: readonly number[];
  label: string;
  nameOf: (nodeNum: number) => string;
}) => (
  <ol
    aria-label={label}
    className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-help"
  >
    {nodes.map((num, i) => {
      const last = i === nodes.length - 1;
      return (
        <Fragment key={`${num}:${i}`}>
          {i > 0 ? (
            <li aria-hidden="true" className="text-muted">
              →
            </li>
          ) : null}
          <li
            className={cn(
              "rounded-md px-2 py-0.5",
              last ? "bg-accent-tint text-accent" : "bg-raised",
            )}
          >
            {nameOf(num)}
          </li>
        </Fragment>
      );
    })}
  </ol>
);

/**
 * A traceroute answered by the peer, inline in the conversation: the path
 * from this radio to the peer, the SNR of each hop, and the return path.
 */
export const TracerouteCard = ({
  trace,
  time,
  nameOf,
  locale,
}: TracerouteCardProps) => {
  const { t } = useTranslation("messages");
  const db = (value: number | undefined) =>
    value === undefined
      ? t("traceroute.unknownSnr")
      : t("traceroute.snrValue", {
          value: new Intl.NumberFormat(locale, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          }).format(value),
        });
  const towards = trace.snrTowards.map(db).join(`${t("traceroute.then")} `);
  const back = trace.pathBack.length
    ? trace.sameReturn
      ? t("traceroute.sameReturn")
      : undefined
    : t("traceroute.noReturn");

  return (
    <article
      aria-label={t("traceroute.title")}
      className="flex w-[440px] max-w-full flex-col gap-2 self-center rounded-card border border-control bg-surface px-3.5 py-3"
    >
      <header className="flex justify-between text-meta text-muted">
        <span className="font-semibold text-secondary">
          {t("traceroute.title")}
        </span>
        <span>{time}</span>
      </header>
      <Path nodes={trace.path} label={t("traceroute.route")} nameOf={nameOf} />
      {trace.pathBack.length > 0 && !trace.sameReturn ? (
        <Path
          nodes={trace.pathBack}
          label={t("traceroute.returnRoute")}
          nameOf={nameOf}
        />
      ) : null}
      <p className="m-0 text-meta text-muted">
        {[towards ? t("traceroute.snr", { values: towards }) : undefined, back]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </article>
  );
};
