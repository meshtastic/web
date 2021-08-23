import React from 'react';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface BlurProps extends DefaultDivProps {
  disableOnMd?: boolean;
}

export const Blur = ({
  disableOnMd,
  className,
  onClick,
  ...props
}: BlurProps): JSX.Element => {
  return (
    <div
      className={`absolute inset-0 z-10 w-full h-full transition-opacity ${
        disableOnMd ? 'md:hidden' : 'test'
      } ${className}`}
      {...props}
    >
      <div
        onClick={onClick}
        className={`absolute inset-0 w-full h-full backdrop-filter backdrop-blur-sm ${
          disableOnMd ? 'md:hidden' : 'test'
        }`}
        tabIndex={0}
      ></div>
    </div>
  );
};
