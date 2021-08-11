import React from 'react';

import MaterialButton from '@material-ui/core/Button';
import type { ButtonProps as MaterialButtonProps } from '@material-ui/core/Button/Button';

interface LocalButtonProps {
  text: string;
  icon?: JSX.Element;
}

export type ButtonProps = MaterialButtonProps & LocalButtonProps;

export const Button = ({ text, icon, ...props }: ButtonProps): JSX.Element => {
  return (
    <MaterialButton
      {...props}
      className="dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <div className="flex p-3">
        {icon &&
          React.cloneElement(icon, {
            className: 'h-6 w-6 mr-3 text-gray-500 dark:text-gray-400',
          })}
        <span>{text}</span>
      </div>
    </MaterialButton>
  );
};
