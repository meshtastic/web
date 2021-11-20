import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiMenu } from 'react-icons/fi';

import { FormFooter } from '@app/components/FormFooter';
import { useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import type { RadioConfig_UserPreferences } from '@meshtastic/meshtasticjs/dist/generated';

export interface ExternalNotificationProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ExternalNotification = ({
  navOpen,
  setNavOpen,
}: ExternalNotificationProps): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<RadioConfig_UserPreferences>({
      defaultValues: {
        extNotificationPluginActive: preferences.extNotificationPluginActive,
        extNotificationPluginAlertBell:
          preferences.extNotificationPluginAlertBell,
        extNotificationPluginAlertMessage:
          preferences.extNotificationPluginAlertMessage,
        extNotificationPluginEnabled: preferences.extNotificationPluginEnabled,
        extNotificationPluginOutput: preferences.extNotificationPluginOutput,
        extNotificationPluginOutputMs:
          preferences.extNotificationPluginOutputMs,
      },
    });

  React.useEffect(() => {
    reset({
      extNotificationPluginActive: preferences.extNotificationPluginActive,
      extNotificationPluginAlertBell:
        preferences.extNotificationPluginAlertBell,
      extNotificationPluginAlertMessage:
        preferences.extNotificationPluginAlertMessage,
      extNotificationPluginEnabled: preferences.extNotificationPluginEnabled,
      extNotificationPluginOutput: preferences.extNotificationPluginOutput,
      extNotificationPluginOutputMs: preferences.extNotificationPluginOutputMs,
    });
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    void connection.setPreferences(data);
  });

  const watchExternalNotificationPluginEnabled = useWatch({
    control,
    name: 'extNotificationPluginEnabled',
    defaultValue: false,
  });

  return (
    <PrimaryTemplate
      title="External Notification"
      tagline="Plugin"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      footer={
        <FormFooter
          dirty={formState.isDirty}
          saveAction={onSubmit}
          clearAction={reset}
        />
      }
    >
      <div className="w-full space-y-4">
        <Card>
          <div className="w-full max-w-3xl p-10 md:max-w-xl">
            <form onSubmit={onSubmit}>
              <Checkbox
                label="Plugin Enabled"
                {...register('extNotificationPluginEnabled')}
              />
              <Checkbox
                label="Active"
                disabled={!watchExternalNotificationPluginEnabled}
                {...register('extNotificationPluginActive')}
              />
              <Checkbox
                label="Bell"
                disabled={!watchExternalNotificationPluginEnabled}
                {...register('extNotificationPluginAlertBell')}
              />
              <Checkbox
                label="Message"
                disabled={!watchExternalNotificationPluginEnabled}
                {...register('extNotificationPluginAlertMessage')}
              />
              <Input
                type="number"
                label="Output"
                disabled={!watchExternalNotificationPluginEnabled}
                {...register('extNotificationPluginOutput', {
                  valueAsNumber: true,
                })}
              />
              <Input
                type="number"
                label="Output MS"
                disabled={!watchExternalNotificationPluginEnabled}
                {...register('extNotificationPluginOutputMs', {
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
