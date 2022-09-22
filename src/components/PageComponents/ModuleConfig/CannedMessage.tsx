import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { CannedMessageValidation } from "@app/validation/moduleConfig/cannedMessage.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const CannedMessage = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<CannedMessageValidation>({
    defaultValues: moduleConfig.cannedMessage,
    resolver: classValidatorResolver(CannedMessageValidation),
  });

  const moduleEnabled = useWatch({
    control,
    name: "rotary1Enabled",
    defaultValue: false,
  });

  useEffect(() => {
    reset(moduleConfig.cannedMessage);
  }, [reset, moduleConfig.cannedMessage]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "cannedMessage",
          cannedMessage: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form
      title="Canned Message Config"
      breadcrumbs={["Module Config", "Canned Message"]}
      reset={() => reset(moduleConfig.cannedMessage)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="rotary1Enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Rotary Encoder #1 Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Encoder Pin A"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinA", { valueAsNumber: true })}
      />
      <Input
        label="Encoder Pin B"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinB", { valueAsNumber: true })}
      />
      <Input
        label="Endoer Pin Press"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinPress", { valueAsNumber: true })}
      />
      <Select
        label="Clockwise event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select>
      <Select
        label="Counter Clockwise event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCcw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select>
      <Select
        label="Press event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventPress", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </Select>
      <Controller
        name="updown1Enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Up Down enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Allow Input Source"
        description="Max transmit power in dBm"
        disabled={moduleEnabled}
        {...register("allowInputSource")}
      />
      <Controller
        name="sendBell"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Send Bell"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
