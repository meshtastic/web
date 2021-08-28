import React from 'react';

export interface PrimaryTemplateProps {
  children: React.ReactNode;
  title: string;
  tagline: string;
  button?: JSX.Element;
  footer?: JSX.Element;
}

export const PrimaryTemplate = ({
  children,
  title,
  tagline,
  button,
  footer,
}: PrimaryTemplateProps): JSX.Element => {
  return (
    <div className="flex flex-col flex-auto h-full min-w-0">
      <div className="flex p-4 bg-white border-b md:flex-row flex-0 md:items-center md:justify-between md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
        {button && <div className="pr-2 m-auto md:hidden">{button}</div>}
        <div className="flex-1 min-w-0">
          <a className="whitespace-nowrap font-medium text-primary">
            {tagline}
          </a>
          <h2 className="text-3xl font-extrabold leading-7 tracking-tight truncate md:text-4xl md:leading-10 dark:text-white">
            {title}
          </h2>
        </div>
      </div>
      <div className="flex-auto flex-grow p-6 overflow-y-auto bg-white md:p-10 dark:bg-secondaryDark">
        {children}
      </div>
      {footer && (
        <div className="flex p-4 bg-white border-t md:flex-row flex-0 md:items-center md:justify-between md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
          {button && <div className="pr-2 m-auto md:hidden">{button}</div>}
          <div className="flex-1 min-w-0">{footer}</div>
        </div>
      )}
    </div>
  );
};
