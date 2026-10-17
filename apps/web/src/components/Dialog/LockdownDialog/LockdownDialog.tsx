import { useConnections } from "@app/pages/Connections/useConnections";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { useLockdown } from "@core/hooks/useLockdown.ts";
import { useDeviceStore } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useNavigate } from "@tanstack/react-router";
import { LockIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

const State = Protobuf.Mesh.LockdownStatus_State;

/** Firmware lock reasons with their own wording; others are shown raw. */
const KNOWN_REASONS = new Set([
  "needs_auth",
  "token_missing",
  "token_expired",
  "token_boots_zero",
  "token_hmac_fail",
  "token_dek_fail",
  "token_wrong_size",
  "token_bad_magic",
  "not_provisioned",
]);

const DEFAULT_BOOTS = 50;
const MAX_PASSPHRASE_BYTES = 32;
/** Re-enable submit if the radio never answers an unlock attempt. */
const PENDING_TIMEOUT_MS = 20_000;

export interface LockdownUnlockInput {
  passphrase: string;
  bootsRemaining: number;
  validForHours: number;
  maxSessionSeconds: number;
}

export interface LockdownDialogProps {
  open: boolean;
  status: Protobuf.Mesh.LockdownStatus | undefined;
  onUnlock: (input: LockdownUnlockInput) => Promise<unknown>;
  onDisconnect: () => void;
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

const backoffOf = (status: Protobuf.Mesh.LockdownStatus | undefined) =>
  status?.state === State.UNLOCK_FAILED ? status.backoffSeconds : 0;

const parseCount = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

/**
 * Asks for the lockdown passphrase while the radio withholds its config.
 * It can't be closed into a half-loaded app; the way out is to disconnect.
 * The passphrase lives only in this component's state and is cleared as
 * soon as it has been sent.
 */
export const LockdownDialog = ({
  open,
  status,
  onUnlock,
  onDisconnect,
}: LockdownDialogProps) => {
  const { t } = useTranslation("dialog");
  const id = useId();

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [boots, setBoots] = useState(String(DEFAULT_BOOTS));
  const [hours, setHours] = useState("0");
  const [sessionSeconds, setSessionSeconds] = useState("0");
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(() => backoffOf(status));
  const [seenStatus, setSeenStatus] = useState(status);

  // Each status report is a new object: it answers the last attempt and
  // starts any backoff from the moment it arrived.
  if (status !== seenStatus) {
    setSeenStatus(status);
    setPending(false);
    setRemaining(backoffOf(status));
  }

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(false), PENDING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const state = status?.state;
  const provisioning = state === State.NEEDS_PROVISION;
  const failed = state === State.UNLOCK_FAILED;
  const reason = state === State.LOCKED ? status?.lockReason : undefined;

  const bytes = byteLength(passphrase);
  const lengthValid = bytes >= 1 && bytes <= MAX_PASSPHRASE_BYTES;
  const mismatch = provisioning && confirm !== "" && confirm !== passphrase;
  const bootsValue = parseCount(boots);
  const hoursValue = parseCount(hours);
  const sessionValue = parseCount(sessionSeconds);
  const canSubmit =
    lengthValid &&
    (!provisioning || confirm === passphrase) &&
    bootsValue !== undefined &&
    hoursValue !== undefined &&
    sessionValue !== undefined &&
    !pending &&
    remaining === 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      !canSubmit ||
      bootsValue === undefined ||
      hoursValue === undefined ||
      sessionValue === undefined
    ) {
      return;
    }
    const input: LockdownUnlockInput = {
      passphrase,
      bootsRemaining: bootsValue,
      validForHours: hoursValue,
      maxSessionSeconds: sessionValue,
    };
    setPassphrase("");
    setConfirm("");
    setPending(true);
    onUnlock(input).catch(() => setPending(false));
  };

  const title = provisioning
    ? t("lockdown.provision.title")
    : failed
      ? t("lockdown.failed.title")
      : t("lockdown.title");
  const description = provisioning
    ? t("lockdown.provision.description")
    : t("lockdown.description");

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockIcon size={18} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {provisioning && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("lockdown.provision.warning")}
          </p>
        )}
        {reason && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("lockdown.reason.label", {
              reason: KNOWN_REASONS.has(reason)
                ? t(`lockdown.reason.${reason}`)
                : reason,
            })}
          </p>
        )}
        {failed && (
          <div role="alert" className="text-sm text-red-600 dark:text-red-400">
            <p>{t("lockdown.failed.description")}</p>
            {remaining > 0 && (
              <p>{t("lockdown.failed.backoff", { seconds: remaining })}</p>
            )}
          </div>
        )}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-passphrase`}>
              {t("lockdown.passphrase.label")}
            </Label>
            <Input
              id={`${id}-passphrase`}
              type="password"
              autoComplete={provisioning ? "new-password" : "current-password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              variant={bytes > MAX_PASSPHRASE_BYTES ? "invalid" : "default"}
              showPasswordToggle
            />
            {bytes > MAX_PASSPHRASE_BYTES && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {t("lockdown.passphrase.length")}
              </p>
            )}
          </div>

          {provisioning && (
            <div className="grid gap-2">
              <Label htmlFor={`${id}-confirm`}>
                {t("lockdown.passphrase.confirmLabel")}
              </Label>
              <Input
                id={`${id}-confirm`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                variant={mismatch ? "invalid" : "default"}
                showPasswordToggle
              />
              {mismatch && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t("lockdown.passphrase.mismatch")}
                </p>
              )}
            </div>
          )}

          <details
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced(e.currentTarget.open)}
          >
            <summary className="cursor-pointer text-sm font-medium">
              {t("lockdown.advanced.label")}
            </summary>
            <div className="mt-3 grid gap-4">
              <NumberField
                id={`${id}-boots`}
                label={t("lockdown.advanced.boots.label")}
                description={t("lockdown.advanced.boots.description")}
                value={boots}
                onChange={setBoots}
              />
              <NumberField
                id={`${id}-hours`}
                label={t("lockdown.advanced.validFor.label")}
                description={t("lockdown.advanced.validFor.description")}
                value={hours}
                onChange={setHours}
              />
              <NumberField
                id={`${id}-session`}
                label={t("lockdown.advanced.maxSession.label")}
                description={t("lockdown.advanced.maxSession.description")}
                value={sessionSeconds}
                onChange={setSessionSeconds}
              />
            </div>
          </details>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onDisconnect}>
              {t("lockdown.disconnect")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending
                ? t("lockdown.waiting")
                : provisioning
                  ? t("lockdown.provision.submit")
                  : t("lockdown.unlock")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface NumberFieldProps {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const NumberField = ({
  id,
  label,
  description,
  value,
  onChange,
}: NumberFieldProps) => (
  <div className="grid gap-1">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

/**
 * Shows {@link LockdownDialog} for the active device while it is locked.
 * Once the radio reports UNLOCKED the SDK re-runs the handshake and the
 * dialog closes on its own.
 */
export const LockdownGate = () => {
  const { client, status, isLocked } = useLockdown();
  const activeConnectionId = useDeviceStore((s) => s.activeConnectionId);
  const { disconnect } = useConnections();
  const navigate = useNavigate();

  if (!client || !isLocked) return null;

  return (
    <LockdownDialog
      open
      status={status}
      onUnlock={(input) => client.device.unlock(input)}
      onDisconnect={() => {
        const done = activeConnectionId
          ? disconnect(activeConnectionId)
          : client.disconnect();
        void Promise.resolve(done)
          .catch(() => {})
          .finally(() => navigate({ to: "/connections" }));
      }}
    />
  );
};
