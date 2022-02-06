import type React from 'react';

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
      className={`absolute inset-0 z-20 h-full w-full transition-opacity ${
        disableOnMd ? 'md:hidden' : ''
      } ${className}`}
      {...props}
    >
      <div
        onClick={onClick}
        className={`absolute inset-0 h-full w-full backdrop-blur-sm backdrop-filter ${
          disableOnMd ? 'md:hidden' : ''
        }`}
        tabIndex={0}
      ></div>
    </div>
  );
};
