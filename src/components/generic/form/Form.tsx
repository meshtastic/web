import type React from 'react';

import { Loading } from '@meshtastic/components';

export interface FormProps {
  loading?: boolean;
  children: React.ReactNode;
}

export const Form = ({ loading, children }: FormProps): JSX.Element => {
  return (
    <form
      onSubmit={(e): void => {
        e.preventDefault();
      }}
      className="relative flex-grow gap-3 p-2"
    >
      {loading && <Loading />}
      {children}
    </form>
  );
};
