import React from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@components/generic/Button';
import { Input } from '@components/generic/Input';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { MenuIcon, SaveIcon } from '@heroicons/react/outline';

export interface RadioProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Radio = ({ navOpen, setNavOpen }: RadioProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <PrimaryTemplate
      title="Radio"
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
      <div className="w-full max-w-3xl space-y-2 md:max-w-xl">
        <Input label="test" />
      </div>
    </PrimaryTemplate>
  );
};
