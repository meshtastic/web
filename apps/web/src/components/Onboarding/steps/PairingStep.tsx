import { Button } from "@components/UI/Button.tsx";
import type { PickerState } from "@core/onboarding/wizard.ts";
import { Trans, useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

/**
 * Example entries in the style each browser chooser uses: radios advertise
 * over Bluetooth as `Meshtastic_` plus four hex digits, and USB ports show
 * the name of the radio's USB-serial chip. They are device names, not copy,
 * so they aren't translated.
 */
const EXAMPLE_DEVICES = {
  bluetooth: ["Meshtastic_1a2b", "Meshtastic_7c4e"],
  serial: [
    "USB JTAG/serial debug unit",
    "CP2102 USB to UART Bridge Controller",
  ],
} as const;

const PICKER_TEXT = {
  bluetooth: {
    title: "pairing.pickerTitleBluetooth",
    confirm: "pairing.pickerPair",
  },
  serial: {
    title: "pairing.pickerTitleSerial",
    confirm: "pairing.pickerConnect",
  },
} as const;

export interface PairingStepProps {
  actions: StepActionsProps;
  method: "bluetooth" | "serial";
  picker: PickerState;
  onNotListed: () => void;
}

/**
 * Shown while the browser's own device picker is up. The picture is a
 * stand-in for that picker, so it is hidden from assistive technology.
 */
export const PairingStep = ({
  actions,
  method,
  picker,
  onNotListed,
}: PairingStepProps) => {
  const { t } = useTranslation("onboarding");
  const [chosen, other] = EXAMPLE_DEVICES[method];
  const text = PICKER_TEXT[method];
  return (
    <StepShell actions={actions}>
      <StepHeading>{t("pairing.title")}</StepHeading>
      <StepBody>
        <Trans
          t={t}
          i18nKey={
            method === "bluetooth"
              ? "pairing.bodyBluetooth"
              : "pairing.bodySerial"
          }
          components={{ strong: <strong className="font-semibold" /> }}
        />
      </StepBody>
      <div
        aria-hidden="true"
        className="max-w-[420px] overflow-hidden rounded-panel border border-control bg-surface text-primary shadow-floating"
      >
        <div className="border-b border-subtle px-3.5 py-3 text-help font-semibold">
          {t(text.title)}
        </div>
        <div className="flex flex-col p-1.5 text-body">
          <div className="rounded-lg bg-accent-tint px-2.5 py-2.5 font-semibold text-on-accent-tint">
            {chosen}
          </div>
          <div className="px-2.5 py-2.5">{other}</div>
          {method === "bluetooth" ? (
            <div className="px-2.5 py-2.5 text-muted">
              {t("pairing.pickerSearching")}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-3.5 py-2.5 text-help">
          <span className="px-3 py-1.5">{t("actions.cancel")}</span>
          <span className="rounded-md bg-accent px-3 py-1.5 text-on-accent">
            {t(text.confirm)}
          </span>
        </div>
      </div>
      <p className="text-help text-muted">{t("pairing.illustrationNote")}</p>
      {picker === "closed" ? (
        <output className="block text-help text-secondary">
          {t("pairing.closed")}
        </output>
      ) : null}
      <Button
        variant="link"
        className="self-start text-header font-medium"
        onClick={onNotListed}
      >
        {t("pairing.notListed")}
      </Button>
    </StepShell>
  );
};
