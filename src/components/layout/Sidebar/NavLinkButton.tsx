import type React from 'react';

import { m } from 'framer-motion';
import type { Link } from 'type-route';

export interface NavLinkButtonProps {
  link?: Link;
  active?: boolean;
  action?: () => void;
  children: React.ReactNode;
}

export const NavLinkButton = ({
  link,
  active,
  action,
  children,
}: NavLinkButtonProps): JSX.Element => {
  return (
    <m.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      animate={active ? 'selected' : 'deselected'}
      initial={{ borderColor: '#1C1D23' }}
      variants={{
        selected: { borderColor: '#67ea94' },
        deselected: { borderColor: '#1C1D23' },
      }}
      className="cursor-pointer rounded-full border-2 p-3 hover:bg-opacity-80 hover:shadow-md dark:bg-secondaryDark dark:text-white"
      onClick={(): void => {
        action && action();
      }}
      {...(link && link)}
    >
      {children}
    </m.div>
  );
};
