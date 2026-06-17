import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const MessageType = Protobuf.Admin.KeyVerificationAdmin_MessageType;

export interface ClientNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientNotificationDialog = ({
  open,
  onOpenChange,
}: ClientNotificationDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection, getClientNotification, removeClientNotification } =
    useDevice();
  const [securityNumber, setSecurityNumber] = useState("");

  const notification = getClientNotification(0);

  const dismiss = () => {
    removeClientNotification(0);
    setSecurityNumber("");
    if (!getClientNotification(0)) {
      onOpenChange(false);
    }
  };

  // The node correlates the handshake by nonce, so responses pass remoteNodenum 0.
  const respond = (
    messageType: Protobuf.Admin.KeyVerificationAdmin_MessageType,
    nonce: bigint,
    secNum?: number,
  ) => {
    connection
      ?.sendKeyVerification(messageType, 0, nonce, secNum)
      .catch((error) => {
        console.error("Failed to send key verification message:", error);
      });
    dismiss();
  };

  const dialogContent = (() => {
    const variant = notification?.payloadVariant;
    if (!variant) {
      return null;
    }

    switch (variant.case) {
      case "keyVerificationNumberInform": {
        const value = variant.value;
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t("keyVerification.inform.title")}</DialogTitle>
              <DialogDescription>
                {t("keyVerification.inform.description", {
                  name: value.remoteLongname,
                })}
              </DialogDescription>
            </DialogHeader>
            <p className="py-4 text-center font-mono text-4xl tracking-widest">
              {value.securityNumber}
            </p>
            <DialogFooter>
              <Button variant="default" onClick={dismiss}>
                {t("keyVerification.continue")}
              </Button>
            </DialogFooter>
          </>
        );
      }

      case "keyVerificationNumberRequest": {
        const value = variant.value;
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t("keyVerification.request.title")}</DialogTitle>
              <DialogDescription>
                {t("keyVerification.request.description", {
                  name: value.remoteLongname,
                })}
              </DialogDescription>
            </DialogHeader>
            <Input
              type="number"
              inputMode="numeric"
              value={securityNumber}
              onChange={(e) => setSecurityNumber(e.target.value)}
              placeholder={t("keyVerification.request.placeholder")}
            />
            <DialogFooter>
              <Button variant="outline" onClick={dismiss}>
                {t("keyVerification.cancel")}
              </Button>
              <Button
                variant="default"
                disabled={securityNumber === ""}
                onClick={() =>
                  respond(
                    MessageType.PROVIDE_SECURITY_NUMBER,
                    value.nonce,
                    Number(securityNumber),
                  )
                }
              >
                {t("keyVerification.request.submit")}
              </Button>
            </DialogFooter>
          </>
        );
      }

      case "keyVerificationFinal": {
        const value = variant.value;
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t("keyVerification.final.title")}</DialogTitle>
              <DialogDescription>
                {t("keyVerification.final.description", {
                  name: value.remoteLongname,
                })}
              </DialogDescription>
            </DialogHeader>
            <p className="py-4 text-center font-mono text-4xl tracking-widest">
              {value.verificationCharacters}
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => respond(MessageType.DO_NOT_VERIFY, value.nonce)}
              >
                {t("keyVerification.final.reject")}
              </Button>
              <Button
                variant="default"
                onClick={() => respond(MessageType.DO_VERIFY, value.nonce)}
              >
                {t("keyVerification.final.verify")}
              </Button>
            </DialogFooter>
          </>
        );
      }

      default:
        return (
          <DialogHeader>
            <DialogTitle>{t("clientNotification.title")}</DialogTitle>
            <DialogDescription>
              {t([
                `clientNotification.${notification?.message}`,
                notification?.message ?? "",
              ])}
            </DialogDescription>
          </DialogHeader>
        );
    }
  })();

  return (
    <Dialog open={open} onOpenChange={dismiss}>
      <DialogContent>
        <DialogClose />
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
};
