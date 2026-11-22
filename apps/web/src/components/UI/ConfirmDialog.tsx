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
import { Input } from "@components/UI/Input.tsx";
import { type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Label of the confirming button, e.g. "Erase everything". */
  confirmLabel: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** `danger` colours the confirm button red. */
  tone?: "default" | "danger";
  /**
   * Extra step for irreversible actions: the confirm button stays disabled
   * until this exact text is typed.
   */
  requireText?: string;
  /** Disables the buttons while the action runs. */
  pending?: boolean;
  onConfirm: () => void;
  /** Extra content between the description and the buttons. */
  children?: ReactNode;
}

type ConfirmDialogBodyProps = Omit<ConfirmDialogProps, "open">;

/**
 * Lives inside DialogContent, which unmounts on close, so typed
 * confirmation text never survives into the next opening.
 */
const ConfirmDialogBody = ({
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  requireText,
  pending = false,
  onConfirm,
  children,
}: ConfirmDialogBodyProps) => {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const textMatches = requireText === undefined || typed === requireText;

  return (
    <>
      <DialogClose />
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
      {requireText !== undefined ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-help font-medium">
            {t("primitives.typeToConfirm", { ns: "ui", text: requireText })}
          </label>
          <Input
            id={inputId}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      ) : null}
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel ?? t("button.cancel")}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          disabled={pending || !textMatches}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
};

/** Confirmation step for destructive or consequential actions. */
export const ConfirmDialog = ({ open, ...props }: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={props.onOpenChange}>
    <DialogContent>
      <ConfirmDialogBody {...props} />
    </DialogContent>
  </Dialog>
);
