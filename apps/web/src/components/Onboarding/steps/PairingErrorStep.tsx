import { CertificateGuide } from "@components/CertificateGuide.tsx";
import type { ConnectMethod } from "@core/onboarding/capabilities.ts";
import { testHttpReachable } from "@pages/Connections/utils.ts";
import { CircleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const TIPS = {
  bluetooth: ["error.powerOn", "error.phoneApp", "error.reboot"],
  serial: [
    "error.powerOn",
    "error.dataCable",
    "error.otherTab",
    "error.reboot",
  ],
  http: ["error.sameNetwork", "error.address", "error.https", "error.reboot"],
} as const;

export interface PairingErrorStepProps {
  actions: StepActionsProps;
  method: ConnectMethod;
  detail: string | undefined;
  /** The radio's HTTPS URL when the failure looks like an untrusted certificate. */
  certificateUrl: string | undefined;
  onCertificateTrusted: () => void;
}

export const PairingErrorStep = ({
  actions,
  method,
  detail,
  certificateUrl,
  onCertificateTrusted,
}: PairingErrorStepProps) => {
  const { t } = useTranslation("onboarding");
  return (
    <StepShell actions={actions}>
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-panel bg-danger text-danger"
      >
        <CircleAlertIcon className="size-6" />
      </span>
      <StepHeading>{t("error.title")}</StepHeading>
      <div role="alert">
        <StepBody>{t("error.intro")}</StepBody>
      </div>
      <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-header leading-normal text-secondary">
        {TIPS[method].map((tip) => (
          <li key={tip}>{t(tip)}</li>
        ))}
      </ol>
      {certificateUrl ? (
        <CertificateGuide
          url={certificateUrl}
          retest={async () =>
            (await testHttpReachable(certificateUrl)).reachable
          }
          onTrusted={onCertificateTrusted}
        />
      ) : null}
      {detail ? (
        <details className="text-help text-muted">
          <summary className="cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-focus">
            {t("error.details")}
          </summary>
          <code className="mt-2 block rounded-lg bg-app p-2.5 font-mono text-secondary break-words">
            {detail}
          </code>
        </details>
      ) : null}
    </StepShell>
  );
};
