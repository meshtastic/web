import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const FEATURES = [
  { title: "welcome.offGridTitle", body: "welcome.offGridBody" },
  { title: "welcome.encryptedTitle", body: "welcome.encryptedBody" },
  { title: "welcome.meshTitle", body: "welcome.meshBody" },
] as const;

export const WelcomeStep = ({ actions }: { actions: StepActionsProps }) => {
  const { t } = useTranslation("onboarding");
  return (
    <StepShell actions={actions}>
      <StepHeading large>{t("welcome.title")}</StepHeading>
      <div className="max-w-[460px]">
        <StepBody>{t("welcome.body")}</StepBody>
      </div>
      <ul className="mt-2 flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex items-start gap-3 text-header"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent"
            />
            <span>
              <strong className="font-semibold text-primary">
                {t(feature.title)}
              </strong>{" "}
              <span className="text-muted">{t(feature.body)}</span>
            </span>
          </li>
        ))}
      </ul>
    </StepShell>
  );
};
