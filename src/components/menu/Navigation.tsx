import React from 'react';

import { Button } from '@components/generic/Button';
import { routes, useRoute } from '@core/router';
import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';

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
      className={`h-16 px-4 md:space-x-2 space-y-2 md:space-y-0 ${className}`}
      {...props}
    >
      <div onClick={onClick}>
        <Button
          icon={<AnnotationIcon className="w-6 h-6" />}
          active={route.name === 'messages'}
          className="w-full md:w-auto"
          {...routes.messages().link}
        >
          Messages
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<ViewGridIcon className="w-6 h-6" />}
          className="w-full md:w-auto"
          active={route.name === 'nodes'}
          {...routes.nodes().link}
        >
          Nodes
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<CogIcon className="w-6 h-6" />}
          className="w-full md:w-auto"
          active={route.name === 'settings'}
          {...routes.settings().link}
        >
          Settings
        </Button>
      </div>
      <div onClick={onClick}>
        <Button
          icon={<InformationCircleIcon className="w-6 h-6" />}
          className="w-full md:w-auto"
          active={route.name === 'about'}
          {...routes.about().link}
        >
          About
        </Button>
      </div>
    </div>
  );
};
