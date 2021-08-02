import React from 'react';

import { useTranslation } from 'react-i18next';

import { CogIcon } from '@heroicons/react/outline';

import { Dropdown } from '../../basic/Dropdown';
import { Translations } from './Translations';

export const UI = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Dropdown
      icon={<CogIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />}
      title={t('settings.ui')}
      content={<Translations />}
      fallbackMessage={'Loading...'}
    />
  );
};
