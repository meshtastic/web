import { Progress } from "@shared/components/ui/progress";
import {
  TOTAL_CONFIG_COUNT,
  getConfigProgressPercent,
  useDeviceStore,
} from "@state/device";
import { useTranslation } from "react-i18next";

/**
 * Shows config loading progress during device configuration.
 * Parent component should only render this when connection.status === "configuring"
 */
export function ConfigProgressIndicator() {
  const { t } = useTranslation("connections");
  const configProgress = useDeviceStore((s) => s.device?.configProgress);

  if (!configProgress) {
    return null;
  }

  const percent = getConfigProgressPercent(configProgress);
  const received = configProgress.receivedConfigs.size;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-amber-600 dark:text-amber-400">
        {t("configProgress", {
          received,
          total: TOTAL_CONFIG_COUNT,
          defaultValue: `Loading config ${received}/${TOTAL_CONFIG_COUNT}`,
        })}
      </span>
      <Progress
        value={percent}
        className="h-1.5 w-full bg-amber-200 dark:bg-amber-900"
      />
    </div>
  );
}
