import { Progress } from "@shared/components/ui/progress";
import {
  TOTAL_CONFIG_COUNT,
  getConfigProgressPercent,
  useDeviceStore,
} from "@state/device";
import { useTranslation } from "react-i18next";

interface ConfigProgressIndicatorProps {
  meshDeviceId: number | null;
}

export function ConfigProgressIndicator({
  meshDeviceId,
}: ConfigProgressIndicatorProps) {
  const { t } = useTranslation("connections");
  const device = useDeviceStore((s) =>
    meshDeviceId ? s.devices.get(meshDeviceId) : undefined,
  );

  if (!device || device.connectionPhase !== "configuring") {
    return null;
  }

  const progress = device.configProgress;
  const percent = getConfigProgressPercent(progress);
  const received = progress.receivedConfigs.size;

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
