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
import { useDevice, useNodeDB } from "@core/stores";
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
  const { t } = useTranslation("dialog");
  const { config, setDialogOpen } = useDevice();
  const { getMyNode } = useNodeDB();
  const privateKey = config.security?.privateKey;
  const publicKey = config.security?.publicKey;

  const decodeKeyData = React.useCallback(
    (key: Uint8Array<ArrayBufferLike>) => {
      if (!key) {
        return "";
      }
      return fromByteArray(key ?? new Uint8Array(0));
    },
    [],
  );

  const closeDialog = React.useCallback(() => {
    setDialogOpen("pkiBackup", false);
  }, [setDialogOpen]);

  const renderPrintWindow = React.useCallback(() => {
    if (!privateKey || !publicKey) {
      return;
    }

    const printWindow = globalThis.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t("pkiBackup.header", {
              interpolation: { escapeValue: false },
              shortName: getMyNode()?.user?.shortName ?? t("unknown.shortName"),
              longName: getMyNode()?.user?.longName ?? t("unknown.longName"),
            })}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; }
              p { font-size: 14px; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>${t("pkiBackup.header", {
              interpolation: { escapeValue: false },
              shortName: getMyNode()?.user?.shortName ?? t("unknown.shortName"),
              longName: getMyNode()?.user?.longName ?? t("unknown.longName"),
            })}</h1>
            <h3>${t("pkiBackup.secureBackup")}</h3>
            <h3>${t("pkiBackup.publicKey")}</h3>
            <p>${decodeKeyData(publicKey)}</p>
            <h3>${t("pkiBackup.privateKey")}</h3>
            <p>${decodeKeyData(privateKey)}</p>
            <p>${t("pkiBackup.footer")}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      closeDialog();
    }
  }, [decodeKeyData, privateKey, publicKey, closeDialog, t, getMyNode]);

  const createDownloadKeyFile = React.useCallback(() => {
    if (!privateKey || !publicKey) {
      return;
    }

    const decodedPrivateKey = decodeKeyData(privateKey);
    const decodedPublicKey = decodeKeyData(publicKey);

    const formattedContent = [
      `${t("pkiBackup.header")}\n\n`,
      `${t("pkiBackup.privateKey")}\n`,
      decodedPrivateKey,
      `\n\n${t("pkiBackup.publicKey")}\n`,
      decodedPublicKey,
      `\n\n${t("pkiBackup.footer")}`,
    ].join("");

    const blob = new Blob([formattedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = t("pkiBackup.fileName", {
      interpolation: { escapeValue: false },
      shortName: getMyNode()?.user?.shortName ?? t("unknown.shortName"),
      longName: getMyNode()?.user?.longName ?? t("unknown.longName"),
    });

    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeDialog();
    URL.revokeObjectURL(url);
  }, [decodeKeyData, privateKey, publicKey, closeDialog, t, getMyNode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("pkiBackup.title")}</DialogTitle>
          <DialogDescription>{t("pkiBackup.secureBackup")}</DialogDescription>
          <DialogDescription>
            <span className="font-bold break-before-auto">
              {t("pkiBackup.loseKeysWarning")}
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
            {t("button.download")}
          </Button>
          <Button variant="default" onClick={() => renderPrintWindow()}>
            <PrinterIcon size={20} className="mr-2" />
            {t("button.print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
