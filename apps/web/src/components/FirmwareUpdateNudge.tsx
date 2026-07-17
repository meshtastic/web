import { Button } from "@components/UI/Button.tsx";
import { useTranslation } from "react-i18next";

interface FirmwareUpdateNudgeProps {
  currentVersion: string;
  latestStableVersion: string;
  onOpen: () => void;
}

const SystemUpdateAltIcon = () => (
  <svg
    aria-hidden="true"
    data-icon="system_update_alt"
    viewBox="0 0 24 24"
    className="size-5 text-sky-600 dark:text-sky-400"
  >
    <path d="M13 3h-2v10.17l-3.59-3.58L6 11l6 6 6-6-1.41-1.41L13 13.17V3zM5 19v2h14v-2H5z" />
  </svg>
);

export const FirmwareUpdateNudge = ({
  currentVersion,
  latestStableVersion,
  onOpen,
}: FirmwareUpdateNudgeProps) => {
  const { t } = useTranslation("ui");

  return (
    <div className="flex flex-col gap-3 rounded-md border border-sky-200 bg-sky-50 p-4 text-slate-900 dark:border-sky-900 dark:bg-slate-800 dark:text-slate-100">
      <div className="flex gap-3">
        <SystemUpdateAltIcon />
        <div className="space-y-1">
          <p className="font-semibold">{t("firmwareUpdate.title")}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("firmwareUpdate.description", {
              currentVersion,
              latestStableVersion,
            })}
          </p>
        </div>
      </div>
      <Button
        className="self-start"
        variant="outline"
        aria-label={t("firmwareUpdate.action.ariaLabel")}
        title={t("firmwareUpdate.action.hint")}
        onClick={onOpen}
      >
        {t("firmwareUpdate.action.label")}
      </Button>
    </div>
  );
};
