import {
  DEFAULT_TARGET,
  type MeshBeaconTargetValidation,
  type MeshBeaconValidation,
  selectTargetChannel,
  TARGET_DEFAULT,
} from "@app/validation/moduleConfig/meshBeacon.ts";
import { Button } from "@components/UI/Button.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { Protobuf } from "@meshtastic/sdk";
import { PlusIcon } from "lucide-react";
import {
  type SubmitHandler,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

const presetName = (preset: number) =>
  (Protobuf.Config.Config_LoRaConfig_ModemPreset[preset] ?? String(preset))
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(" ");

interface Option {
  value: number;
  label: string;
  disabled?: boolean;
}

interface MeshBeaconTargetsProps {
  onSubmit: SubmitHandler<MeshBeaconValidation>;
  /** The radio's channels a target may use, by channel index. */
  channelOptions: Option[];
  /** Presets legal in the radio's region. */
  presets: readonly ModemPreset[];
  /** The radio's own preset, preselected when a row first gets a channel. */
  currentPreset: ModemPreset | undefined;
  disabled?: boolean;
}

/**
 * Editor for MeshBeaconConfig.broadcast_targets, after Android's
 * BroadcastTargetsCard: one row per target with a channel and a transmit
 * preset, each with a "Default" choice, a Remove button, and Add target.
 * The list never drops below one row; removing the last one resets it.
 */
export const MeshBeaconTargets = ({
  onSubmit,
  channelOptions,
  presets,
  currentPreset,
  disabled,
}: MeshBeaconTargetsProps) => {
  const { t } = useTranslation("moduleConfig");
  const { control, handleSubmit } = useFormContext<MeshBeaconValidation>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "broadcastTargets",
  });
  const targets = useWatch({ control, name: "broadcastTargets" }) ?? [];

  // Selects and buttons don't raise a change event on the form, so stage
  // their edits here.
  const stage = () => {
    void handleSubmit(onSubmit)();
  };

  const defaultOption: Option = {
    value: TARGET_DEFAULT,
    label: t("meshBeacon.targets.default"),
  };

  return (
    <div className="space-y-6 pt-6 sm:pt-5">
      {fields.map((field, index) => {
        const target = targets[index] ?? DEFAULT_TARGET;
        // Keep a stored value the radio no longer offers visible, but not
        // pickable, so a select never renders blank.
        const channels: Option[] = [defaultOption, ...channelOptions];
        if (!channels.some((o) => o.value === target.channelIndex)) {
          channels.push({
            value: target.channelIndex,
            label: t("meshBeacon.targets.channelNumber", {
              index: target.channelIndex,
            }),
            disabled: true,
          });
        }
        const presetOptions: Option[] = [
          defaultOption,
          ...presets.map((p) => ({ value: p, label: presetName(p) })),
        ];
        if (!presetOptions.some((o) => o.value === target.preset)) {
          presetOptions.push({
            value: target.preset,
            label: presetName(target.preset),
            disabled: true,
          });
        }
        const channelId = `broadcastTargets.${index}.channelIndex`;
        const presetId = `broadcastTargets.${index}.preset`;

        return (
          <div
            key={field.id}
            className="space-y-3 border-b border-slate-200 pb-6 last:border-b-0 dark:border-slate-700"
          >
            <p className="text-sm font-medium">
              {t("meshBeacon.targets.target", { number: index + 1 })}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={channelId}>
                  {t("meshBeacon.targets.channel")}
                </Label>
                <TargetSelect
                  id={channelId}
                  value={target.channelIndex}
                  options={channels}
                  disabled={disabled}
                  onChange={(channelIndex) => {
                    update(
                      index,
                      selectTargetChannel(target, channelIndex, currentPreset),
                    );
                    stage();
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={presetId}>
                  {t("meshBeacon.targets.preset")}
                </Label>
                <TargetSelect
                  id={presetId}
                  value={target.preset}
                  options={presetOptions}
                  disabled={disabled}
                  onChange={(preset) => {
                    update(index, {
                      ...target,
                      preset: preset as MeshBeaconTargetValidation["preset"],
                    });
                    stage();
                  }}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                if (fields.length === 1) {
                  update(0, { ...DEFAULT_TARGET });
                } else {
                  remove(index);
                }
                stage();
              }}
            >
              {t("meshBeacon.targets.remove")}
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="subtle"
        disabled={disabled}
        onClick={() => {
          append({ ...DEFAULT_TARGET });
          stage();
        }}
      >
        <PlusIcon className="mr-2 size-4" />
        {t("meshBeacon.targets.add")}
      </Button>
    </div>
  );
};

interface TargetSelectProps {
  id: string;
  value: number;
  options: Option[];
  disabled?: boolean;
  onChange: (value: number) => void;
}

const TargetSelect = ({
  id,
  value,
  options,
  disabled,
  onChange,
}: TargetSelectProps) => (
  <Select
    value={value.toString()}
    onValueChange={(next) => onChange(Number.parseInt(next, 10))}
    disabled={disabled}
  >
    <SelectTrigger id={id}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value.toString()}
          disabled={option.disabled}
        >
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
