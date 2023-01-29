import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormSection } from "@components/form/FormSection.js";
import { Input } from "@components/form/Input.js";
import { IPInput } from "@components/form/IPInput.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { NetworkValidation } from "@app/validation/config/network.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { ErrorMessage } from "@hookform/error-message";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Network = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { register, handleSubmit, control, reset } = useForm<NetworkValidation>(
    {
      mode: "onChange",
      defaultValues: config.network,
      resolver: classValidatorResolver(NetworkValidation)
    }
  );

  const wifiEnabled = useWatch({
    control,
    name: "wifiEnabled",
    defaultValue: false
  });

  const ethEnabled = useWatch({
    control,
    name: "ethEnabled",
    defaultValue: false
  });

  const ethMode = useWatch({
    control,
    name: "addressMode",
    defaultValue: Protobuf.Config_NetworkConfig_AddressMode.DHCP
  });

  useEffect(() => {
    reset(config.network);
  }, [reset, config.network]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "network",
          value: data
        }
      })
    );
  });

  return (
    <Form onSubmit={onSubmit}>
      <FormSection title="WiFi Config">
        <Controller
          name="wifiEnabled"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Enabled"
              description="Enable or disable the WiFi radio"
              checked={value}
              {...rest}
            />
          )}
        />
        <Input
          label="SSID"
          description="Network name"
          disabled={!wifiEnabled}
          {...register("wifiSsid", { disabled: !wifiEnabled })}
        />
        <Input
          label="PSK"
          type="password"
          description="Network password"
          disabled={!wifiEnabled}
          {...register("wifiPsk", { disabled: !wifiEnabled })}
        />
      </FormSection>
      <FormSection title="Ethernet Config">
        <Controller
          name="ethEnabled"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Enabled"
              description="Enable or disbale the Ethernet port"
              checked={value}
              {...rest}
            />
          )}
        />
      </FormSection>
      <FormSection title="IP Config">
        <Select
          label="Address Mode"
          description="Address assignment selection"
          disabled={!(ethEnabled || wifiEnabled)}
          {...register("addressMode", {
            valueAsNumber: true
          })}
        >
          {renderOptions(Protobuf.Config_NetworkConfig_AddressMode)}
        </Select>
        {ethMode === Protobuf.Config_NetworkConfig_AddressMode.STATIC && (
          <>
            <IPInput
              label="IP"
              description="IP Address"
              {...register("ipv4Config.ip", { valueAsNumber: true })}
            />
            <IPInput
              label="Gateway"
              description="Default Gateway"
              {...register("ipv4Config.gateway", { valueAsNumber: true })}
            />
            <IPInput
              label="Subnet"
              description="Subnet Mask"
              {...register("ipv4Config.subnet", { valueAsNumber: true })}
            />
            <IPInput
              label="DNS"
              description="DNS Server"
              {...register("ipv4Config.dns", { valueAsNumber: true })}
            />
          </>
        )}
      </FormSection>
      <Input
        label="NTP Server"
        description="NTP server for time synchronization"
        {...register("ntpServer")}
      />
      <Input
        label="Rsyslog Server"
        description="Rsyslog server for external logging"
        {...register("rsyslogServer")}
      />
    </Form>
  );
};
