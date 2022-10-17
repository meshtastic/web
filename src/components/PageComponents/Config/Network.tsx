import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { renderOptions } from "@app/core/utils/selectEnumOptions.js";
import { NetworkValidation } from "@app/validation/config/network.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Network = (): JSX.Element => {
  const { config, connection } = useDevice();
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
    if (connection) {
      void toast.promise(
        connection.setConfig(
          {
            payloadVariant: {
              oneofKind: "network",
              network: data,
            },
          },
          async () => {
            reset({ ...data });
            await Promise.resolve();
          }
        ),
        {
          loading: "Saving...",
          success: "Saved Network Config, Restarting Node",
          error: "No response received",
        }
      );
    }
  });

  return (
    <Form
      title="Network Config"
      breadcrumbs={["Config", "Network"]}
      reset={() => reset(config.network)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="wifiEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="WiFi Enabled"
            description="Enable or disable the WiFi radio"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="WiFi Mode"
        description="How the WiFi radio should be used"
        disabled={!wifiEnabled}
        {...register("wifiMode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_NetworkConfig_WiFiMode)}
      </Select>
      <Input
        label="SSID"
        description="Network name"
        error={errors.wifiSsid?.message}
        disabled={!wifiEnabled}
        {...register("wifiSsid")}
      />
      <Input
        label="PSK"
        type="password"
        description="Network password"
        error={errors.wifiPsk?.message}
        disabled={!wifiEnabled}
        {...register("wifiPsk")}
      />
      <Input
        label="NTP Server"
        description="NTP server for time synchronization"
        error={errors.ntpServer?.message}
        {...register("ntpServer")}
      />
    </Form>
  );
};
