import React from 'react';

import { useTranslation } from 'react-i18next';

import { HashtagIcon } from '@heroicons/react/outline';

import { Dropdown } from '../../basic/Dropdown';
import { ChannelList } from './ChannelList';

export const Channels = (): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Dropdown
      icon={<HashtagIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />}
      title={t('settings.channel')}
      content={<ChannelList />}
      fallbackMessage={'Loading...'}
    />
  );
};
