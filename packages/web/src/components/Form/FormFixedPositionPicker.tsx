import type {
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { FixedPositionPicker } from "@components/PageComponents/Settings/FixedPositionPicker.tsx";
import type { FieldValues, Path } from "react-hook-form";
import type { Protobuf } from "@meshtastic/core";

interface DisabledBy<T> {
  fieldName: Path<T>;
  selector?: number;
  invert?: boolean;
}

export interface FixedPositionPickerFieldProps<T> {
  type: "fixedPositionPicker";
  name: Path<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledBy?: DisabledBy<T>[];
  currentPosition?: {
    latitudeI?: number;
    longitudeI?: number;
    altitude?: number;
  };
  isEnabled: boolean;
  onSetPosition: (message: Protobuf.Admin.AdminMessage) => void;
  onRequestUpdate: (message: Protobuf.Admin.AdminMessage) => void;
}

export function FixedPositionPickerInput<T extends FieldValues>({
  field,
}: GenericFormElementProps<T, FixedPositionPickerFieldProps<T>>) {
  return (
    <FixedPositionPicker
      currentPosition={field.currentPosition}
      isEnabled={field.isEnabled}
      onSetPosition={field.onSetPosition}
      onRequestUpdate={field.onRequestUpdate}
    />
  );
}
