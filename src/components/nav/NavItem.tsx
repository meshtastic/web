import React from 'react';

interface NavItemProps {
  icon: JSX.Element;
  text: string;
}

export const NavItem = ({ icon, text }: NavItemProps) => {
  return (
    <div className="flex h-12 items-center hover:bg-gray-100 rounded-md cursor-pointer px-3 select-none">
      {icon}
      <span className="">{text}</span>
    </div>
  );
};
