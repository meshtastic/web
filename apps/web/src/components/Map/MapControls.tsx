import { IconButton } from "@components/UI/IconButton.tsx";
import { cn } from "@core/utils/cn.ts";
import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface MapControlsProps {
  /** Omitted when this device has no position. */
  onCenter?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}

const controlClass =
  "border border-input bg-surface text-primary shadow-floating hover:bg-raised";

/** Center-on-device and zoom buttons, 44px for touch. */
export const MapControls = ({
  onCenter,
  onZoomIn,
  onZoomOut,
  className,
}: MapControlsProps) => {
  const { t } = useTranslation("map");
  return (
    <fieldset
      className={cn(
        "m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0",
        className,
      )}
    >
      <legend className="sr-only">{t("controls.label")}</legend>
      {onCenter ? (
        <IconButton
          aria-label={t("controls.center")}
          size="touch"
          className={cn(controlClass, "text-accent")}
          icon={<LocateFixedIcon className="size-5" />}
          onClick={onCenter}
        />
      ) : null}
      <IconButton
        aria-label={t("controls.zoomIn")}
        size="touch"
        className={controlClass}
        icon={<PlusIcon className="size-5" />}
        onClick={onZoomIn}
      />
      <IconButton
        aria-label={t("controls.zoomOut")}
        size="touch"
        className={controlClass}
        icon={<MinusIcon className="size-5" />}
        onClick={onZoomOut}
      />
    </fieldset>
  );
};
