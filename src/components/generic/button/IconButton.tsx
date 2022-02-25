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
  className,
  ...props
}: IconButtonProps): JSX.Element => {
  return (
    <Tooltip disabled={!tooltip} content={tooltip}>
      <button
        type="button"
        disabled={disabled}
        className={`rounded-md p-2 hover:bg-gray-300 ${
          active ? 'bg-gray-300 dark:bg-secondaryDark' : ''
        } ${
          nested ? 'dark:hover:bg-primaryDark' : 'dark:hover:bg-secondaryDark'
        } ${
          disabled ? 'cursor-not-allowed text-gray-400 dark:text-gray-700' : ''
        } ${className ?? ''}`}
        {...props}
      >
        <m.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.95 }}
          className="my-auto text-gray-600 dark:text-gray-400"
        >
          {icon}
        </m.div>
        <span className="sr-only">Refresh</span>
      </button>
    </Tooltip>
  );
};
