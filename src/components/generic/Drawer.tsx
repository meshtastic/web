import React from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Drawer = ({
  open,
  onClose,
  children,
}: DrawerProps): JSX.Element => {
  return (
    <>
      {open && (
        <div
          className="z-10 fixed inset-0 transition-opacity"
          onClick={onClose}
        >
          <div
            className="absolute inset-0 backdrop-filter backdrop-blur"
            tabIndex={0}
          ></div>
        </div>
      )}

      <aside
        className={`transform top-0 left-0 w-64 bg-white dark:bg-secondaryDark shadow-md border-r dark:border-gray-600 fixed h-full overflow-auto ease-in-out transition-all duration-300 z-30 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </aside>
    </>
  );
};
