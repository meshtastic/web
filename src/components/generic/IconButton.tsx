import React from 'react';

import MaterialIconButton from '@material-ui/core/IconButton';
import type { IconButtonProps } from '@material-ui/core/IconButton/IconButton';

export const IconButton = ({
  children,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <MaterialIconButton {...props} className="text-gray-500 dark:text-gray-400">
      {children}
    </MaterialIconButton>
  );
};
