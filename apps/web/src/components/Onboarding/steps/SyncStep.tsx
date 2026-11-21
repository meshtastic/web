import { ProgressBar } from "@components/UI/ProgressBar.tsx";
import type { SyncRow, SyncView } from "@core/onboarding/syncProgress.ts";
import { cn } from "@core/utils/cn.ts";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const ROW_LABEL = {
  connection: "sync.rowConnection",
  settings: "sync.rowSettings",
  channels: "sync.rowChannels",
  nodes: "sync.rowNodes",
} as const;

const STATE_LABEL = {
  done: "sync.stateDone",
  active: "sync.stateActive",
  pending: "sync.statePending",
} as const;

export interface SyncStepProps {
  actions: StepActionsProps;
  /** The radio's name, once known. */
  radioName: string | undefined;
  view: SyncView;
}

export const SyncStep = ({ actions, radioName, view }: SyncStepProps) => {
  const { t } = useTranslation("onboarding");
  const name = radioName ?? t("sync.yourRadio");
  const ready = view.phase === "ready";

  const meta = (row: SyncRow): string => {
    if (row.id === "channels" && row.count !== undefined && row.count > 0) {
      return t("sync.channelCount", { count: row.count });
    }
    if (row.id === "nodes" && row.count !== undefined && row.count > 0) {
      return t("sync.nodeCount", { count: row.count });
    }
    return row.state === "done" ? t("sync.done") : "";
  };

  return (
    <StepShell actions={actions}>
      <StepHeading>
        {view.phase === "connecting"
          ? t("sync.titleConnecting", { name })
          : t("sync.title", { name })}
      </StepHeading>
      <StepBody>{t("sync.body")}</StepBody>
      <div className="flex flex-col gap-1 rounded-panel border border-subtle bg-chat p-2">
        <ul className="flex flex-col gap-1">
          {view.rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  row.state === "done"
                    ? "bg-accent-tint text-accent"
                    : "bg-raised text-accent",
                )}
              >
                {row.state === "done" ? (
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                ) : row.state === "active" ? (
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                ) : null}
              </span>
              <span
                className={cn(
                  "flex-1 text-header",
                  row.state === "pending" ? "text-muted" : "text-primary",
                )}
              >
                {t(ROW_LABEL[row.id])}
                <span className="sr-only">, {t(STATE_LABEL[row.state])}</span>
              </span>
              <span className="text-help text-muted tabular-nums">
                {meta(row)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mx-2.5 mb-2.5 mt-1">
          {ready ? (
            <ProgressBar value={100} label={t("sync.progress")} />
          ) : (
            // The radio doesn't say how much it will send, so the bar
            // can't show a fraction while it streams.
            <>
              <progress aria-label={t("sync.progress")} className="sr-only" />
              <div
                aria-hidden="true"
                className="relative h-1.5 w-full overflow-hidden rounded-full bg-raised"
              >
                <span className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-accent" />
              </div>
            </>
          )}
        </div>
      </div>
      <output className="sr-only">{ready ? t("sync.ready") : ""}</output>
    </StepShell>
  );
};
