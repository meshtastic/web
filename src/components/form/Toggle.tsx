import { Switch } from "../UI/Switch.js";
import { InfoWrapper } from "./InfoWrapper.js";

export interface ToggleProps {
  checked: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Toggle = ({
  checked,
  label,
  description,
  disabled,
  onChange
}: ToggleProps): JSX.Element => {
  return (
    <InfoWrapper label={label} description={description}>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </InfoWrapper>
  );
};
