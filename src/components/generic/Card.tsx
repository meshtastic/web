import React from 'react';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface CardProps extends DefaultDivProps {
  title: string;
  description: string;
  buttons?: JSX.Element;
  lgPlaceholder?: JSX.Element;
}

export const Card = ({
  title,
  description,
  buttons,
  children,
  className,
  lgPlaceholder,
  ...props
}: CardProps): JSX.Element => {
  return (
    <div
      className={`flex flex-col flex-auto text-white border shadow-md select-none dark:bg-primaryDark dark:border-transparent rounded-3xl  ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between mx-10 mt-10">
        <div className="flex flex-col">
          <div className="mr-4 text-2xl font-semibold leading-7 tracking-tight text-black md:text-3xl dark:text-white">
            {title}
          </div>
          <div className="font-medium text-gray-400">{description}</div>
        </div>
        {buttons}
      </div>
      <div className="flex">
        <div className={`${lgPlaceholder ? 'w-full xl:w-2/3' : 'w-full'}`}>
          {children}
        </div>
        {lgPlaceholder && (
          <div className="hidden w-1/3 xl:flex">{lgPlaceholder}</div>
        )}
      </div>
    </div>
  );
};
