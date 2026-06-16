import { type ReactNode, useCallback, useState } from "react";
import type { useTranslation } from "react-i18next";

export type DialogType = "confirm" | "alert" | "info" | "custom";

export interface BaseDialogConfig {
  type: DialogType;
  title: string;
  description?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface ConfirmDialogConfig extends BaseDialogConfig {
  type: "confirm";
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  onConfirm: () => void | Promise<void>;
}

export interface AlertDialogConfig extends BaseDialogConfig {
  type: "alert";
  dismissText?: string;
  icon?: ReactNode;
}

export interface InfoDialogConfig extends BaseDialogConfig {
  type: "info";
  dismissText?: string;
  icon?: ReactNode;
}

export interface CustomDialogConfig extends BaseDialogConfig {
  type: "custom";
  icon?: React.ReactNode;
  content: ReactNode;
  footerActions?: ReactNode;
}

export type DialogConfig =
  | ConfirmDialogConfig
  | AlertDialogConfig
  | InfoDialogConfig
  | CustomDialogConfig;

export interface DialogState {
  isOpen: boolean;
  config?: DialogConfig;
}

export interface UseDialogReturn {
  isOpen: boolean;
  config?: DialogConfig;
  openDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useDialog = (initialState?: DialogState): UseDialogReturn => {
  const [state, setState] = useState<DialogState>(
    initialState ?? { isOpen: false },
  );

  const openDialog = useCallback((config: DialogConfig) => {
    setState({ isOpen: true, config });
  }, []);

  const closeDialog = useCallback(() => {
    state.config?.onClose?.();
    setState({ isOpen: false, config: undefined });
  }, [state.config]);

  const handleConfirm = useCallback(async () => {
    if (state.config?.onConfirm) {
      await state.config.onConfirm();
    }
    closeDialog();
  }, [state.config, closeDialog]);

  const handleCancel = useCallback(() => {
    state.config?.onCancel?.();
    closeDialog();
  }, [state.config, closeDialog]);

  return {
    isOpen: state.isOpen,
    config: state.config,
    openDialog,
    closeDialog,
    handleConfirm,
    handleCancel,
  };
};

export const getDefaultTexts = (
  type: DialogType,
  t: ReturnType<typeof useTranslation>["t"],
) => {
  switch (type) {
    case "confirm":
      return {
        confirmText: t("button.confirm"),
        cancelText: t("button.cancel"),
      };
    case "alert":
    case "info":
      return {
        dismissText: t("button.dismiss"),
      };
    default:
      return {};
  }
};
