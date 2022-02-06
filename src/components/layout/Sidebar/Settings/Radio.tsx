import React from 'react';

import { useForm } from 'react-hook-form';

import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Checkbox, Select } from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Radio = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  React.useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      reset({ ...data });
      setLoading(false);
      await Promise.resolve();
    });
  });
  return (
    <form className="space-y-2" onSubmit={onSubmit}>
      <Checkbox label="Is Router" {...register('isRouter')} />
      <Select
        label="Region"
        optionsEnum={Protobuf.RegionCode}
        {...register('region', { valueAsNumber: true })}
      />
      <Checkbox label="Debug Log" {...register('debugLogEnabled')} />
      <Checkbox label="Serial Disabled" {...register('serialDisabled')} />
    </form>
  );
};
