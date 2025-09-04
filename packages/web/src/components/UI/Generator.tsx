import { Button, type ButtonVariant } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { useTranslation } from "react-i18next";

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
  variant: "default" | "invalid" | "dirty";
  actionButtons: ActionButton[];
  bits?: { text: string; value: string; key: string }[];
  selectChange: (event: string) => void;
  inputChange: React.ChangeEventHandler<HTMLInputElement>;
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
  disabled?: boolean;
}

const Generator = ({
  type,
  devicePSKBitCount,
  id = "pskInput",
  variant,
  value,
  actionButtons,
  bits,
  selectChange,
  inputChange,
  disabled,
  showPasswordToggle,
  showCopyButton,
  ...props
}: GeneratorProps) => {
  const { t } = useTranslation();

  const passwordRequiredBitSize = bits
    ? bits
    : [
        {
          text: t("security.256bit"),
          value: "32",
          key: "bit256",
        },
        {
          text: t("security.128bit"),
          value: "16",
          key: "bit128",
        },
        {
          text: t("security.8bit"),
          value: "1",
          key: "bit8",
        },
        {
          text: t("security.0bit"),
          value: "0",
          key: "bit0",
        },
      ];

  return (
    <>
      <Input
        type={type}
        id={id}
        variant={variant}
        value={value}
        onChange={inputChange}
        disabled={disabled}
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
          {passwordRequiredBitSize.map(({ text, value, key }) => (
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
