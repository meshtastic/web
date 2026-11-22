import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const TOUR = [
  { title: "done.messagesTitle", body: "done.messagesBody" },
  { title: "done.nodesTitle", body: "done.nodesBody" },
  { title: "done.mapTitle", body: "done.mapBody" },
  { title: "done.commandTitle", body: "done.commandBody" },
] as const;

export interface DoneStepProps {
  actions: StepActionsProps;
  /** The connected radio's name; undefined when setup was skipped without one. */
  radioName: string | undefined;
}

export const DoneStep = ({ actions, radioName }: DoneStepProps) => {
  const { t } = useTranslation("onboarding");
  return (
    <StepShell actions={actions}>
      <StepHeading>
        {radioName ? t("done.title") : t("done.titleSkipped")}
      </StepHeading>
      <StepBody>
        {radioName
          ? t("done.body", { name: radioName })
          : t("done.bodySkipped")}
      </StepBody>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TOUR.map((item) => (
          <li
            key={item.title}
            className="flex flex-col gap-1.5 rounded-panel border border-subtle bg-chat p-3.5"
          >
            <span className="text-header font-semibold text-primary">
              {t(item.title)}
            </span>
            <span className="text-help leading-normal text-muted">
              {t(item.body)}
            </span>
          </li>
        ))}
      </ul>
    </StepShell>
  );
};
