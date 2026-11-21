import { Callout } from "@components/UI/Callout.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import {
  CONNECT_METHODS,
  type ConnectMethod,
  type DeviceTransport,
  type TransportSupport,
  type UnavailableReason,
} from "@core/onboarding/capabilities.ts";
import type { HttpAddressError } from "@core/onboarding/validation.ts";
import { cn } from "@core/utils/cn.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const METHOD_TEXT = {
  bluetooth: {
    badge: "connect.bluetoothBadge",
    title: "connect.bluetoothTitle",
    body: "connect.bluetoothBody",
  },
  serial: {
    badge: "connect.serialBadge",
    title: "connect.serialTitle",
    body: "connect.serialBody",
  },
  http: {
    badge: "connect.httpBadge",
    title: "connect.httpTitle",
    body: "connect.httpBody",
  },
} as const;

const BROWSER_SUPPORT_DOCS = {
  bluetooth:
    "https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility",
  serial:
    "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
} as const satisfies Record<DeviceTransport, string>;

const useUnavailableText = () => {
  const { t } = useTranslation("onboarding");
  return (transport: DeviceTransport, reason: UnavailableReason): string => {
    if (reason.kind === "insecureContext") {
      return t("connect.unavailableInsecure");
    }
    if (reason.browser === "ios") {
      return t(
        transport === "bluetooth"
          ? "connect.unavailableBluetoothIos"
          : "connect.unavailableSerialIos",
      );
    }
    return t(
      transport === "bluetooth"
        ? "connect.unavailableBluetooth"
        : "connect.unavailableSerial",
      { browser: t(`browser.${reason.browser}`) },
    );
  };
};

export interface ConnectStepProps {
  actions: StepActionsProps;
  support: TransportSupport;
  method: ConnectMethod;
  onSelectMethod: (method: ConnectMethod) => void;
  httpAddress: string;
  onHttpAddressChange: (value: string) => void;
  useHttps: boolean;
  onUseHttpsChange: (value: boolean) => void;
  /** The page is HTTPS and the browser can't reach plain HTTP radios. */
  httpsLocked: boolean;
  /** Shown once the user tried to connect with a bad address. */
  addressError: HttpAddressError | undefined;
  /** Submits the step (Enter in the address field). */
  onSubmit: () => void;
  formId: string;
}

export const ConnectStep = ({
  actions,
  support,
  method,
  onSelectMethod,
  httpAddress,
  onHttpAddressChange,
  useHttps,
  onUseHttpsChange,
  httpsLocked,
  addressError,
  onSubmit,
  formId,
}: ConnectStepProps) => {
  const { t } = useTranslation("onboarding");
  const addressId = useId();
  const addressErrorId = useId();
  const httpsId = useId();
  const groupName = useId();
  const unavailableText = useUnavailableText();
  const insecure = Object.values(support.unavailable).some(
    (reason) => reason.kind === "insecureContext",
  );

  return (
    <StepShell actions={actions}>
      <StepHeading>{t("connect.title")}</StepHeading>
      <StepBody>{t("connect.body")}</StepBody>
      {support.httpOnly ? (
        <Callout tone="warning">
          {t(insecure ? "connect.unsupportedInsecure" : "connect.unsupported")}
        </Callout>
      ) : null}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">{t("connect.methodGroup")}</legend>
        {CONNECT_METHODS.map((m) => {
          const checked = m === method;
          const disabled = !support.available[m];
          const reason = m === "http" ? undefined : support.unavailable[m];
          const text = METHOD_TEXT[m];
          return (
            <label
              key={m}
              className={cn(
                "flex items-center gap-3.5 rounded-panel border-2 px-4 py-3.5 transition-colors",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                checked
                  ? "border-accent bg-accent-tint"
                  : "border-control bg-chat",
                disabled
                  ? "cursor-not-allowed"
                  : "cursor-pointer hover:bg-selected",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={m}
                checked={checked}
                disabled={disabled}
                onChange={() => onSelectMethod(m)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-control bg-raised text-meta font-bold text-accent",
                  disabled && "opacity-45",
                )}
              >
                {t(text.badge)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-header font-semibold",
                    disabled ? "text-muted" : "text-primary",
                  )}
                >
                  {t(text.title)}
                </span>
                {m !== "http" && reason ? (
                  <span className="text-help text-secondary">
                    {unavailableText(m, reason)}{" "}
                    <a
                      href={BROWSER_SUPPORT_DOCS[m]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline-offset-4 hover:underline"
                    >
                      {t("connect.browserSupport")}
                    </a>
                  </span>
                ) : (
                  <span className="text-help text-muted">
                    {disabled ? t("connect.unavailable") : t(text.body)}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-[18px] shrink-0 rounded-full border-2",
                  checked ? "border-accent bg-accent" : "border-control",
                  disabled && "opacity-45",
                )}
              />
            </label>
          );
        })}
      </fieldset>
      {method === "http" ? (
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-2 rounded-card border border-subtle bg-chat p-3.5"
        >
          <Label htmlFor={addressId} className="text-help font-medium">
            {t("connect.address")}
          </Label>
          <Input
            id={addressId}
            value={httpAddress}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={t("connect.addressPlaceholder")}
            onChange={(event) => onHttpAddressChange(event.target.value)}
            variant={addressError ? "invalid" : "default"}
            aria-invalid={addressError !== undefined}
            aria-describedby={addressError ? addressErrorId : undefined}
            className="h-11 font-mono text-header"
          />
          <p
            id={addressErrorId}
            aria-live="polite"
            className="text-help text-danger empty:hidden"
          >
            {addressError === "empty"
              ? t("connect.addressEmpty")
              : addressError === "invalid"
                ? t("connect.addressInvalid")
                : ""}
          </p>
          <div className="flex items-center gap-2.5">
            <Switch
              id={httpsId}
              checked={useHttps}
              disabled={httpsLocked}
              onCheckedChange={onUseHttpsChange}
            />
            <Label htmlFor={httpsId} className="text-help text-secondary">
              {t("connect.useHttps")}
            </Label>
          </div>
          {httpsLocked ? (
            <p className="text-help text-muted">{t("connect.httpsRequired")}</p>
          ) : null}
        </form>
      ) : null}
      <p className="text-help text-muted">
        {t("connect.noRadio")}{" "}
        <a
          href="https://meshtastic.org/docs/hardware/devices/"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline-offset-4 hover:underline"
        >
          {t("connect.supportedDevices")}
        </a>
      </p>
    </StepShell>
  );
};
