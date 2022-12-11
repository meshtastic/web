import type React from "react";

import { IconButton } from "@components/form/IconButton.js";
import { Dialog as DialogUI } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export interface DialogProps {
  title: string;
  description: string;
  isOpen: boolean;
  close: () => void;
  children: React.ReactNode;
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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogUI.Panel>
          <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
            <div className="flex px-4 py-5 sm:px-6">
              <div>
                <h1 className="text-lg font-bold">{title}</h1>
                <h5 className="text-sm text-slate-600">{description}</h5>
              </div>
              <IconButton
                onClick={close}
                className="my-auto ml-auto"
                size="sm"
                variant="secondary"
                icon={<XMarkIcon className="h-4" />}
              />
            </div>

            <div className="p-4">{children}</div>
          </div>
        </DialogUI.Panel>
      </div>
    </DialogUI>
  );
};
