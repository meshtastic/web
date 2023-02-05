import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { base16 } from "rfc4648";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { UserValidation } from "@app/validation/config/user.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const User = (): JSX.Element => {
  const { hardware, nodes, connection } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const { register, handleSubmit, reset, control } = useForm<UserValidation>({
    defaultValues: myNode?.data.user,
    resolver: classValidatorResolver(UserValidation)
  });

  useEffect(() => {
    reset({
      longName: myNode?.data.user?.longName,
      shortName: myNode?.data.user?.shortName,
      isLicensed: myNode?.data.user?.isLicensed
    });
  }, [reset, myNode]);

  const onSubmit = handleSubmit((data) => {
    if (connection && myNode?.data.user) {
      void toast.promise(
        connection
          .setOwner(
            new Protobuf.User({
              ...myNode.data.user,
              ...data
            })
          )
          .then(() => reset({ ...data })),
        {
          loading: "Saving...",
          success: "Saved User, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  return (
    <Form onSubmit={onSubmit}>
      <Input
        label="Device Name"
        description="Personalised name for this device."
        {...register("longName")}
      />
      <Input
        label="Short Name"
        description="Shown on small screens."
        maxLength={4}
        {...register("shortName")}
      />
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
      <Input
        label="Device ID"
        disabled
        description="Preset unique identifier for this device."
        value={myNode?.data.user?.id}
      />
      <Select
        label="Hardware"
        description="Hardware model of this device."
        disabled
        value={myNode?.data.user?.hwModel}
      >
        {renderOptions(Protobuf.HardwareModel)}
      </Select>
    </Form>
  );
};
