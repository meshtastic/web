import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { CopyField } from "@components/UI/CopyField.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import { base64Encode } from "@bufbuild/protobuf/wire";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface GenerateAdminKeyDialogProps {
  onOpenChange: (open: boolean) => void;
  /** Called with the new public key (base64) once the private half is saved. */
  onUse: (publicKey: string) => void;
}

const newKeyPair = () => {
  const privateKey = getX25519PrivateKey();
  return {
    privateKey: base64Encode(privateKey),
    publicKey: base64Encode(getX25519PublicKey(privateKey)),
  };
};

/**
 * Makes a key pair for a radio that will manage this one. Only the public
 * half leaves this dialog; the private half lives in its state, so mount
 * the dialog only while it is open and it is gone once closed.
 */
export const GenerateAdminKeyDialog = ({
  onOpenChange,
  onUse,
}: GenerateAdminKeyDialogProps) => {
  const { t } = useTranslation("dialog");
  const [pair] = useState(newKeyPair);
  const [saved, setSaved] = useState(false);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("generateAdminKey.title")}</DialogTitle>
          <DialogDescription>
            {t("generateAdminKey.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <span className="text-help font-medium text-primary">
            {t("generateAdminKey.privateKey")}
          </span>
          <CopyField
            fill
            label={t("generateAdminKey.privateKey")}
            value={pair.privateKey}
          />
        </div>
        <Callout tone="warning" title={t("generateAdminKey.warningTitle")}>
          {t("generateAdminKey.warning")}
        </Callout>
        <Checkbox checked={saved} onChange={setSaved} name="savedPrivateKey">
          <span className="text-primary">{t("generateAdminKey.saved")}</span>
        </Checkbox>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button disabled={!saved} onClick={() => onUse(pair.publicKey)}>
            {t("generateAdminKey.use")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
