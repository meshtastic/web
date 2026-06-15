import { Button } from "@components/UI/Button.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useIsRegionUnset } from "@meshtastic/sdk-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Mirrors Meshtastic-Android's `regionUnset` cue. A freshly-flashed device
 * has `Config.LoRa.region == UNSET` until the user picks one, and won't
 * transmit at all in that state. We surface a non-dismissable toast that
 * deep-links into the LoRa settings tab so first-time users land in the
 * right place without hunting through the menu.
 *
 * The toast appears as soon as the SDK reports `isRegionUnset == true`
 * (after the LoRa config packet arrives) and dismisses itself the moment
 * a real region is committed.
 */
export const RegionSetupReminder = (): null => {
  const isRegionUnset = useIsRegionUnset();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation("dialog");
  const dismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isRegionUnset) {
      dismissRef.current?.();
      dismissRef.current = null;
      return;
    }
    if (dismissRef.current) return;

    const { dismiss } = toast({
      title: t("regionSetup.title", { defaultValue: "Set your region" }),
      description: t("regionSetup.description", {
        defaultValue:
          "This device has no LoRa region configured and won't transmit until you pick one.",
      }),
      duration: Number.POSITIVE_INFINITY,
      action: (
        <Button
          type="button"
          variant="default"
          className="w-full"
          onClick={() => {
            dismiss();
            navigate({ to: "/settings/radio" });
          }}
        >
          {t("regionSetup.cta", { defaultValue: "Set region" })}
        </Button>
      ),
    });
    dismissRef.current = dismiss;

    return () => {
      dismiss();
      dismissRef.current = null;
    };
  }, [isRegionUnset, toast, navigate, t]);

  return null;
};
