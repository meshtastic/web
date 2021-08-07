import React from 'react';

import type { Link } from 'type-route';

interface MenuButtonProps {
  icon: JSX.Element;
  text: string;
  link: Link;
  clickAction?: () => void;
}

export const MenuButton = ({
  icon,
  text,
  link,
  clickAction,
}: MenuButtonProps): JSX.Element => {
  return (
    <div
      onClick={() => {
        if (clickAction) {
          clickAction();
        }
      }}
    >
      <a
        {...link}
        className="flex text-sm h-12 items-center dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer px-3 select-none"
      >
        {React.cloneElement(icon, {
          className: 'h-6 w-6 mr-3 text-gray-500 dark:text-gray-400',
        })}
        <span className="">{text}</span>
      </a>
    </div>
  );
};
