import React from 'react';

import { FiCheck } from 'react-icons/fi';

type DefaultButtonProps = JSX.IntrinsicElements['button'];

interface ButtonProps extends DefaultButtonProps {
  icon?: JSX.Element;
  circle?: boolean;
  active?: boolean;
  border?: boolean;
  confirmAction?: () => void;
}

export const Button = ({
  icon,
  circle,
  className,
  active,
  border,
  confirmAction,
  disabled,
  children,
  ...props
}: ButtonProps): JSX.Element => {
  const [hasConfirmed, setHasConfirmed] = React.useState(false);

  const handleConfirm = (): void => {
    if (typeof confirmAction == 'function') {
      if (hasConfirmed) {
        void confirmAction();
      }
      setHasConfirmed(true);
      setTimeout(() => {
        setHasConfirmed(false);
      }, 3000);
    }
  };

  return (
    <button
      onClick={handleConfirm}
      className={`items-center  select-none flex dark:text-white active:scale-95 ${
        active && !disabled ? 'bg-gray-100 dark:bg-gray-700' : ''
      } ${
        circle ? 'rounded-full h-10 w-10' : 'rounded-md p-3 space-x-3 text-sm'
      } ${
        disabled
          ? 'cursor-not-allowed dark:bg-primaryDark bg-white'
          : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'
      } ${border ? 'border dark:border-gray-600' : ''} ${className}`}
      {...props}
    >
      {icon && (
        <div
          className={`text-gray-500 dark:text-gray-400 ${
            circle ? 'mx-auto' : ''
          }`}
        >
          {hasConfirmed ? <FiCheck /> : icon}
        </div>
      )}

      <span>{children}</span>
    </button>
  );
};
