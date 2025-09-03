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
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type DialogVariant = "default" | "destructive";
export type DialogType = "confirm" | "alert" | "info" | "custom";

export interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  type?: DialogType;
  icon?: ReactNode;
  children?: ReactNode;

  showFooter?: boolean;
  confirmText?: string;
  cancelText?: string;
  dismissText?: string;
  variant?: DialogVariant;
  confirmIcon?: ReactNode;
  customFooter?: ReactNode;

  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onDismiss?: () => void;
}

export const DialogWrapper = ({
  open,
  onOpenChange,
  title,
  description,
  type = "custom",
  icon,
  children,
  showFooter = true,
  confirmText,
  cancelText,
  dismissText,
  variant = "default",
  confirmIcon,
  customFooter,
  onConfirm,
  onCancel,
  onDismiss,
}: DialogWrapperProps) => {
  const { t } = useTranslation("dialog");

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    handleClose();
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    handleClose();
  };

  const renderFooter = () => {
    if (!showFooter) {
      return null;
    }

    if (customFooter) {
      return <DialogFooter className="mt-4">{customFooter}</DialogFooter>;
    }

    switch (type) {
      case "confirm":
        return (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancel} name="cancel">
              {cancelText || t("button.cancel")}
            </Button>
            <Button variant={variant} onClick={handleConfirm} name="confirm">
              {confirmIcon && <span className="mr-2">{confirmIcon}</span>}
              {confirmText || t("button.confirm")}
            </Button>
          </DialogFooter>
        );

      case "alert":
      case "info":
        return (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleDismiss} name="dismiss">
              {dismissText || t("button.dismiss")}
            </Button>
          </DialogFooter>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon && icon}
            {title}
          </DialogTitle>
          {type !== "custom" && <Separator />}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};
