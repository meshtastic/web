import React from 'react';

export const Logo = (): JSX.Element => {
  return (
    <>
      <img title="Logo" className="w-16 dark:hidden" src="/Logo_Black.svg" />
      <img
        title="Logo"
        className="hidden w-16 dark:flex"
        src="/Logo_White.svg"
      />
    </>
  );
};
