import type React from 'react';

import { ErrorBoundary } from 'react-error-boundary';

import { IconButton } from '@meshtastic/components';

import { ErrorFallback } from '../ErrorFallback';
import { Sidebar } from './Sidebar';

export interface LayoutProps {
  title: string;
  icon: React.ReactNode;
  sidebarContents: React.ReactNode;
  children: React.ReactNode;
}

export const Layout = ({
  title,
  icon,
  sidebarContents,
  children,
}: LayoutProps): JSX.Element => {
  return (
    <div className="flex w-full bg-gray-100 dark:bg-secondaryDark md:overflow-hidden md:shadow-xl">
      <Sidebar>
        <div className="flex gap-2 p-2 border-b border-gray-300 dark:border-gray-600">
          <IconButton icon={icon} />
          <div className="my-auto text-lg font-medium dark:text-white">
            {title}
          </div>
        </div>
        <div className="flex flex-col gap-2">{sidebarContents}</div>
      </Sidebar>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {children}
      </ErrorBoundary>
    </div>
  );
};
