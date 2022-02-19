import type React from 'react';

import { Tooltip } from '@components/generic/Tooltip';

type DefaulButtonProps = JSX.IntrinsicElements['button'];

export interface IconButtonProps extends DefaulButtonProps {
  icon: React.ReactNode;
  tooltip?: string;
  active?: boolean;
}

export const IconButton = ({
  icon,
  active,
  tooltip,
  disabled,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <Tooltip disabled={!tooltip} content={tooltip}>
      <div className="my-auto text-gray-500 dark:text-gray-400">
        <button
          type="button"
          disabled={disabled}
          className={`rounded-md p-2 transition duration-200 ease-in-out active:scale-95 ${
            active
              ? 'bg-gray-200 dark:bg-gray-600'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${
            disabled
              ? 'cursor-not-allowed text-gray-400 dark:text-gray-700'
              : ''
          }`}
          {...props}
        >
          {icon}
          <span className="sr-only">Refresh</span>
        </button>
      </div>
    </Tooltip>
  );
};
