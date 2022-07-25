import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

import { CannedMessageValidation } from "@app/validation/moduleConfig/cannedMessage.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="Module Enabled"
        description="This is a description."
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
      <FormField
        label="Rotary Encoder #1 Enabled"
        description="This is a description."
        isInvalid={!!errors.rotary1Enabled?.message}
        validationMessage={errors.rotary1Enabled?.message}
      >
        <Controller
          name="rotary1Enabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        label="Encoder Pin A"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinA", { valueAsNumber: true })}
      />
      <TextInputField
        label="Encoder Pin B"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinB", { valueAsNumber: true })}
      />
      <TextInputField
        label="Endoer Pin Press"
        description="Max transmit power in dBm"
        type="number"
        disabled={moduleEnabled}
        {...register("inputbrokerPinPress", { valueAsNumber: true })}
      />
      <SelectField
        label="Clockwise event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </SelectField>
      <SelectField
        label="Counter Clockwise event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventCcw", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </SelectField>
      <SelectField
        label="Press event"
        description="This is a description."
        disabled={moduleEnabled}
        {...register("inputbrokerEventPress", { valueAsNumber: true })}
      >
        {renderOptions(
          Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
        )}
      </SelectField>
      <FormField
        label="Up Down enabled"
        description="This is a description."
        isInvalid={!!errors.updown1Enabled?.message}
        validationMessage={errors.updown1Enabled?.message}
      >
        <Controller
          name="updown1Enabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        label="Allow Input Source"
        description="Max transmit power in dBm"
        disabled={moduleEnabled}
        {...register("allowInputSource")}
      />
      <FormField
        label="Send Bell"
        description="This is a description."
        isInvalid={!!errors.sendBell?.message}
        validationMessage={errors.sendBell?.message}
      >
        <Controller
          name="sendBell"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
