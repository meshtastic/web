import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm } from "react-hook-form";
import { base16 } from "rfc4648";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { UserValidation } from "@app/validation/config/user.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const User = (): JSX.Element => {
  const { hardware, nodes, connection } = useDevice();
  const [loading, setLoading] = useState(false);

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<UserValidation>({
    defaultValues: myNode?.data.user,
    resolver: classValidatorResolver(UserValidation),
  });

  useEffect(() => {
    reset({
      longName: myNode?.data.user?.longName,
      shortName: myNode?.data.user?.shortName,
      isLicensed: myNode?.data.user?.isLicensed,
    });
  }, [reset, myNode]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);

    if (myNode?.data.user) {
      void connection?.setOwner({ ...myNode.data.user, ...data }, async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      });
    }
  });

  return (
    <Form
      title="User Config"
      breadcrumbs={["Config", "User"]}
      reset={() => {
        reset({
          longName: myNode?.data.user?.longName,
          shortName: myNode?.data.user?.shortName,
          isLicensed: myNode?.data.user?.isLicensed,
        });
      }}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Input
        label="Device ID"
        description="Preset unique identifier for this device."
        error={errors.id?.message}
        {...register("id")}
        readOnly
      />
      <Input
        label="Device Name"
        description="Personalised name for this device."
        {...register("longName")}
      />
      <Input
        label="Short Name"
        description="Shown on small screens."
        maxLength={3}
        {...register("shortName")}
      />
      <Input
        label="Mac Address"
        description="Hardware address for this node."
        disabled
        value={
          base16
            .stringify(myNode?.data.user?.macaddr ?? [])
            .match(/.{1,2}/g)
            ?.join(":") ?? ""
        }
      />
      <Select
        label="Hardware"
        description="Hardware model of this device."
        disabled
        value={myNode?.data.user?.hwModel}
      >
        {renderOptions(Protobuf.HardwareModel)}
      </Select>
      <Controller
        name="isLicensed"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Licenced Operator?"
            description="Remove bandwidth restrictions in certain regions (HAM license required)"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
