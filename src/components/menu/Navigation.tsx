import type React from 'react';

import { FiGrid, FiMessageSquare, FiPackage, FiSettings } from 'react-icons/fi';
import type { Link } from 'type-route';

import { routes, useRoute } from '@core/router';

type DefaultDivProps = JSX.IntrinsicElements['div'];

export type NavigationProps = DefaultDivProps;

export const Navigation = ({
  onClick,
  className,
  ...props
}: NavigationProps): JSX.Element => {
  const route = useRoute();

  return (
    <div className="flex h-full mt-2 border-t border-l border-r border-gray-300 rounded-t dark:text-white dark:border-gray-600">
      <NavLink
        name="Messages"
        icon={
          <FiMessageSquare className="w-5 h-5 my-auto group-active:scale-90" />
        }
        active={route.name === 'messages'}
        link={routes.messages().link}
      />

      <NavLink
        name="Nodes"
        icon={<FiGrid className="w-5 h-5 my-auto group-active:scale-90" />}
        active={route.name === 'nodes'}
        link={routes.nodes().link}
      />

      <NavLink
        name="Plugins"
        icon={<FiPackage className="w-5 h-5 my-auto group-active:scale-90" />}
        active={route.name === 'plugins'}
        link={routes.plugins().link}
      />

      <NavLink
        name="Settings"
        icon={<FiSettings className="w-5 h-5 my-auto group-active:scale-90" />}
        active={route.name === 'settings'}
        link={routes.settings().link}
      />
    </div>
  );
};

interface NavLinkProps {
  name: string;
  icon: JSX.Element;
  active: boolean;
  link: Link;
}

const NavLink = ({ name, icon, active, link }: NavLinkProps): JSX.Element => {
  return (
    <a
      className={`flex h-full gap-1 p-2 cursor-pointer group hover:bg-gray-200 dark:hover:bg-primaryDark ${
        active ? 'dark:bg-primaryDark bg-gray-200' : 'bg-transparent'
      }`}
      {...link}
    >
      {icon}
      <div className="hidden my-auto md:flex">{name}</div>
    </a>
  );
};
