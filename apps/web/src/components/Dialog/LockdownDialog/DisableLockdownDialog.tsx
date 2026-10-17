import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
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
import { Label } from "@components/UI/Label.tsx";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_PASSPHRASE_BYTES = 32;

export interface DisableLockdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (passphrase: string) => void;
}

/**
 * Confirms turning lockdown off. The radio decrypts its storage and reboots,
 * so the user has to type the passphrase and tick that it's irreversible.
 */
export const DisableLockdownDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: DisableLockdownDialogProps) => {
  const { t } = useTranslation("dialog");
  const id = useId();
  const [passphrase, setPassphrase] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const bytes = new TextEncoder().encode(passphrase).length;
  const canSubmit = confirmed && bytes >= 1 && bytes <= MAX_PASSPHRASE_BYTES;

  const close = (next: boolean) => {
    if (!next) {
      setPassphrase("");
      setConfirmed(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const value = passphrase;
    close(false);
    onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("lockdown.disable.title")}</DialogTitle>
          <DialogDescription>
            {t("lockdown.disable.description")}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-passphrase`}>
              {t("lockdown.passphrase.label")}
            </Label>
            <Input
              id={`${id}-passphrase`}
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              showPasswordToggle
            />
          </div>
          <Checkbox
            checked={confirmed}
            onChange={setConfirmed}
            name="confirmDisableLockdown"
          >
            <span className="dark:text-white">
              {t("lockdown.disable.confirmUnderstanding")}
            </span>
          </Checkbox>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={!canSubmit}>
              {t("lockdown.disable.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
