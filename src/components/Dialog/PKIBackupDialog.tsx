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

export interface PkiBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PkiBackupDialog = ({
  open,
  onOpenChange,
}: PkiBackupDialogProps) => {
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
            <title>=== MESHTASTIC KEYS ===</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; }
              p { font-size: 14px; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>=== MESHTASTIC KEYS ===</h1>
            <br>
            <h2>Public Key:</h2>
            <p>${decodeKeyData(publicKey)}</p>
            <h2>Private Key:</h2>
            <p>${decodeKeyData(privateKey)}</p>
            <br>
            <p>=== END OF KEYS ===</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      closeDialog();
    }
  }, [decodeKeyData, privateKey, publicKey, closeDialog]);

  const createDownloadKeyFile = React.useCallback(() => {
    if (!privateKey || !publicKey) return;

    const decodedPrivateKey = decodeKeyData(privateKey);
    const decodedPublicKey = decodeKeyData(publicKey);

    const formattedContent = [
      "=== MESHTASTIC KEYS ===\n\n",
      "Private Key:\n",
      decodedPrivateKey,
      "\n\nPublic Key:\n",
      decodedPublicKey,
      "\n\n=== END OF KEYS ===",
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
  }, [decodeKeyData, privateKey, publicKey, closeDialog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Backup Keys</DialogTitle>
          <DialogDescription>
            Its important to backup your public and private keys and store your
            backup securely!
          </DialogDescription>
          <DialogDescription>
            <span className="font-bold break-before-auto">
              If you lose your keys, you will need to reset your device.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant="default"
            onClick={() => createDownloadKeyFile()}
            className=""
          >
            <DownloadIcon size={20} className="mr-2" />
            Download
          </Button>
          <Button variant="default" onClick={() => renderPrintWindow()}>
            <PrinterIcon size={20} className="mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
