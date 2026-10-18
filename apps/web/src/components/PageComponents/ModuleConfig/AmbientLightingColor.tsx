import type { AmbientLightingValidation } from "@app/validation/moduleConfig/ambientLighting.ts";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const clampByte = (value: unknown): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(255, Math.max(0, n));
};

const toHex = (value: unknown) =>
  clampByte(value).toString(16).padStart(2, "0");

export const rgbToHex = (red: unknown, green: unknown, blue: unknown) =>
  `#${toHex(red)}${toHex(green)}${toHex(blue)}`;

export const hexToRgb = (hex: string) => {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return undefined;
  const [, r = "0", g = "0", b = "0"] = match;
  return {
    red: Number.parseInt(r, 16),
    green: Number.parseInt(g, 16),
    blue: Number.parseInt(b, 16),
  };
};

interface AmbientLightingColorProps {
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;
}

/**
 * Android's RGB colour picker for the LED, plus its "Advanced" toggle that
 * reveals the separate Red, Green and Blue fields. The picker writes all
 * three; its change event bubbles up to the form, which stages them.
 */
export const AmbientLightingColor = ({
  showAdvanced,
  onShowAdvancedChange,
}: AmbientLightingColorProps) => {
  const { t } = useTranslation("moduleConfig");
  const { control, setValue } = useFormContext<AmbientLightingValidation>();
  const [red, green, blue] = useWatch({
    control,
    name: ["red", "green", "blue"],
  });
  const hex = rgbToHex(red, green, blue);

  return (
    <>
      <FieldWrapper
        label={t("ambientLighting.color.label")}
        fieldName="ambientLightingColor"
        description={t("ambientLighting.color.description")}
      >
        <div className="flex items-center gap-3">
          <input
            id="ambientLightingColor"
            type="color"
            value={hex}
            onChange={(e) => {
              const rgb = hexToRgb(e.target.value);
              if (!rgb) return;
              const options = { shouldDirty: true, shouldValidate: true };
              setValue("red", rgb.red, options);
              setValue("green", rgb.green, options);
              setValue("blue", rgb.blue, options);
            }}
            className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-transparent p-1 dark:border-slate-500"
          />
          <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
            {hex.toUpperCase()}
          </span>
        </div>
      </FieldWrapper>
      <div className="flex items-center gap-3 pt-6 sm:pt-5">
        <Switch
          id="ambientLightingAdvanced"
          checked={showAdvanced}
          onCheckedChange={onShowAdvancedChange}
        />
        <Label htmlFor="ambientLightingAdvanced">
          {t("ambientLighting.advanced.label")}
        </Label>
      </div>
    </>
  );
};
