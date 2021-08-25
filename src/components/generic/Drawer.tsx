import React from 'react';

import { Blur } from '@components/generic/Blur';

type DefaultAsideProps = JSX.IntrinsicElements['aside'];

interface DrawerProps extends DefaultAsideProps {
  open: boolean;
  permenant?: boolean;
  onClose: () => void;
}

export const Drawer = ({
  open,
  permenant,
  onClose,
  className,
  children,

  ...props
}: DrawerProps): JSX.Element => {
  return (
    <>
      {open && (
        <Blur className={className} disableOnMd={true} onClick={onClose} />
      )}

      <aside
        className={`transform top-0 left-0 bg-white dark:bg-secondaryDark shadow-md max-w-xs w-full border-r dark:border-gray-600 h-full overflow-auto ease-in-out transition-all duration-300 z-30 ${
          permenant ? '' : 'absolute'
        } ${open ? 'translate-x-0' : '-translate-x-full'} ${className}`}
        {...props}
      >
        {children}
      </aside>
    </>
  );
};
