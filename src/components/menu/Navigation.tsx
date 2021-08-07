import React from 'react';

import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';

import { routes } from '../../router';
import { MenuButton } from './MenuButton';

export const Navigation = (): JSX.Element => {
  return (
    <div className="hidden md:flex flex-auto flex-0 relative items-center h-16 px-4 ">
      <div className="flex items-center">
        <MenuButton
          icon={<AnnotationIcon />}
          text={'Messages'}
          link={routes.messages().link}
        />
        <MenuButton
          icon={<ViewGridIcon />}
          text={'Nodes'}
          link={routes.nodes().link}
        />
        <MenuButton
          icon={<CogIcon />}
          text={'Settings'}
          link={routes.settings().link}
        />
        <MenuButton
          icon={<InformationCircleIcon />}
          text={'About'}
          link={routes.about().link}
        />
      </div>
    </div>
  );
};
