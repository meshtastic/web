import {
  REMOTE_HARDWARE_MAX_PINS,
  type RemoteHardwareValidation,
} from "@app/validation/moduleConfig/remoteHardware.ts";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { Protobuf } from "@meshtastic/sdk";
import { PlusIcon, TrashIcon } from "lucide-react";
import {
  Controller,
  get,
  type SubmitHandler,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

const PinType = Protobuf.ModuleConfig.RemoteHardwarePinType;

/** Android offers only the two usable types; UNKNOWN is the proto default. */
const PIN_TYPES = [PinType.DIGITAL_READ, PinType.DIGITAL_WRITE] as const;

interface RemoteHardwarePinsProps {
  onSubmit: SubmitHandler<RemoteHardwareValidation>;
  disabled?: boolean;
}

/**
 * List editor for RemoteHardwareConfig.available_pins, like Android's
 * EditListPreference: one row per pin with its GPIO number, name and type,
 * a delete button, and Add while there are fewer than four.
 */
export const RemoteHardwarePins = ({
  onSubmit,
  disabled,
}: RemoteHardwarePinsProps) => {
  const { t } = useTranslation("moduleConfig");
  const { control, register, handleSubmit, formState } =
    useFormContext<RemoteHardwareValidation>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "availablePins",
  });

  // Typing bubbles a change event up to the form, which stages it. Adding,
  // removing and picking from a Select don't, so stage those here.
  const stage = () => {
    void handleSubmit(onSubmit)();
  };

  const invalid = (index: number, key: string) =>
    get(formState.errors, `availablePins.${index}.${key}`) !== undefined;

  return (
    <FieldWrapper
      label={t("remoteHardware.availablePins.label")}
      fieldName="availablePins"
      description={t("remoteHardware.availablePins.description")}
    >
      <div className="flex w-full flex-col gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              containerClassName="w-24"
              aria-label={t("remoteHardware.availablePins.gpioPin")}
              placeholder={t("remoteHardware.availablePins.gpioPin")}
              disabled={disabled}
              variant={invalid(index, "gpioPin") ? "invalid" : "default"}
              {...register(`availablePins.${index}.gpioPin`)}
            />
            <Input
              containerClassName="min-w-32 flex-1"
              aria-label={t("remoteHardware.availablePins.name")}
              placeholder={t("remoteHardware.availablePins.name")}
              disabled={disabled}
              variant={invalid(index, "name") ? "invalid" : "default"}
              {...register(`availablePins.${index}.name`)}
            />
            <Controller
              control={control}
              name={`availablePins.${index}.type`}
              render={({ field: { value, onChange } }) => (
                <Select
                  value={
                    value === PinType.UNKNOWN ? undefined : value.toString()
                  }
                  onValueChange={(next) => {
                    onChange(Number.parseInt(next, 10));
                    stage();
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={t("remoteHardware.availablePins.type")}
                    className="w-40"
                  >
                    <SelectValue
                      placeholder={t("remoteHardware.availablePins.type")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {PIN_TYPES.map((type) => (
                      <SelectItem key={type} value={type.toString()}>
                        {t(`remoteHardware.availablePins.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={t("remoteHardware.availablePins.remove")}
              onClick={() => {
                remove(index);
                stage();
              }}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="subtle"
            disabled={disabled || fields.length >= REMOTE_HARDWARE_MAX_PINS}
            onClick={() => {
              append({ gpioPin: 0, name: "", type: PinType.DIGITAL_READ });
              stage();
            }}
          >
            <PlusIcon className="mr-2 size-4" />
            {t("remoteHardware.availablePins.add")}
          </Button>
        </div>
      </div>
    </FieldWrapper>
  );
};
