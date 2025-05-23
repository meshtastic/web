import { useDevice } from "../../core/stores/deviceStore.ts";
import { Button } from "../UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { fromByteArray } from "base64-js";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export interface PkiBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PkiBackupDialog = ({
  open,
  onOpenChange,
}: PkiBackupDialogProps) => {
  const { t } = useTranslation();
  const { config, setDialogOpen } = useDevice();
  const privateKey = config.security?.privateKey;
  const publicKey = config.security?.publicKey;

  const decodeKeyData = React.useCallback(
    (key: Uint8Array<ArrayBufferLike>) => {
      if (!key) return "";
      return fromByteArray(key ?? new Uint8Array(0));
    },
    [],
  );

  const closeDialog = React.useCallback(() => {
    setDialogOpen("pkiBackup", false);
  }, [setDialogOpen]);

  const renderPrintWindow = React.useCallback(() => {
    if (!privateKey || !publicKey) return;

    const printWindow = globalThis.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t("dialog_pkiBackup_print_header")}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; }
              p { font-size: 14px; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>${t("dialog_pkiBackup_print_header")}</h1>
            <br>
            <h2>${t("dialog_pkiBackup_print_label_publicKey")}</h2>
            <p>${decodeKeyData(publicKey)}</p>
            <h2>${t("dialog_pkiBackup_print_label_privateKey")}</h2>
            <p>${decodeKeyData(privateKey)}</p>
            <br>
            <p>${t("dialog_pkiBackup_print_footer")}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      closeDialog();
    }
  }, [decodeKeyData, privateKey, publicKey, closeDialog, t]);

  const createDownloadKeyFile = React.useCallback(() => {
    if (!privateKey || !publicKey) return;

    const decodedPrivateKey = decodeKeyData(privateKey);
    const decodedPublicKey = decodeKeyData(publicKey);

    const formattedContent = [
      `${t("dialog_pkiBackup_print_header")}\n\n`,
      `${t("dialog_pkiBackup_print_label_privateKey")}\n`,
      decodedPrivateKey,
      `\n\n${t("dialog_pkiBackup_print_label_publicKey")}\n`,
      decodedPublicKey,
      `\n\n${t("dialog_pkiBackup_print_footer")}`,
    ].join("");

    const blob = new Blob([formattedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "meshtastic_keys.txt";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeDialog();
    URL.revokeObjectURL(url);
  }, [decodeKeyData, privateKey, publicKey, closeDialog, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("dialog_pkiBackup_title")}</DialogTitle>
          <DialogDescription>
            {t("dialog_pkiBackup_description_secureBackup")}
          </DialogDescription>
          <DialogDescription>
            <span className="font-bold break-before-auto">
              {t("dialog_pkiBackup_description_loseKeysWarning")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant="default"
            name="download"
            onClick={() => createDownloadKeyFile()}
            className=""
          >
            <DownloadIcon size={20} className="mr-2" />
            {t("dialog_button_download")}
          </Button>
          <Button variant="default" onClick={() => renderPrintWindow()}>
            <PrinterIcon size={20} className="mr-2" />
            {t("dialog_button_print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
