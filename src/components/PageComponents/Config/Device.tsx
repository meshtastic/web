import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { DeviceValidation } from "@app/validation/config/device.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { useAppStore } from "@app/core/stores/appStore";
import { getCurrentConfig } from "@app/core/stores/configStore";

export const Device = (): JSX.Element => {
  // TODO: Apply to other pages as well
  const { selectedDevice } = useAppStore();
  const { configCust, moduleConfig } = getCurrentConfig();
  // TODO: Put these in separate setCurrentConfig() function
  const { config, setWorkingConfig } = selectedDevice != -1 ? useDevice() : {config: undefined, setWorkingConfig: undefined };
  const { register, handleSubmit, control, reset } = useForm<DeviceValidation>({
    mode: "onChange",
    defaultValues: configCust.device,
    resolver: classValidatorResolver(DeviceValidation)
  });

  useEffect(() => {
    reset(configCust.device);
  }, [reset, configCust.device]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig ? (
      new Protobuf.Config({
        payloadVariant: {
          case: "device",
          value: data
        }
      })
    ) : null /* not implemented yet */ ;
  });

  return (
    <Form onSubmit={onSubmit}>
      <Select
        label="Role"
        description="What role the device performs on the mesh"
        {...register("role", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DeviceConfig_Role)}
      </Select>
      <Controller
        name="serialEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Serial Output Enabled"
            description="Disable the device's serial console"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="debugLogEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enabled Debug Log"
            description="Output debugging information to the device's serial port (auto disables when serial client is connected)"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Button Pin"
        description="Button pin override"
        type="number"
        {...register("buttonGpio", { valueAsNumber: true })}
      />
      <Input
        label="Buzzer Pin"
        description="Buzzer pin override"
        type="number"
        {...register("buzzerGpio", { valueAsNumber: true })}
      />
    </Form>
  );
};
