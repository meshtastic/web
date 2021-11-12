import type React from 'react';

import { FiSave, FiXCircle } from 'react-icons/fi';

import { IconButton } from './generic/IconButton';

export interface FormFooterProps {
  dirty: boolean;
  clearAction: () => void;
  saveAction: () => void;
}

export const FormFooter = ({
  dirty,
  clearAction,
  saveAction,
}: FormFooterProps): JSX.Element => {
  return (
    <div className="flex float-right gap-2">
      <IconButton
        icon={<FiXCircle className="w-5 h-5" />}
        disabled={!dirty}
        onClick={(): void => {
          clearAction();
        }}
      />
      <IconButton
        disabled={!dirty}
        onClick={(): void => {
          saveAction();
        }}
        icon={<FiSave className="w-5 h-5" />}
      />
    </div>
  );
};
