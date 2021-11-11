import React from 'react';

type DefaulButtonProps = JSX.IntrinsicElements['button'];

export interface IconButtonProps extends DefaulButtonProps {
  icon: React.ReactNode;
}

export const IconButton = ({
  icon,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <div className="my-auto text-gray-500 dark:text-gray-400">
      <button
        type="button"
        className="p-2 transition duration-200 ease-in-out rounded-md active:scale-95 hover:bg-gray-200 dark:hover:bg-gray-600"
        {...props}
      >
        {icon}
        <span className="sr-only">Refresh</span>
      </button>
    </div>
  );
};
