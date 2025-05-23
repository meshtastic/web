import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { LockKeyholeOpenIcon } from "lucide-react";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";

export interface RefreshKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshKeysDialog = (
  { open, onOpenChange }: RefreshKeysDialogProps,
) => {
  const { t } = useTranslation();
  const { activeChat } = useMessageStore();
  const { nodeErrors, getNode } = useDevice();
  const { handleCloseDialog, handleNodeRemove } = useRefreshKeysDialog();

  const nodeErrorNum = nodeErrors.get(activeChat);

  if (!nodeErrorNum) {
    return null;
  }

  const nodeWithError = getNode(nodeErrorNum.node);

  const text = {
    title: `${t("dialog_refreshKeys_titlePrefix")}${
      nodeWithError?.user?.longName ?? ""
    }`,
    description: `${t("dialog_refreshKeys_description_unableToSendDmPrefix")}${
      nodeWithError?.user?.longName ?? ""
    } (${nodeWithError?.user?.shortName ?? ""})${
      t("dialog_refreshKeys_description_keyMismatchReasonSuffix")
    }`,
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
                  {t("dialog_refreshKeys_label_acceptNewKeys")}
                </p>
                <p>
                  {t("dialog_refreshKeys_description_acceptNewKeys")}
                </p>
              </div>
              <Button
                variant="default"
                name="requestNewKeys"
                onClick={handleNodeRemove}
              >
                {t("dialog_button_requestNewKeys")}
              </Button>
              <Button
                variant="outline"
                name="dismiss"
                onClick={handleCloseDialog}
              >
                {t("dialog_button_dismiss")}
              </Button>
            </div>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
};
