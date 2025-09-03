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
import { Separator } from "@components/UI/Separator.tsx";
import { useTranslation } from "react-i18next";
import { type DialogConfig, getDefaultTexts } from "./useDialog.ts";

export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DialogConfig;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const BaseDialog = ({
  open,
  onOpenChange,
  config,
  onConfirm,
  onCancel,
}: BaseDialogProps) => {
  const { t } = useTranslation("dialog");
  const defaultTexts = getDefaultTexts(config.type, t);

  const handleClose = () => {
    config.onClose?.();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    } else if (config.onConfirm) {
      await config.onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (config.onCancel) {
      config.onCancel();
    }
    handleClose();
  };

  const renderFooter = () => {
    switch (config.type) {
      case "confirm": {
        const confirmText = config.confirmText || defaultTexts.confirmText;
        const cancelText = config.cancelText || defaultTexts.cancelText;
        const variant = config.variant || "default";

        return (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancel} name="cancel">
              {cancelText}
            </Button>
            <Button variant={variant} onClick={handleConfirm} name="confirm">
              {config.confirmIcon && (
                <span className="mr-2">{config.confirmIcon}</span>
              )}
              {confirmText}
            </Button>
          </DialogFooter>
        );
      }
      case "alert":
      case "info": {
        const dismissText = config.dismissText || defaultTexts.dismissText;

        return (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose} name="dismiss">
              {dismissText}
            </Button>
          </DialogFooter>
        );
      }
      case "custom": {
        return config.footerActions ? (
          <DialogFooter className="mt-4">{config.footerActions}</DialogFooter>
        ) : null;
      }
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (config.type === "custom") {
      return config.content;
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon && config.icon}
            {config.title}
          </DialogTitle>
          {config.description && (
            <DialogDescription>{config.description}</DialogDescription>
          )}
        </DialogHeader>
        <Separator />
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};
