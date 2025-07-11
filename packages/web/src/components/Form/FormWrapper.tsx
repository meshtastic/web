import { Label } from "@components/UI/Label.tsx";

export interface FieldWrapperProps {
  label: string;
  fieldName: string;
  description?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  valid?: boolean;
  validationText?: string;
}

export const FieldWrapper = ({
  label,
  fieldName,
  description,
  children,
  valid,
  validationText,
}: FieldWrapperProps) => (
  <div className="pt-6 sm:pt-5">
    <fieldset aria-labelledby="label-notifications">
      {/* first column = labels/heading, second column = fields, third column = gutter  */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_2fr_.1fr] sm:items-baseline gap-4">
        <Label htmlFor={fieldName}>{label}</Label>
        <div className="max-w-3xl">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
          <p hidden={valid ?? true} className="text-sm text-red-500">
            {validationText}
          </p>
          <div className="mt-4 space-y-4 sm:col-span-2">
            <div className="flex items-center">{children}</div>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
);
