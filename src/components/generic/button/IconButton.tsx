import type React from 'react';

type DefaulButtonProps = JSX.IntrinsicElements['button'];

export interface IconButtonProps extends DefaulButtonProps {
  icon: React.ReactNode;
  active?: boolean;
}

export const IconButton = ({
  icon,
  active,
  disabled,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <div className="my-auto text-gray-500 dark:text-gray-400">
      <button
        type="button"
        disabled={disabled}
        className={`rounded-md p-2 transition duration-200 ease-in-out active:scale-95 ${
          active
            ? 'bg-gray-200 dark:bg-gray-600'
            : 'hover:bg-gray-200 dark:hover:bg-gray-600'
        } ${
          disabled ? 'cursor-not-allowed text-gray-400 dark:text-gray-700' : ''
        }`}
        {...props}
      >
        {icon}
        <span className="sr-only">Refresh</span>
      </button>
    </div>
  );
};
