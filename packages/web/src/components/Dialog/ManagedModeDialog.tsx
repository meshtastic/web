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
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export interface ManagedModeDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSubmit: () => void;
}

export const ManagedModeDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: ManagedModeDialogProps) => {
  const { t } = useTranslation("dialog");
  const [confirmState, setConfirmState] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("managedMode.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="managedMode.description"
              components={{
                bold: <p className="font-bold inline" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={confirmState}
            onChange={() => setConfirmState(!confirmState)}
            name="confirmUnderstanding"
          >
            <p className="dark:text-white pt-1">
              {t("managedMode.confirmUnderstanding")}
            </p>
          </Checkbox>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            name="regenerate"
            disabled={!confirmState}
            onClick={() => {
              setConfirmState(false);
              onSubmit();
            }}
          >
            {t("button.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
