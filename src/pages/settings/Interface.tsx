import type React from 'react';

import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave } from 'react-icons/fi';

import i18n from '@app/core/translation';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Select } from '@components/generic/form/Select';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';

export interface InterfaceProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
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
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
          circle
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
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
        <div className="w-full max-w-3xl p-10 space-y-2 md:max-w-xl">
          <Select
            label="Language"
            options={[
              {
                name: 'English',
                value: 'en',
              },
              {
                name: '日本',
                value: 'jp',
              },
              {
                name: 'Português',
                value: 'pt',
              },
            ]}
            onChange={(e): void => {
              void i18n.changeLanguage(e.target.value);
            }}
          />
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
