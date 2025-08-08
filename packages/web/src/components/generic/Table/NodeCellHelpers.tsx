import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { LockIcon, LockOpenIcon } from "lucide-react";
import type { JSX } from "react";
import { base16 } from "rfc4648";

// Helper function to format position
const formatPosition = (position?: Protobuf.Mesh.Position) => {
  if (!position || (!position.latitudeI && !position.longitudeI)) {
    return "Unknown";
  }
  const lat = position.latitudeI ? (position.latitudeI * 1e-7).toFixed(6) : "0";
  const lng = position.longitudeI
    ? (position.longitudeI * 1e-7).toFixed(6)
    : "0";
  return `${lat}, ${lng}`;
};

// Helper function to format battery level
const formatBatteryLevel = (
  deviceMetrics?: Protobuf.Telemetry.DeviceMetrics,
) => {
  if (!deviceMetrics?.batteryLevel) {
    return "Unknown";
  }
  return `${deviceMetrics.batteryLevel}%`;
};

// Helper function to format uptime
const formatUptime = (deviceMetrics?: Protobuf.Telemetry.DeviceMetrics) => {
  if (!deviceMetrics?.uptimeSeconds) {
    return "Unknown";
  }
  const seconds = deviceMetrics.uptimeSeconds;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const getNodeCellData = (
  node: Protobuf.Mesh.NodeInfo,
  columnKey: string,
  t: (key: string) => string,
  currentLanguage?: { code: string },
  hasNodeError?: (num: number) => boolean,
  handleNodeInfoDialog?: (num: number) => void,
): { content: JSX.Element; sortValue: string | number } => {
  switch (columnKey) {
    case "avatar":
      return {
        content: (
          <Avatar
            text={node.user?.shortName ?? t("unknown.shortName")}
            showFavorite={node.isFavorite}
            showError={hasNodeError?.(node.num) ?? false}
          />
        ),
        sortValue: node.user?.shortName ?? "",
      };

    case "longName":
      return {
        content: (
          <h1
            onMouseDown={() => handleNodeInfoDialog?.(node.num)}
            onKeyUp={(evt) => {
              evt.key === "Enter" && handleNodeInfoDialog?.(node.num);
            }}
            className="cursor-pointer underline ml-2 whitespace-break-spaces"
          >
            {node.user?.longName ?? numberToHexUnpadded(node.num)}
          </h1>
        ),
        sortValue: node.user?.longName ?? numberToHexUnpadded(node.num),
      };

    case "shortName":
      return {
        content: <Mono>{node.user?.shortName ?? t("unknown.shortName")}</Mono>,
        sortValue: node.user?.shortName ?? "",
      };

    case "nodeId":
      return {
        content: <Mono>{numberToHexUnpadded(node.num)}</Mono>,
        sortValue: node.num,
      };

    case "connection": {
      const connectionText =
        node.hopsAway !== undefined
          ? node?.viaMqtt === false && node.hopsAway === 0
            ? t("nodesTable.connectionStatus.direct")
            : `${node.hopsAway?.toString()} ${
                (node.hopsAway ?? 0 > 1)
                  ? t("unit.hop.plural")
                  : t("unit.hops_one")
              } ${t("nodesTable.connectionStatus.away")}`
          : t("nodesTable.connectionStatus.unknown");

      const mqttText =
        node?.viaMqtt === true ? t("nodesTable.connectionStatus.viaMqtt") : "";

      return {
        content: (
          <Mono className="w-16">
            {connectionText}
            {mqttText}
          </Mono>
        ),
        sortValue: node.hopsAway ?? Number.MAX_SAFE_INTEGER,
      };
    }

    case "lastHeard":
      return {
        content: (
          <Mono>
            {node.lastHeard === 0 ? (
              <p>{t("nodesTable.lastHeardStatus.never")}</p>
            ) : (
              <TimeAgo
                timestamp={node.lastHeard * 1000}
                locale={currentLanguage?.code}
              />
            )}
          </Mono>
        ),
        sortValue: node.lastHeard,
      };

    case "encryption":
      return {
        content: (
          <Mono>
            {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
              <LockIcon className="text-green-600 mx-auto" />
            ) : (
              <LockOpenIcon className="text-yellow-300 mx-auto" />
            )}
          </Mono>
        ),
        sortValue: "",
      };

    case "snr":
      return {
        content: (
          <Mono>
            {node.snr}
            {t("unit.dbm")}/{Math.min(Math.max((node.snr + 10) * 5, 0), 100)}
            %/{(node.snr + 10) * 5}
            {t("unit.raw")}
          </Mono>
        ),
        sortValue: node.snr,
      };

    case "model": {
      const modelName =
        Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0] ?? "Unknown";
      return {
        content: <Mono>{modelName}</Mono>,
        sortValue: modelName,
      };
    }

    case "macAddress": {
      const macAddress =
        base16
          .stringify(node.user?.macaddr ?? [])
          .match(/.{1,2}/g)
          ?.join(":") ?? t("unknown.shortName");

      return {
        content: <Mono>{macAddress}</Mono>,
        sortValue: macAddress,
      };
    }

    case "role": {
      const roleName =
        Protobuf.Config.Config_DeviceConfig_Role[node.user?.role ?? 0] ??
        "Unknown";
      return {
        content: <Mono>{roleName.replace(/_/g, " ")}</Mono>,
        sortValue: roleName,
      };
    }

    case "batteryLevel":
      return {
        content: <Mono>{formatBatteryLevel(node.deviceMetrics)}</Mono>,
        sortValue: node.deviceMetrics?.batteryLevel ?? 0,
      };

    case "channelUtilization":
      return {
        content: (
          <Mono>
            {node.deviceMetrics?.channelUtilization
              ? `${node.deviceMetrics.channelUtilization.toFixed(1)}%`
              : "Unknown"}
          </Mono>
        ),
        sortValue: node.deviceMetrics?.channelUtilization ?? 0,
      };

    case "airtimeUtilization":
      return {
        content: (
          <Mono>
            {node.deviceMetrics?.airUtilTx
              ? `${node.deviceMetrics.airUtilTx.toFixed(1)}%`
              : "Unknown"}
          </Mono>
        ),
        sortValue: node.deviceMetrics?.airUtilTx ?? 0,
      };

    case "uptime":
      return {
        content: <Mono>{formatUptime(node.deviceMetrics)}</Mono>,
        sortValue: node.deviceMetrics?.uptimeSeconds ?? 0,
      };

    case "position":
      return {
        content: (
          <Mono className="text-xs">{formatPosition(node.position)}</Mono>
        ),
        sortValue: formatPosition(node.position),
      };

    default:
      return {
        content: <Mono>Unknown</Mono>,
        sortValue: "",
      };
  }
};
