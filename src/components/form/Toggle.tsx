import { Switch } from "@headlessui/react";

export interface ToggleProps {
  checked: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
}

export const Toggle = ({
  checked,
  label,
  description,
  disabled,
  className,
  onChange
}: ToggleProps): JSX.Element => {
  return (
    <Switch.Group
      as="div"
      className={`flex items-center justify-between ${className}`}
    >
      <span className="flex flex-grow flex-col">
        {label && (
          <Switch.Label
            as="span"
            className="block text-sm font-medium text-textPrimary"
            passive
          >
            {label}
          </Switch.Label>
        )}
        {description && (
          <Switch.Description as="span" className="text-sm text-textSecondary">
            {description}
          </Switch.Description>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent ${
          checked ? "bg-accent" : "bg-backgroundPrimary"
        } ${disabled ? "bg-orange-200 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-backgroundSecondary ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </Switch>
    </Switch.Group>
  );
};
