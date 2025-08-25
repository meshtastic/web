import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useMessages, useNodeDB } from "@core/stores";
import { LockKeyholeOpenIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

export interface RefreshKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshKeysDialog = ({
  open,
  onOpenChange,
}: RefreshKeysDialogProps) => {
  const { t } = useTranslation("dialog");
  const { activeChat } = useMessages();
  const { nodeErrors, getNode } = useNodeDB();

  const { handleCloseDialog, handleNodeRemove } = useRefreshKeysDialog();

  const nodeErrorNum = nodeErrors.get(activeChat);

  if (!nodeErrorNum) {
    return null;
  }

  const nodeWithError = getNode(nodeErrorNum.node);

  const text = {
    title: t("refreshKeys.title", {
      interpolation: { escapeValue: false },
      identifier: nodeWithError?.user?.longName ?? "",
    }),
    description: `${t("refreshKeys.description.unableToSendDmPrefix")}${
      nodeWithError?.user?.longName ?? ""
    } (${nodeWithError?.user?.shortName ?? ""})${t(
      "refreshKeys.description.keyMismatchReasonSuffix",
    )}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-8 flex flex-col gap-2"
        aria-describedby={undefined}
      >
        <DialogClose onClick={handleCloseDialog} />
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
        </DialogHeader>
        {text.description}
        <ul className="mt-2">
          <li className="flex place-items-center gap-2 items-start">
            <div className="p-2 bg-slate-500 rounded-lg mt-1">
              <LockKeyholeOpenIcon
                size={30}
                className="text-white justify-center"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-bold mb-0.5">
                  {t("refreshKeys.label.acceptNewKeys")}
                </p>
                <p>{t("refreshKeys.description.acceptNewKeys")}</p>
              </div>
              <Button
                variant="default"
                name="requestNewKeys"
                onClick={handleNodeRemove}
              >
                {t("button.requestNewKeys")}
              </Button>
              <Button
                variant="outline"
                name="dismiss"
                onClick={handleCloseDialog}
              >
                {t("button.dismiss")}
              </Button>
            </div>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
};
