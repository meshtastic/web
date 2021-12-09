import type React from 'react';

export interface PrimaryTemplateProps {
  children: React.ReactNode;
  title: string;
  tagline: string;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
  footer?: JSX.Element;
}

export const PrimaryTemplate = ({
  children,
  title,
  tagline,
  leftButton,
  rightButton,
  footer,
}: PrimaryTemplateProps): JSX.Element => {
  return (
    <div className="flex flex-col flex-auto h-full min-w-0">
      <div className="flex p-4 bg-white border-b border-gray-300 md:flex-row flex-0 md:items-center md:justify-between md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
        <div className="flex-1 min-w-0">
          <a className="font-medium whitespace-nowrap text-primary">
            {tagline}
          </a>
          <h2 className="text-3xl font-extrabold leading-7 tracking-tight truncate md:text-4xl md:leading-10 dark:text-white">
            {title}
          </h2>
        </div>
        {rightButton}
      </div>
      <div className="flex-auto flex-grow py-6 overflow-y-auto bg-white md:p-5 dark:bg-secondaryDark">
        {children}
      </div>
      {footer && (
        <div className="flex px-4 py-2 bg-white border-t border-gray-300 md:flex-row flex-0 md:items-center md:justify-between md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
          {leftButton && (
            <div className="pr-2 m-auto md:hidden">{leftButton}</div>
          )}
          <div className="flex-1 min-w-0">{footer}</div>
        </div>
      )}
    </div>
  );
};
