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

export interface GeneratorProps extends React.BaseHTMLAttributes<HTMLElement> {
  devicePSKBitCount?: number;
  value: string;
  variant: "default" | "invalid";
  buttonText?: string;
  selectChange: (event: string) => void;
  inputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  buttonClick: React.MouseEventHandler<HTMLButtonElement>;
}

const Generator = React.forwardRef<HTMLInputElement, GeneratorProps>(
  (
    {
      devicePSKBitCount,
      variant,
      value,
      buttonText,
      selectChange,
      inputChange,
      buttonClick,
      ...props
    },
    ref,
  ) => {
    return (
      <>
        <Input
          type="text"
          id="pskInput"
          variant={variant}
          value={value}
          onChange={inputChange}
        />
        <Select
          value={devicePSKBitCount?.toString()}
          onValueChange={(e) => selectChange(e)}
        >
          <SelectTrigger>
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
