import React from 'react';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface LocalSidebarItemProps {
  title: string;
  description: string;
  selected: boolean;
  icon: JSX.Element;
}

export type SidebarItemProps = LocalSidebarItemProps & DefaultDivProps;

export const SidebarItem = ({
  title,
  description,
  selected,
  icon,
}: SidebarItemProps): JSX.Element => {
  return (
    <div
      className={`flex p-5 cursor-pointer select-none dark:hover:bg-primaryDark ${
        selected ? 'bg-gray-200 dark:bg-primaryDark' : 'dark:bg-secondaryDark'
      }`}
    >
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <div className="ml-3 text-left">
        <div className="font-medium text-left">{title}</div>
        <div className="mt-0.5 text-gray-400 text-sm">{description}</div>
      </div>
    </div>
  );
};
