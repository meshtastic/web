import { TOTAL_CONFIG_COUNT, useDeviceStore } from "@state/device";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/shallow";

/**
 * Shows detailed connection progress during device configuration.
 * Parent component should only render this when connection.status === "configuring"
 */
export function ConfigProgressIndicator() {
  const { t } = useTranslation("connections");
  const configProgress = useDeviceStore(
    useShallow((s) => s.device?.configProgress),
  );

  if (!configProgress) {
    return null;
  }

  const received = configProgress.receivedConfigs.size;
  const phase = configProgress.phase;
  const lastConfig = configProgress.lastReceivedConfig;

  // Get the main status message based on phase
  const getStatusMessage = () => {
    switch (phase) {
      case "initializing":
        return t(
          "connectionProgress.initializing",
          "Initializing connection...",
        );
      case "waitingForDevice":
        return t(
          "connectionProgress.waitingForDevice",
          "Waiting for device response...",
        );
      case "receivingConfig":
        return t("connectionProgress.receivingConfig", {
          received,
          total: TOTAL_CONFIG_COUNT,
          defaultValue: `Receiving configuration (${received}/${TOTAL_CONFIG_COUNT})...`,
        });
      case "syncingNetwork":
        return t(
          "connectionProgress.syncingNetwork",
          "Syncing network data...",
        );
      case "connected":
        return t("connectionProgress.connected", "Connected");
      default:
        return t("connectionProgress.title", "Connecting");
    }
  };

  // Get detail message about last received config
  const getDetailMessage = () => {
    if (phase === "receivingConfig" && lastConfig) {
      return t(`connectionProgress.${lastConfig}`, lastConfig);
    }
    return null;
  };

  const statusMessage = getStatusMessage();
  const detailMessage = getDetailMessage();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
        {statusMessage}
      </span>
      {detailMessage && (
        <span className="text-xs text-amber-500/80 dark:text-amber-400/60">
          {detailMessage}
        </span>
      )}
    </div>
  );
}
