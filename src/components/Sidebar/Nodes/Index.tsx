import React from 'react';

import { useTranslation } from 'react-i18next';

import { UsersIcon } from '@heroicons/react/outline';

import { Dropdown } from '../../basic/Dropdown';
import { NodeList } from './NodeList';

export const Nodes = (): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Dropdown
      icon={<UsersIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />}
      title={t('strings.nodes')}
      content={<NodeList />}
      fallbackMessage={t('placeholder.no_messages')}
    />
  );
};
