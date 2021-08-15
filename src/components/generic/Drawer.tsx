import React from 'react';

import { Blur } from '@components/generic/Blur';

type DefaultAsideProps = JSX.IntrinsicElements['aside'];

interface LocalDrawerProps {
  open: boolean;
  permenant?: boolean;
  onClose: () => void;
}
export type DrawerProps = LocalDrawerProps & DefaultAsideProps;

export const Drawer = ({
  open,
  permenant,
  onClose,
  children,
  ...props
}: DrawerProps): JSX.Element => {
  return (
    <>
      {open && <Blur disableOnMd={true} onClick={onClose} />}

      <aside
        className={`transform top-0 left-0 bg-white dark:bg-secondaryDark shadow-md max-w-xs w-full border-r dark:border-gray-600 h-full overflow-auto ease-in-out transition-all duration-300 z-30 ${
          permenant ? '' : 'absolute'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
        {...props}
      >
        {children}
      </aside>
    </>
  );
};
