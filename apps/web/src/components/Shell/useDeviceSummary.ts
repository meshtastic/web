import { useLocalRadioManaged } from "@core/hooks/useLocalRadioManaged.ts";
import { useLocalNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import { useDevice, useDisplayedConnection } from "@core/stores";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type DeviceSummary, deriveDeviceSummary } from "./deviceSummary.ts";

/**
 * The connected radio, as the rail, device card and device menu show it;
 * the local one even while another node's settings are open.
 */
export function useDeviceSummary(): DeviceSummary {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language;
  const myNode = useLocalNodeAsProto();
  const device = useDevice();
  const { metadata } = useRemoteSettings()?.local ?? device;
  const connection = useDisplayedConnection();
  const firmwareVersion = metadata.get(0)?.firmwareVersion;
  const managed = useLocalRadioManaged();

  return useMemo(() => {
    const summary = deriveDeviceSummary({
      myNode,
      firmwareVersion,
      connection,
      fallbackName: (last4) => t("fallbackName", { last4 }),
      unknownName: t("unknown.longName"),
      locale,
    });
    return managed ? { ...summary, managed } : summary;
  }, [myNode, firmwareVersion, connection, t, locale, managed]);
}
