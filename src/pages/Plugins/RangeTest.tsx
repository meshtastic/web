import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave } from 'react-icons/fi';

import { Card } from '@app/components/generic/Card';
import { Checkbox } from '@app/components/generic/form/Checkbox';
import { Input } from '@app/components/generic/form/Input.jsx';
import { IconButton } from '@app/components/generic/IconButton.jsx';
import { connection } from '@app/core/connection.js';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import type { RadioConfig_UserPreferences } from '@meshtastic/meshtasticjs/dist/generated';

export interface RangeTestProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RangeTest = ({
  navOpen,
  setNavOpen,
}: RangeTestProps): JSX.Element => {
  const { t } = useTranslation();
  const preferences = useAppSelector((state) => state.meshtastic.preferences);

  const { register, handleSubmit, formState } =
    useForm<RadioConfig_UserPreferences>({
      defaultValues: {
        rangeTestPluginEnabled: preferences.rangeTestPluginEnabled,
        rangeTestPluginSave: preferences.rangeTestPluginSave,
        rangeTestPluginSender: preferences.rangeTestPluginSender,
      },
    });

  const onSubmit = handleSubmit((data) => {
    console.log(data);

    void connection.setPreferences(data);
  });

  return (
    <PrimaryTemplate
      title="Range Test"
      tagline="Plugin"
      button={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
          disabled={!formState.isDirty}
          onClick={onSubmit}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <div className="w-full space-y-4">
        <Card title="Range Test" description="Settings">
          <div className="w-full max-w-3xl p-10 md:max-w-xl">
            <form onSubmit={onSubmit}>
              <Checkbox
                label="Range Test Plugin Enabled?"
                {...register('rangeTestPluginEnabled')}
              />
              <Checkbox
                label="Range Test Plugin Save?"
                {...register('rangeTestPluginSave')}
              />
              <Input
                type="number"
                label="Message Interval"
                {...register('rangeTestPluginSender', {
                  valueAsNumber: true,
                })}
              />
            </form>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
