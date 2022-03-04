import type React from 'react';

import { FiSave } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';
import { Loading } from '@components/generic/Loading';

export interface FormProps {
  submit: () => Promise<void>;
  loading: boolean;
  dirty: boolean;
  children: React.ReactNode;
}

export const Form = ({
  submit,
  loading,
  dirty,
  children,
}: FormProps): JSX.Element => {
  return (
    <form
      onSubmit={(e): void => {
        e.preventDefault();
      }}
    >
      {loading && <Loading />}
      {children}
      <div className="flex w-full bg-white dark:bg-secondaryDark">
        <div className="ml-auto p-2">
          <IconButton disabled={dirty} onClick={submit} icon={<FiSave />} />
        </div>
      </div>
    </form>
  );
};
