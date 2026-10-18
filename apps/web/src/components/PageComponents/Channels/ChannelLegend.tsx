import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import {
  CloudDownloadIcon,
  CloudUploadIcon,
  InfoIcon,
  type LucideIcon,
  MapPinIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SecurityIcon } from "./ChannelCard.tsx";
import type { SecurityState } from "./channelStaging.ts";

const FEATURE_ICONS: { key: string; icon: LucideIcon }[] = [
  { key: "location", icon: MapPinIcon },
  { key: "uplink", icon: CloudUploadIcon },
  { key: "downlink", icon: CloudDownloadIcon },
];

const SECURITY_STATES: SecurityState[] = [
  "secure",
  "insecureNoPrecise",
  "insecurePreciseOnly",
  "insecurePreciseMqtt",
];

function Meaning({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex w-5 shrink-0 justify-center">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {text}
        </span>
      </span>
    </li>
  );
}

/**
 * "Primary / Secondary" legend above the channel list. Clicking it explains
 * the roles and the card icons (Android's ChannelLegend + ChannelLegendDialog).
 */
export function ChannelLegend({
  supportsSecondaryChannelLocation,
}: {
  supportsSecondaryChannelLocation: boolean;
}) {
  const { t } = useTranslation("channels");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("legend.dialog.title")}
        className="flex w-full cursor-pointer items-center justify-evenly gap-4 rounded-md py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:hover:bg-slate-700/50"
      >
        <span className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
          <InfoIcon size={16} aria-hidden />
          {t("legend.primary")}
        </span>
        <span className="font-medium">{t("legend.secondary")}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh]">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>{t("legend.dialog.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("legend.dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <section className="flex flex-col gap-1">
            <h3 className="font-semibold text-green-700 dark:text-green-400">
              {t("legend.primary")}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              - {t("legend.dialog.primaryFeature")}
            </p>
          </section>
          <section className="flex flex-col gap-1">
            <h3 className="font-semibold">{t("legend.secondary")}</h3>
            <p className="text-sm">
              - {t("legend.dialog.secondaryNoTelemetry")}
            </p>
            <p className="text-sm">
              -{" "}
              {supportsSecondaryChannelLocation
                ? t("legend.dialog.secondaryPositionFeature")
                : t("legend.dialog.manualPositionRequest")}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">
              {t("legend.dialog.iconMeanings")}
            </h3>
            <ul className="flex flex-col gap-3">
              {FEATURE_ICONS.map(({ key, icon: Icon }) => (
                <Meaning
                  key={key}
                  icon={<Icon size={18} aria-hidden />}
                  title={t(`icons.${key}.label`)}
                  text={t(`icons.${key}.description`)}
                />
              ))}
              {SECURITY_STATES.map((state) => (
                <Meaning
                  key={state}
                  icon={<SecurityIcon state={state} />}
                  title={t(`security.${state}.label`)}
                  text={t(`security.${state}.description`)}
                />
              ))}
            </ul>
          </section>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("button.dismiss", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
