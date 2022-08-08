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
import { WiFiValidation } from "@app/validation/config/wifi.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const WiFi = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<WiFiValidation>({
    defaultValues: config.wifi,
    resolver: classValidatorResolver(WiFiValidation),
  });

  const wifiEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false,
  });

  useEffect(() => {
    reset(config.wifi);
  }, [reset, config.wifi]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "wifi",
          wifi: data,
        },
      },
      async () => {
        toaster.success("Successfully updated WiFi config");
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
        isInvalid={!!errors.enabled?.message}
        validationMessage={errors.enabled?.message}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <SelectField
        label="WiFi Mode"
        description="This is a description."
        {...register("mode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_WiFiConfig_WiFiMode)}
      </SelectField>
      <TextInputField
        label="SSID"
        description="This is a description."
        isInvalid={!!errors.ssid?.message}
        validationMessage={errors.ssid?.message}
        {...register("ssid")}
      />
      <TextInputField
        label="PSK"
        type="password"
        description="This is a description."
        isInvalid={!!errors.psk?.message}
        validationMessage={errors.psk?.message}
        {...register("psk")}
      />
    </Form>
  );
};
