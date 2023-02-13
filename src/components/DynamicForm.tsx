import {
  Controller,
  DeepPartial,
  FieldValues,
  Path,
  SubmitHandler,
  useForm
} from "react-hook-form";
import { Input } from "@components/UI/Input.js";
import { Label } from "@components/UI/Label.js";
import { ErrorMessage } from "@hookform/error-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@components/UI/Select.js";
import { Switch } from "@components/UI/Switch.js";
import { H4 } from "@components/UI/Typography/H4.js";
import { Subtle } from "@components/UI/Typography/Subtle.js";

interface DisabledBy<T> {
  fieldName: Path<T>;
  selector?: number;
  invert?: boolean;
}

interface BasicFieldProps<T> {
  name: Path<T>;
  label: string;
  description?: string;
  active?: boolean;
  required?: boolean;
  disabledBy?: DisabledBy<T>[];
}

interface InputFieldProps<T> extends BasicFieldProps<T> {
  type: "text" | "number" | "password";
  suffix?: string;
}

interface SelectFieldProps<T> extends BasicFieldProps<T> {
  type: "select" | "multiSelect";

  enumValue: {
    [s: string]: string | number;
  };
  formatEnumName?: boolean;
}

interface ToggleFieldProps<T> extends BasicFieldProps<T> {
  type: "toggle";
}

export interface FormProps<T extends FieldValues> {
  onSubmit: SubmitHandler<T>;
  defaultValues?: DeepPartial<T>;
  fieldGroups: {
    label: string;
    description: string;
    fields: (InputFieldProps<T> | SelectFieldProps<T> | ToggleFieldProps<T>)[];
  }[];
}

export function DynamicForm<T extends FieldValues>({
  fieldGroups,
  onSubmit,
  defaultValues
}: FormProps<T>) {
  const { register, handleSubmit, control, getValues } = useForm<T>({
    mode: "onChange",
    defaultValues: defaultValues
  });

  const isDisabled = (disabledBy?: DisabledBy<T>[]): boolean => {
    if (!disabledBy) return false;

    return disabledBy.some((field) => {
      const value = getValues(field.fieldName);
      if (typeof value === "boolean") return field.invert ? value : !value;
      if (typeof value === "number")
        return field.invert
          ? field.selector !== value
          : field.selector === value;
      return false;
    });
  };

  return (
    <form
      className="space-y-8 divide-y divide-gray-200"
      onChange={handleSubmit(onSubmit)}
    >
      {fieldGroups.map((fieldGroup, index) => (
        <div
          key={index}
          className="space-y-8 divide-y divide-gray-200 sm:space-y-5"
        >
          <div>
            <H4 className="font-medium">{fieldGroup.label}</H4>
            <Subtle>{fieldGroup.description}</Subtle>
          </div>

          {fieldGroup.fields.map((field, index) => {
            const fieldWrapperData: FieldWrapperProps = {
              label: field.label,
              description: field.description,
              disabled: isDisabled(field.disabledBy)
            };

            switch (field.type) {
              case "text":
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    <Input
                      type="text"
                      suffix={field.suffix}
                      disabled={fieldWrapperData.disabled}
                      {...register(field.name)}
                    />
                  </FieldWrapper>
                );
              case "number":
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    <Controller
                      name={field.name}
                      control={control}
                      render={({ field: { value, onChange, ...rest } }) => (
                        <Input
                          type="number"
                          value={parseInt(value)}
                          suffix={field.suffix}
                          onChange={(e) => onChange(parseInt(e.target.value))}
                          disabled={fieldWrapperData.disabled}
                          {...rest}
                        />
                      )}
                    />
                  </FieldWrapper>
                );
              case "password":
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    <Input
                      type="password"
                      suffix={field.suffix}
                      disabled={fieldWrapperData.disabled}
                      // action={{
                      //   icon: hidden ? EyeIcon : EyeOffIcon,
                      //   onClick: () => {
                      //   }
                      // }}
                      {...register(field.name)}
                    />
                  </FieldWrapper>
                );
              case "toggle":
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    <Controller
                      name={field.name}
                      control={control}
                      render={({ field: { value, onChange, ...rest } }) => (
                        <Switch
                          checked={value}
                          onCheckedChange={onChange}
                          disabled={fieldWrapperData.disabled}
                          {...rest}
                        />
                      )}
                    />
                  </FieldWrapper>
                );
              case "select":
                const optionsEnumValues = field.enumValue
                  ? Object.entries(field.enumValue).filter(
                      (value) => typeof value[1] === "number"
                    )
                  : [];
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    <Controller
                      name={field.name}
                      control={control}
                      render={({ field: { value, onChange, ...rest } }) => (
                        <Select
                          onValueChange={(e) => onChange(parseInt(e))}
                          disabled={fieldWrapperData.disabled}
                          value={value?.toString()}
                          {...rest}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {optionsEnumValues.map(([name, value], index) => (
                              <SelectItem key={index} value={value.toString()}>
                                {field.formatEnumName
                                  ? name
                                      .replace(/_/g, " ")
                                      .toLowerCase()
                                      .split(" ")
                                      .map(
                                        (s) =>
                                          s.charAt(0).toUpperCase() +
                                          s.substring(1)
                                      )
                                      .join(" ")
                                  : name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldWrapper>
                );
              case "multiSelect":
                return (
                  <FieldWrapper key={index} {...fieldWrapperData}>
                    tmp
                  </FieldWrapper>
                );
            }
          })}
        </div>
      ))}
    </form>
  );
}

interface FieldWrapperProps {
  label: string;
  description?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const FieldWrapper = ({
  label,
  description,
  disabled,
  children
}: FieldWrapperProps): JSX.Element => (
  <div className="pt-6 sm:pt-5">
    <div role="group" aria-labelledby="label-notifications">
      <div className="sm:grid sm:grid-cols-3 sm:items-baseline sm:gap-4">
        <Label>{label}</Label>
        <div className="sm:col-span-2">
          <div className="max-w-lg">
            <p className="text-sm text-gray-500">{description}</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
