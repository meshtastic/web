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
  type: "text" | "password";
  devicePSKBitCount?: number;
  value: string;
  variant: "default" | "invalid";
  buttonText?: string;
  bits?: { text: string; value: string; key: string }[];
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
      type,
      devicePSKBitCount,
      variant,
      value,
      buttonText,
      bits = [
        { text: "256 bit", value: "32", key: "bit256" },
        { text: "128 bit", value: "16", key: "bit128" },
        { text: "8 bit", value: "1", key: "bit8" },
      ],
      selectChange,
      inputChange,
      buttonClick,
      action,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Invokes onChange event on the input element when the value changes from the parent component
    React.useEffect(() => {
      if (!inputRef.current) return;
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      if (!setValue) return;
      inputRef.current.value = "";
      setValue.call(inputRef.current, value);
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }, [value]);
    return (
      <>
        <Input
          type={type}
          id="pskInput"
          variant={variant}
          value={value}
          onChange={inputChange}
          action={action}
          disabled={disabled}
          ref={inputRef}
        />
        <Select
          value={devicePSKBitCount?.toString()}
          onValueChange={(e) => selectChange(e)}
          disabled={disabled}
        >
          <SelectTrigger className="!max-w-max">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bits.map(({ text, value, key }) => (
              <SelectItem key={key} value={value}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="success"
          onClick={buttonClick}
          disabled={disabled}
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
