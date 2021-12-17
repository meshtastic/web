import type React from 'react';

import { FiGrid, FiMessageSquare, FiPackage, FiSettings } from 'react-icons/fi';

import { Button } from '@components/generic/Button';
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
    <div
      className={`px-4 md:space-x-2 space-y-2 md:space-y-0 ${className}`}
      {...props}
    >
      <div onClick={onClick}>
        <Button
          icon={<FiMessageSquare className="w-5 h-5" />}
          active={route.name === 'messages'}
          className="w-full md:w-auto"
          {...routes.messages().link}
        >
          Messages
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<FiGrid className="w-5 h-5" />}
          className="w-full md:w-auto"
          active={route.name === 'nodes'}
          {...routes.nodes().link}
        >
          Nodes
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<FiPackage className="w-5 h-5" />}
          className="w-full md:w-auto"
          active={route.name === 'plugins'}
          {...routes.plugins().link}
        >
          Plugins
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<FiSettings className="w-5 h-5" />}
          className="w-full md:w-auto"
          active={route.name === 'settings'}
          {...routes.settings().link}
        >
          Settings
        </Button>
      </div>
    </div>
  );
};
