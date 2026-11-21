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

/** An option with its own label key, like the position flags. */
const isFlagConfig = (
  value: unknown,
): value is { readonly value: number; readonly i18nKey: string } =>
  typeof value === "object" &&
  value !== null &&
  "i18nKey" in value &&
  typeof value.i18nKey === "string" &&
  "value" in value &&
  typeof value.value === "number";

export function MultiSelectInput<T extends FieldValues>({
  field,
  isDirty,
  invalid,
}: GenericFormElementProps<T, MultiSelectFieldProps<T>>) {
  const { t } = useTranslation("config");
  const { enumValue, className, ...remainingProperties } = field.properties;

  const optionsToRender = Object.entries(enumValue).map(
    ([key, configOrValue]) =>
      isFlagConfig(configOrValue)
        ? { key, display: t(configOrValue.i18nKey), value: configOrValue.value }
        : { key, display: key, value: configOrValue },
  );

  return (
    <MultiSelect
      className={cn([
        className,
        "rounded-control",
        isDirty && "outline-2 outline-offset-4 outline-dirty",
        invalid && "outline-2 outline-offset-4 outline-danger-strong",
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
