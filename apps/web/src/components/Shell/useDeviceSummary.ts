import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useDevice, useDisplayedConnection } from "@core/stores";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type DeviceSummary, deriveDeviceSummary } from "./deviceSummary.ts";

/** The connected radio, as the rail, device card and device menu show it. */
export function useDeviceSummary(): DeviceSummary {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language;
  const myNode = useMyNodeAsProto();
  const { metadata } = useDevice();
  const connection = useDisplayedConnection();
  const firmwareVersion = metadata.get(0)?.firmwareVersion;

  return useMemo(
    () =>
      deriveDeviceSummary({
        myNode,
        firmwareVersion,
        connection,
        fallbackName: (last4) => t("fallbackName", { last4 }),
        unknownName: t("unknown.longName"),
        locale,
      }),
    [myNode, firmwareVersion, connection, t, locale],
  );
}
