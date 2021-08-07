import React from 'react';

export const Logo = (): JSX.Element => {
  return (
    <div className="hidden md:flex">
      <img className="w-16 dark:hidden" src="Mesh_Logo_Black.svg" />
      <img className="hidden dark:flex w-16" src="Mesh_Logo_White.svg" />
    </div>
  );
};
