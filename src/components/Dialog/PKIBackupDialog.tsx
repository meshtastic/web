import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import React from "react";
import { useDevice } from "@app/core/stores/deviceStore";
import { fromByteArray } from "base64-js";

export interface PkiBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PkiBackupDialog = ({
  open,
  onOpenChange,
}: PkiBackupDialogProps) => {
  const { config, setDialogOpen } = useDevice();
  const privateKeyData = config.security?.privateKey

  // If the private data doesn't exist return null
  if (!privateKeyData) {
    return null
  }

  const getPrivateKey = React.useMemo(() => fromByteArray(config.security?.privateKey ?? new Uint8Array(0)), [config.security?.privateKey]);

  const closeDialog = React.useCallback(() => {
    setDialogOpen("pkiBackup", false)
  }, [setDialogOpen])

  const renderPrintWindow = React.useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Your Private Key</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; }
              p { font-size: 14px; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>Your Private Key</h1>
            <p>${getPrivateKey}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      closeDialog()

    }
  }, [getPrivateKey, closeDialog]);

  const createDownloadKeyFile = React.useCallback(() => {
    const blob = new Blob([getPrivateKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meshtastic_private_key.txt";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeDialog()
    URL.revokeObjectURL(url);
  }, [getPrivateKey, closeDialog]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backup Key</DialogTitle>
          <DialogDescription>
            Its important to backup your private key and store your backup securely!
          </DialogDescription>
          <DialogDescription>
            <span className="font-bold break-before-auto">If you lose your private key, you will need to reset your device.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant={'default'}
            onClick={() => createDownloadKeyFile()}
            className=""
          >
            <DownloadIcon size={20} className="mr-2" />
            Download
          </Button>
          <Button
            variant={'default'}
            onClick={() => renderPrintWindow()}
          >
            <PrinterIcon size={20} className="mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
