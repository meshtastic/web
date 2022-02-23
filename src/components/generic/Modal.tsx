import type React from 'react';

import { m } from 'framer-motion';
import { FiX } from 'react-icons/fi';

import { useAppSelector } from '@hooks/useAppSelector';

import { IconButton } from './button/IconButton';
import { Card } from './Card';

export interface ModalProps {
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal = ({
  title,
  onClose,
  actions,
  children,
}: ModalProps): JSX.Element => {
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <m.div className={`fixed inset-0 z-30 ${darkMode ? 'dark' : ''}`}>
      <m.div
        className="fixed h-full w-full backdrop-blur-sm backdrop-filter"
        onClick={onClose}
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
            title={title}
            actions={
              <>
                {actions}
                <IconButton tooltip="Close" icon={<FiX />} onClick={onClose} />
              </>
            }
            className="relative flex-col gap-4 "
          >
            {children}
          </Card>
        </div>
      </m.div>
    </m.div>
  );
};
