import type React from "react";
import { useEffect, useState } from "react";

import {
  FormField,
  SelectField,
  Switch,
  TextInputField,
  toaster,
} from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

import { renderOptions } from "@app/core/utils/selectEnumOptions.js";
import { NetworkValidation } from "@app/validation/config/network.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Network = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<NetworkValidation>({
    defaultValues: config.network,
    resolver: classValidatorResolver(NetworkValidation),
  });

  const wifiEnabled = useWatch({
    control,
    name: "wifiEnabled",
    defaultValue: false,
  });

  useEffect(() => {
    reset(config.network);
  }, [reset, config.network]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "network",
          network: data,
        },
      },
      async () => {
        toaster.success("Successfully updated Network config");
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="WiFi Enabled"
        description="Description"
        isInvalid={!!errors.wifiEnabled?.message}
        validationMessage={errors.wifiEnabled?.message}
      >
        <Controller
          name="wifiEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <SelectField
        label="WiFi Mode"
        description="This is a description."
        {...register("wifiMode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_NetworkConfig_WiFiMode)}
      </SelectField>
      <TextInputField
        label="SSID"
        description="This is a description."
        isInvalid={!!errors.wifiSsid?.message}
        validationMessage={errors.wifiSsid?.message}
        {...register("wifiSsid")}
      />
      <TextInputField
        label="PSK"
        type="password"
        description="This is a description."
        isInvalid={!!errors.wifiPsk?.message}
        validationMessage={errors.wifiPsk?.message}
        {...register("wifiPsk")}
      />
      <TextInputField
        label="NTP Server"
        description="This is a description."
        isInvalid={!!errors.ntpServer?.message}
        validationMessage={errors.ntpServer?.message}
        {...register("ntpServer")}
      />
    </Form>
  );
};
