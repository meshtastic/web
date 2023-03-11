import type { LucideIcon } from "lucide-react";
import { Button } from "./Button.js";

export interface ConfigSelectButtonProps {
  label: string;
  active?: boolean;
  value: number;
  setValue: (val: number) => void;
  element?: JSX.Element;
  onClick?: () => void;
}

export const ConfigSelectButton = ({
  label,
  active,
  value,
  setValue,
  element,
  onClick,
}: ConfigSelectButtonProps): JSX.Element => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className="w-full justify-between gap-2 my-[2px]"
  >
    {element && element}
    {label}
    <div className="flex">
      <Button
      onClick={(e) => {
        e.stopPropagation();
        setValue(Math.max(value - 1, 0));
      }}
      variant="outline"
      className="h-[20px] p-2 m-2"
      >
        -
      </Button>
      <div className="my-2 w-4">{value}</div>
      <Button
      onClick={(e) => {
        e.stopPropagation();
        setValue(value + 1);
      }}
      variant="outline"
      className="h-[20px] p-2  m-2"
      >
        +
      </Button>
    </div>
  </Button>
);
