import type React from "react";
import { useEffect, useState } from "react";

import { Dialog, SelectField } from "evergreen-ui";
import { useForm } from "react-hook-form";

import { LoRaValidation } from "@app/validation/config/lora.js";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { Form } from "../form/Form.js";

export interface RegionDialogProps {
  isOpen: boolean;
}

export const RegionDialog = ({ isOpen }: RegionDialogProps): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<LoRaValidation>({
    defaultValues: config.lora,
    resolver: classValidatorResolver(LoRaValidation),
  });

  useEffect(() => {
    reset(config.lora);
  }, [reset, config.lora]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "lora",
          lora: data,
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
    <Dialog isShown={isOpen} title="Generate QR Code" hasFooter={false}>
      <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
        <SelectField
          label="Region"
          description="This is a description."
          isInvalid={!!errors.region?.message}
          validationMessage={errors.region?.message}
          {...register("region", { valueAsNumber: true })}
        >
          {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
        </SelectField>
      </Form>
    </Dialog>
  );
};
