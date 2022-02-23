import type React from 'react';

import { m } from 'framer-motion';

import { Tooltip } from '@components/generic/Tooltip';

type DefaulButtonProps = JSX.IntrinsicElements['button'];

export interface IconButtonProps extends DefaulButtonProps {
  icon: React.ReactNode;
  tooltip?: string;
  nested?: boolean;
  active?: boolean;
}

export const IconButton = ({
  icon,
  tooltip,
  nested,
  active,
  disabled,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <Tooltip disabled={!tooltip} content={tooltip}>
      <m.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        className="my-auto text-gray-500 dark:text-gray-400"
      >
        <button
          type="button"
          disabled={disabled}
          className={`rounded-md p-2 hover:bg-gray-200 ${
            active ? 'bg-gray-200 dark:bg-secondaryDark' : ''
          } ${
            nested ? 'dark:hover:bg-primaryDark' : 'dark:hover:bg-secondaryDark'
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
      </m.div>
    </Tooltip>
  );
};
