import type React from 'react';

import { m } from 'framer-motion';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card = ({ className, children }: CardProps): JSX.Element => {
  return (
    <m.div
      className={`flex select-none rounded-md bg-white p-4 shadow-md dark:bg-primaryDark ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </m.div>
  );
};
