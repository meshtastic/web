import type React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiX } from 'react-icons/fi';

import { useAppSelector } from '@hooks/useAppSelector';

import { IconButton } from './button/IconButton';
import { Card, CardProps } from './Card';

export interface ModalProps extends CardProps {
  open: boolean;
  bgDismiss?: boolean;
  onClose: () => void;
}

export const Modal = ({
  open,
  bgDismiss,
  onClose,
  actions,
  ...props
}: ModalProps): JSX.Element => {
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className={`fixed inset-0  ${darkMode ? 'dark' : ''} ${
            open ? 'z-30' : 'z-0'
          }`}
        >
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed h-full w-full backdrop-blur-md backdrop-filter"
            onClick={(): void => {
              bgDismiss && onClose();
            }}
          />
          <m.div className="text-center ">
            <span
              className="inline-block h-screen align-middle "
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block w-full max-w-3xl align-middle">
              <Card
                border
                draggable
                actions={
                  <div className="flex gap-2">
                    {actions}
                    <IconButton
                      tooltip="Close"
                      icon={<FiX />}
                      onClick={onClose}
                    />
                  </div>
                }
                className="relative flex-col"
                {...props}
              />
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
