import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import type { FLAGS_CONFIG } from "@core/hooks/usePositionFlags.ts";
import { cn } from "@core/utils/cn.ts";
import type { FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MultiSelect, MultiSelectItem } from "../UI/MultiSelect.tsx";

export interface MultiSelectFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "multiSelect";
  placeholder?: string;
  onValueChange: (name: string) => void;
  isChecked: (name: string) => boolean;
  value: string[];
  properties: BaseFormBuilderProps<T>["properties"] & {
    enumValue: { [s: string]: string | number } | typeof FLAGS_CONFIG;
    formatEnumName?: boolean;
  };
}

export function MultiSelectInput<T extends FieldValues>({
  field,
  isDirty,
  invalid,
}: GenericFormElementProps<T, MultiSelectFieldProps<T>>) {
  const { t } = useTranslation("config");
  const { enumValue, className, ...remainingProperties } = field.properties;

  const isNewConfigStructure =
    typeof Object.values(enumValue)[0] === "object" &&
    Object.values(enumValue)[0] !== null &&
    "i18nKey" in Object.values(enumValue)[0];

  const optionsToRender = Object.entries(enumValue).map(
    ([key, configOrValue]) => {
      if (isNewConfigStructure) {
        const config =
          configOrValue as (typeof FLAGS_CONFIG)[keyof typeof FLAGS_CONFIG];
        return {
          key,
          display: t(config.i18nKey),
          value: config.value,
        };
      }
      return { key, display: key, value: configOrValue as number };
    },
  );

  return (
    <MultiSelect
      className={cn([
        className,
        "rounded-md",
        isDirty ? "focus:ring-sky-500 ring-sky-500 ring-2 ring-offset-5" : "",
        invalid ? "focus:ring-red-500 ring-red-500 ring-2 ring-offset-5" : "",
      ])}
      {...remainingProperties}
    >
      {optionsToRender.map((option) => {
        return (
          <MultiSelectItem
            key={option.key}
            name={option.key}
            value={option.value.toString()}
            checked={field.isChecked(option.key)}
            onCheckedChange={() => field.onValueChange(option.key)}
          >
            {option.display}
          </MultiSelectItem>
        );
      })}
    </MultiSelect>
  );
}
