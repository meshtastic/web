import * as React from "react";

import { Button, type ButtonVariant } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";

export interface ActionButton {
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  variant: ButtonVariant;
  className?: string;
}
[];

export interface GeneratorProps extends React.BaseHTMLAttributes<HTMLElement> {
  type: "text" | "password";
  devicePSKBitCount?: number;
  value: string;
  id: string;
  variant: "default" | "invalid";
  actionButtons: ActionButton[];
  bits?: { text: string; value: string; key: string }[];
  selectChange: (event: string) => void;
  inputChange: (
    event: React.ChangeEventHandler<HTMLInputElement> | undefined,
  ) => void;
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
  disabled?: boolean;
}

const Generator = (
  {
    type,
    devicePSKBitCount,
    id = "pskInput",
    variant,
    value,
    actionButtons,
    bits = [
      { text: "256 bit", value: "32", key: "bit256" },
      { text: "128 bit", value: "16", key: "bit128" },
      { text: "8 bit", value: "1", key: "bit8" },
      { text: "Empty", value: "0", key: "empty" },
    ],
    selectChange,
    inputChange,
    disabled,
    showPasswordToggle,
    showCopyButton,
    ...props
  }: GeneratorProps,
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
        id={id}
        variant={variant}
        value={value}
        onChange={inputChange}
        disabled={disabled}
        ref={inputRef}
        showCopyButton={showCopyButton}
        showPasswordToggle={showPasswordToggle}
      />
      <Select
        value={devicePSKBitCount?.toString()}
        onValueChange={(e) => selectChange(e)}
        disabled={disabled}
      >
        <SelectTrigger className="w-36 ml-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-36">
          {bits.map(({ text, value, key }) => (
            <SelectItem key={key} value={value} className="w-36">
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex ml-2 space-x-2">
        {actionButtons?.map(({ text, onClick, variant, className }) => (
          <Button
            key={text}
            type="button"
            onClick={onClick}
            disabled={disabled}
            variant={variant}
            className={className}
            {...props}
          >
            {text}
          </Button>
        ))}
      </div>
    </>
  );
};
Generator.displayName = "Button";

export { Generator };
