import type React from 'react';

import { m } from 'framer-motion';

export interface CardProps {
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  border?: boolean;
}

export const Card = ({
  className,
  title,
  actions,
  border,
  children,
}: CardProps): JSX.Element => {
  return (
    <div
      className={`flex h-full w-full flex-col rounded-md drop-shadow-md ${
        border ? 'border border-gray-400 dark:border-gray-600' : ''
      } ${className ?? ''}`}
    >
      {(title || actions) && (
        <div className="w-full select-none justify-between rounded-t-md border-b border-gray-400 bg-gray-200 p-2 px-2 text-lg font-medium dark:border-gray-600 dark:bg-tertiaryDark dark:text-white">
          <div className="handle flex h-8 justify-between">
            <div className="my-auto ml-2 truncate">{title}</div>
            {actions}
          </div>
        </div>
      )}

      <m.div
        className={`flex flex-grow select-none flex-col gap-4 bg-white p-4 dark:bg-primaryDark  ${
          title || actions ? 'rounded-b-md' : 'rounded-md'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </m.div>
    </div>
  );
};
