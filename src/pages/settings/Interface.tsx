import React from 'react';

import { Jp, Pt, Us } from 'react-flags-select';
import { useTranslation } from 'react-i18next';

import { Card } from '@app/components/generic/Card';
import { Select } from '@app/components/generic/Select';
import i18n from '@app/core/translation';
import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { MenuIcon, SaveIcon } from '@heroicons/react/outline';

export interface InterfaceProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Interface = ({
  navOpen,
  setNavOpen,
}: InterfaceProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <PrimaryTemplate
      title="Interface"
      tagline="Settings"
      button={
        <Button
          icon={<MenuIcon className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
          circle
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<SaveIcon className="w-5 h-5" />}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <Card
        title="Basic settings"
        description="Device name and user parameters"
      >
        <div className="w-full max-w-3xl space-y-2 md:max-w-xl p-10">
          <Select
            label="Language"
            active={
              i18n.language === 'en'
                ? {
                    name: 'English',
                    value: 'en',
                    icon: <Us />,
                  }
                : i18n.language === 'pt'
                ? { name: 'Português', value: 'pt', icon: <Pt /> }
                : i18n.language === 'jp'
                ? { name: '日本', value: 'jp', icon: <Jp /> }
                : { name: 'English', value: 'en', icon: <Us /> }
            }
            onChange={(value): void => {
              void i18n.changeLanguage(value);
            }}
            id="aaa"
            options={[
              {
                name: 'English',
                value: 'en',
                icon: <Us className="w-6" />,
              },
              {
                name: 'Português',
                value: 'pt',
                icon: <Pt className="w-6" />,
              },
              {
                name: '日本',
                value: 'jp',
                icon: <Jp className="w-6" />,
              },
            ]}
          />
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
