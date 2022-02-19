import type React from 'react';

import { m } from 'framer-motion';

import { Tooltip } from '@components/generic/Tooltip';

export interface BottomNavItemProps {
  tooltip?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const BottomNavItem = ({
  tooltip,
  onClick,
  className,
  children,
}: BottomNavItemProps) => {
  return (
    <Tooltip disabled={!tooltip} content={tooltip}>
      <div
        onClick={onClick}
        className={`group flex h-full cursor-pointer select-none p-1 hover:bg-gray-200 dark:text-white dark:hover:bg-primaryDark ${className}`}
      >
        <m.div className="flex w-full gap-1" whileTap={{ scale: 0.99 }}>
          {children}
        </m.div>
      </div>
    </Tooltip>
  );
};
