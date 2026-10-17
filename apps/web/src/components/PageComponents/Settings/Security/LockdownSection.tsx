import { DisableLockdownDialog } from "@components/Dialog/LockdownDialog/DisableLockdownDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useLockdown } from "@core/hooks/useLockdown.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const State = Protobuf.Mesh.LockdownStatus_State;

const STATE_KEYS: Partial<Record<Protobuf.Mesh.LockdownStatus_State, string>> =
  {
    [State.DISABLED]: "off",
    [State.UNLOCKED]: "unlocked",
    [State.LOCKED]: "locked",
    [State.NEEDS_PROVISION]: "needsProvision",
    [State.UNLOCK_FAILED]: "unlockFailed",
  };

/**
 * Lockdown controls on the Security page. Only rendered for firmware that
 * reports a lockdown status, i.e. lockdown-capable builds.
 */
export const LockdownSection = () => {
  const { t } = useTranslation("config");
  const { toast } = useToast();
  const { client, status } = useLockdown();
  const [disableOpen, setDisableOpen] = useState(false);

  if (!client || !status || status.state === State.STATE_UNSPECIFIED) {
    return null;
  }

  const stateKey = STATE_KEYS[status.state] ?? "locked";
  const unlocked = status.state === State.UNLOCKED;

  const report = (promise: Promise<unknown>) => {
    promise.catch((e: unknown) => {
      toast({
        title: t("security.lockdown.label"),
        description: e instanceof Error ? e.message : String(e),
      });
    });
  };

  return (
    <section className="mt-8 space-y-5">
      <div>
        <Heading as="h4" className="font-medium">
          {t("security.lockdown.label")}
        </Heading>
        <Subtle>{t("security.lockdown.description")}</Subtle>
      </div>

      <div className="grid gap-1 text-sm">
        <p>
          <span className="font-medium">{t("security.lockdown.status")}: </span>
          <span data-testid="lockdown-state">
            {t(`security.lockdown.state.${stateKey}`)}
          </span>
        </p>
        {unlocked && status.bootsRemaining > 0 && (
          <p>
            {t("security.lockdown.bootsRemaining", {
              count: status.bootsRemaining,
            })}
          </p>
        )}
        {unlocked && status.validUntilEpoch > 0 && (
          <p>
            {t("security.lockdown.expires", {
              date: new Date(status.validUntilEpoch * 1000).toLocaleString(),
            })}
          </p>
        )}
      </div>

      {unlocked && (
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => report(client.device.lockNow())}
            >
              {t("security.lockdown.lockNow")}
            </Button>
            <Subtle>{t("security.lockdown.lockNowDescription")}</Subtle>
          </div>
          <div className="space-y-1">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDisableOpen(true)}
            >
              {t("security.lockdown.disable")}
            </Button>
            <Subtle>{t("security.lockdown.disableDescription")}</Subtle>
          </div>
        </div>
      )}

      <DisableLockdownDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onSubmit={(passphrase) =>
          report(client.device.disableLockdown(passphrase))
        }
      />
    </section>
  );
};
