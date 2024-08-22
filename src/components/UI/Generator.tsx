import * as React from "react";

import { Button } from "@components/UI/Button.js";
import { Input } from "@components/UI/Input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.js";
import type { LucideIcon } from "lucide-react";

export interface GeneratorProps extends React.BaseHTMLAttributes<HTMLElement> {
  hide?: boolean;
  devicePSKBitCount?: number;
  value: string;
  variant: "default" | "invalid";
  buttonText?: string;
  selectChange: (event: string) => void;
  inputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  buttonClick: React.MouseEventHandler<HTMLButtonElement>;
  action?: {
    icon: LucideIcon;
    onClick: () => void;
  };
  disabled?: boolean;
}

const Generator = React.forwardRef<HTMLInputElement, GeneratorProps>(
  (
    {
      hide = true,
      devicePSKBitCount,
      variant,
      value,
      buttonText,
      selectChange,
      inputChange,
      buttonClick,
      action,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <>
        <Input
          type={hide ? "password" : "text"}
          id="pskInput"
          variant={variant}
          value={value}
          onChange={inputChange}
          action={action}
          disabled={disabled}
        />
        <Select
          value={devicePSKBitCount?.toString()}
          onValueChange={(e) => selectChange(e)}
        >
          <SelectTrigger className="!max-w-max">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="bit256" value="32">
              256 bit
            </SelectItem>
            <SelectItem key="bit128" value="16">
              128 bit
            </SelectItem>
            <SelectItem key="bit8" value="1">
              8 bit
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="success"
          onClick={buttonClick}
          {...props}
        >
          {buttonText}
        </Button>
      </>
    );
  },
);
Generator.displayName = "Button";

export { Generator };
