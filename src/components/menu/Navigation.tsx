import React from 'react';

import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';

import { routes } from '../../core/router';
import { Button } from '../generic/Button';

export const Navigation = (): JSX.Element => {
  return (
    <div className="hidden md:flex flex-auto flex-0 relative items-center h-16 px-4 ">
      <div className="flex items-center">
        <Button
          icon={<AnnotationIcon />}
          text={'Messages'}
          {...routes.messages().link}
        />
        <Button
          icon={<ViewGridIcon />}
          text={'Nodes'}
          {...routes.nodes().link}
        />
        <Button
          icon={<CogIcon />}
          text={'Settings'}
          {...routes.settings().link}
        />
        <Button
          icon={<InformationCircleIcon />}
          text={'About'}
          {...routes.about().link}
        />
      </div>
    </div>
  );
};
