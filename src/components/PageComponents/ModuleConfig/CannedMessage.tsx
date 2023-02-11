import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { CannedMessageValidation } from "@app/validation/moduleConfig/cannedMessage.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const CannedMessage = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<CannedMessageValidation>({
    mode: "onChange",
    defaultValues: moduleConfig.cannedMessage,
    resolver: classValidatorResolver(CannedMessageValidation)
  });

  const moduleEnabled = useWatch({
    control,
    name: "rotary1Enabled",
    defaultValue: false
  });

  useEffect(() => {
    reset(moduleConfig.cannedMessage);
  }, [reset, moduleConfig.cannedMessage]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "cannedMessage",
          value: data
        }
      })
    );
  });

  return (
    <form onChange={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Enable canned messages"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="rotary1Enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle label="Rotary Encoder #1 Enabled" checked={value} {...rest} />
        )}
      />
      <Input
        label="Encoder Pin A"
        description="GPIO Pin Value (1-39) For encoder port A"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinA", { valueAsNumber: true })}
      />
      <Input
        label="Encoder Pin B"
        description="GPIO Pin Value (1-39) For encoder port B"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinB", { valueAsNumber: true })}
      />
      <Input
        label="Encoder Pin Press"
        description="GPIO Pin Value (1-39) For encoder Press"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinPress", { valueAsNumber: true })}
      />
      {/* <Select
        label="Clockwise event"
        description="Select input event."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select>
      <Select
        label="Counter Clockwise event"
        description="Select input event."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCcw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select>
      <Select
        label="Press event"
        description="Select input event"
        disabled={moduleEnabled}
        {...register("inputbrokerEventPress", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select> */}
      <Controller
        name="updown1Enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Up Down enabled"
            description="Enable the up / down encoder"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Allow Input Source"
        description="Select from: '_any', 'rotEnc1', 'upDownEnc1', 'cardkb'"
        disabled={moduleEnabled}
        {...register("allowInputSource")}
      />
      <Controller
        name="sendBell"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Send Bell"
            description="Sends a bell character with each message"
            checked={value}
            {...rest}
          />
        )}
      />
    </form>
  );
};
