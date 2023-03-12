import { Label } from "../UI/Label.js";
import { ErrorMessage } from "@hookform/error-message";
import { Switch } from "../UI/Switch.js";

export interface FieldWrapperProps {
  label: string;
  description?: string;
  disabled?: boolean;
  enableSwitchEnabled?: boolean;
  onEnableSwitchChanged?: (value: boolean) => void;
  children?: React.ReactNode;
}

export const FieldWrapper = ({
  label,
  description,
  enableSwitchEnabled,
  onEnableSwitchChanged,
  children
}: FieldWrapperProps): JSX.Element => (
  <div className="pt-6 sm:pt-5">
    <div role="group" aria-labelledby="label-notifications">
      <div className="sm:grid sm:grid-cols-3 sm:items-baseline sm:gap-4">
        <div className="sm:col-span-1">
          <Label>{label}</Label>
          {enableSwitchEnabled !== undefined && (
            <div className="mt-4 space-y-4">
              <Switch
                defaultChecked={enableSwitchEnabled}                  
                onCheckedChange={onEnableSwitchChanged}
              />
            </div>
          )}
        </div>        
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
