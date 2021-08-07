import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  clickAction?: () => void;
  type?: 'button' | 'submit' | 'reset' | undefined;
}

export const Button = ({
  children,
  className,
  clickAction,
  type,
}: ButtonProps): JSX.Element => {
  return (
    <button
      className={`w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-800 hover:shadow-inner text-gray-500 dark:text-gray-400 ${
        className ?? ''
      }`}
      onClick={() => {
        if (clickAction) {
          clickAction();
        }
      }}
      type={type}
    >
      <span className="flex justify-center">{children}</span>
    </button>
  );
};
