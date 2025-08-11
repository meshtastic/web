import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useDevice } from "@core/stores";
import { useTranslation } from "react-i18next";

export interface ClientNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientNotificationDialog = ({
  open,
  onOpenChange,
}: ClientNotificationDialogProps) => {
  const { t } = useTranslation("dialog");
  const { getClientNotification, removeClientNotification } = useDevice();

  const localOnOpenChange = (open: boolean) => {
    removeClientNotification(0);
    if (!getClientNotification(0)) {
      onOpenChange(open);
    }
  };

  const dialogContent = (() => {
    if (!getClientNotification(0)) {
      return;
    }

    switch (getClientNotification(0)?.payloadVariant.case) {
      // TODO: Add KeyVerification logic
      /*case "keyVerificationNumberInform":
        return <></>;
      case "keyVerificationNumberRequest":
        return <></>;
      case "keyVerificationFinal":
        return <></>;
      case "duplicatedPublicKey":
        return <></>;
      case "lowEntropyKey":
        return <></>;*/

      default:
        return (
          <DialogHeader>
            <DialogTitle>{t("clientNotification.title")}</DialogTitle>
            <DialogDescription>
              {t([
                `clientNotification.${getClientNotification(0)?.message}`,
                getClientNotification(0)?.message ?? "",
              ])}
            </DialogDescription>
          </DialogHeader>
        );
    }
  })();

  return (
    <Dialog open={open} onOpenChange={localOnOpenChange}>
      <DialogContent>
        <DialogClose />
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
};
