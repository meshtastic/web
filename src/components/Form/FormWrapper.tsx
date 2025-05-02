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
      <div className="sm:grid sm:grid-cols-3 sm:items-baseline sm:gap-4">
        <Label htmlFor={fieldName}>{label}</Label>
        <div className="sm:col-span-2">
          <div className="max-w-lg">
            <p className="text-sm text-slate-500">{description}</p>
            <p hidden={valid ?? true} className="text-sm text-red-500">
              {validationText}
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
);
