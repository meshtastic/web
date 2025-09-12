import BatteryStatus from "@components/BatteryStatus.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { formatQuantity } from "@core/utils/string.ts";
import type { Protobuf as ProtobufType } from "@meshtastic/core";
import { Protobuf } from "@meshtastic/core";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { useNavigate } from "@tanstack/react-router";
import {
  Dot,
  LockIcon,
  LockOpenIcon,
  MessageSquareIcon,
  MountainSnow,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface NodeDetailProps {
  node: ProtobufType.Mesh.NodeInfo;
}

export const NodeDetail = ({ node }: NodeDetailProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("nodes");
  const name = node.user?.longName ?? t("unknown.shortName");
  const shortName = node.user?.shortName ?? t("unknown.shortName");
  const hwModel = node.user?.hwModel ?? 0;
  const rawHardwareType = Protobuf.Mesh.HardwareModel[hwModel] as
    | keyof typeof Protobuf.Mesh.HardwareModel
    | undefined;
  const hardwareType = rawHardwareType
    ? rawHardwareType === "UNSET"
      ? t("unset")
      : rawHardwareType.replaceAll("_", " ")
    : `${hwModel}`;
  function handleDirectMessage() {
    navigate({ to: `/messages/direct/${node.num}` });
  }

  return (
    <div className="p-1 text-slate-900">
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-2 min-w-6 pt-1">
          <Avatar text={shortName} size="sm" />

          <div
            onFocusCapture={(e) => {
              // Required to prevent DM tooltip auto-appearing on creation
              e.stopPropagation();
            }}
          >
            {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
              <LockIcon
                className="text-green-600 mb-1.5"
                size={12}
                strokeWidth={3}
                aria-label={t("nodeDetail.publicKeyEnabled.label")}
              />
            ) : (
              <LockOpenIcon
                className="text-yellow-500 mb-1.5"
                size={12}
                strokeWidth={3}
                aria-label={t("nodeDetail.noPublicKey.label")}
              />
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <MessageSquareIcon
                    size={14}
                    onClick={handleDirectMessage}
                    className="cursor-pointer hover:text-blue-500"
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
                    side="top"
                    align="center"
                    sideOffset={5}
                  >
                    {t("nodeDetail.directMessage.label", {
                      shortName,
                    })}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>

            <Star
              fill={node.isFavorite ? "black" : "none"}
              size={15}
              aria-label={
                node.isFavorite
                  ? t("nodeDetail.favorite.label")
                  : t("nodeDetail.notFavorite.label")
              }
            />
          </div>
        </div>

        <div>
          <Heading as="h5">{name}</Heading>
          {hardwareType !== t("unset") && <Subtle>{hardwareType}</Subtle>}

          {!!node.deviceMetrics?.batteryLevel && (
            <BatteryStatus deviceMetrics={node.deviceMetrics} />
          )}

          <div className="flex gap-2 items-center">
            {node.user?.shortName && <div>"{node.user?.shortName}"</div>}
            {node.user?.id && <div>{node.user?.id}</div>}
          </div>

          <div
            className="flex gap-1"
            title={new Date(node.lastHeard * 1000).toLocaleString(
              navigator.language,
            )}
          >
            <div>
              {node.lastHeard > 0 && (
                <div>
                  {t("nodeDetail.status.heard")}{" "}
                  <TimeAgo timestamp={node.lastHeard * 1000} />
                </div>
              )}
            </div>
            {node.viaMqtt && (
              <div style={{ color: "#660066" }} className="font-medium">
                {t("nodeDetail.status.mqtt")}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-1" />

      <div className="flex mt-2 text-sm">
        <div className="flex items-center grow">
          <div className="border-2 border-slate-900 rounded-sm px-0.5 mr-1">
            {Number.isNaN(node.hopsAway)
              ? t("unit.hopsAway.unknown")
              : node.hopsAway}
          </div>
          <div>
            {node.hopsAway === 1 ? t("unit.hop.one") : t("unit.hop.plural")}
          </div>
        </div>
        {node.position?.altitude && (
          <div className="flex items-center grow">
            <MountainSnow
              size={15}
              className="ml-2 mr-1"
              aria-label={t("nodeDetail.elevation.label")}
            />
            <div>
              {formatQuantity(node.position?.altitude, {
                one: t("unit.meter.one"),
                other: t("unit.meter.plural"),
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex mt-2">
        {!!node.deviceMetrics?.channelUtilization && (
          <div className="grow">
            <div>{t("channelUtilization.short")}</div>
            <Mono>
              {node.deviceMetrics?.channelUtilization.toPrecision(3)}%
            </Mono>
          </div>
        )}
        {!!node.deviceMetrics?.airUtilTx && (
          <div className="grow">
            <div>{t("airtimeUtilization.short")}</div>
            <Mono className="text-gray-500">
              {node.deviceMetrics?.airUtilTx.toPrecision(3)}%
            </Mono>
          </div>
        )}
      </div>

      {node.snr !== 0 && (
        <div className="mt-2">
          <div>{t("unit.snr")}</div>
          <Mono className="flex items-center text-xs text-gray-500">
            {node.snr}
            {t("unit.dbm")}
            <Dot />
            {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%
            <Dot />
            {(node.snr + 10) * 5}
            {t("unit.raw")}
          </Mono>
        </div>
      )}
    </div>
  );
};
