import React from 'react';

import { useTranslation } from 'react-i18next';

import { AdjustmentsIcon } from '@heroicons/react/outline';

import { Dropdown } from '../../basic/Dropdown';
import { Settings } from './Settings';

export const Device = (): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Dropdown
      icon={<AdjustmentsIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />}
      title={t('settings.device')}
      content={<Settings />}
      fallbackMessage={'Loading...'}
    />
  );
};
