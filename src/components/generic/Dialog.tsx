import { IconButton } from "@components/form/IconButton.js";
import { Dialog as DialogUI } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ThemeController } from "@components/generic/ThemeController.js";
import { Blur } from "@components/generic/Blur.js";
import type { ReactNode } from "react";

export interface DialogProps {
  title: string;
  description: string;
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
}

export const Dialog = ({
  title,
  description,
  isOpen,
  close,
  children
}: DialogProps): JSX.Element => {
  return (
    <DialogUI open={isOpen} onClose={close}>
      <ThemeController>
        <Blur />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogUI.Panel>
            <div className="flex bg-backgroundPrimary px-4 py-5 sm:px-6">
              <div>
                <h1 className="text-lg font-bold text-textPrimary">{title}</h1>
                <h5 className="text-sm text-textSecondary">{description}</h5>
              </div>
              <IconButton
                onClick={close}
                className="my-auto ml-auto"
                size="sm"
                icon={<XMarkIcon className="h-4" />}
              />
            </div>

            <div className="bg-backgroundSecondary p-4">{children}</div>
          </DialogUI.Panel>
        </div>
      </ThemeController>
    </DialogUI>
  );
};
