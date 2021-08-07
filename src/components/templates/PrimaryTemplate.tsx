import React from 'react';

export interface PrimaryTemplateProps {
  children: React.ReactNode;
  title: string;
  tagline: string;
}

export const PrimaryTemplate = ({
  children,
  title,
  tagline,
}: PrimaryTemplateProps): JSX.Element => {
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <div className="flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between p-6 sm:py-8 sm:px-10 border-b dark:border-gray-600  bg-white dark:bg-secondaryDark">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center font-medium">
            <div>
              <a className="whitespace-nowrap text-primary">{tagline}</a>
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-7 sm:leading-10 truncate dark:text-white">
              {title}
            </h2>
          </div>
        </div>
      </div>
      <div className="flex-auto p-6 sm:p-10 ">
        <div className="max-w-3xl">
          <div className="max-w-3xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
