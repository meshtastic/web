import React from 'react';

import { FiCheck } from 'react-icons/fi';

type DefaulButtonProps = JSX.IntrinsicElements['button'];

export interface IconButtonProps extends DefaulButtonProps {
  icon: React.ReactNode;
  confirmAction?: () => void;
}

export const IconButton = ({
  icon,
  confirmAction,
  ...props
}: IconButtonProps): JSX.Element => {
  const [hasConfirmed, setHasConfirmed] = React.useState(false);

  const handleConfirm = (): void => {
    if (confirmAction) {
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
    <div
      className="my-auto text-gray-500 dark:text-gray-400"
      onClick={handleConfirm}
    >
      <button
        type="button"
        className={`p-2 rounded-md active:scale-95 ${
          hasConfirmed
            ? 'bg-red-500'
            : 'hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        {...props}
      >
        {hasConfirmed ? <FiCheck /> : icon}
        <span className="sr-only">Refresh</span>
      </button>
    </div>
  );
};
