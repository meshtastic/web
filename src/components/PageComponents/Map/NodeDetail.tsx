import { Separator } from "@components/UI/Seperator.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { formatQuantity } from "@core/utils/string.ts";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Protobuf } from "@meshtastic/core";
import type { Protobuf as ProtobufType } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import {
  BatteryChargingIcon,
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  Dot,
  LockIcon,
  LockOpenIcon,
  MessageSquareIcon,
  MountainSnow,
  Star,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";

export interface NodeDetailProps {
  node: ProtobufType.Mesh.NodeInfo;
}

export const NodeDetail = ({ node }: NodeDetailProps) => {
  const { setChatType, setActiveChat } = useAppStore();
  const { setActivePage } = useDevice();
  const name = node.user?.longName || `!${numberToHexUnpadded(node.num)}`;
  const shortName = node.user?.shortName ?? "UNK";
  const hwModel = node.user?.hwModel ?? 0;
  const hardwareType =
    Protobuf.Mesh.HardwareModel[hwModel]?.replaceAll("_", " ") ?? `${hwModel}`;

  function handleDirectMessage() {
    setChatType("direct");
    setActiveChat(node.num);
    setActivePage("messages");
  }

  return (
    <div className="dark:text-slate-900 p-1">
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-2 min-w-6 pt-1">
          <Avatar text={shortName} />

          <div>            

            {node.user?.publicKey && node.user?.publicKey.length > 0
              ? (
                <LockIcon
                  className="text-green-600 mb-1.5"
                  size={12}
                  strokeWidth={3}
                  aria-label="Public Key Enabled"
                />
              )
              : (
                <LockOpenIcon
                  className="text-yellow-500 mb-1.5"
                  size={12}
                  strokeWidth={3}
                  aria-label="No Public Key"
                />
              )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <MessageSquareIcon 
                    size={14}
                    onClick={handleDirectMessage}
                    className="cursor-pointer hover:text-blue-500"
                    title="Send Message"
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent
                    className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
                    side="top"
                    align="center"
                    sideOffset={5}
                  >
                    Direct Message {shortName}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>

            <Star
              fill={node.isFavorite ? "black" : "none"}
              size={15}
              aria-label={node.isFavorite ? "Favorite" : "Not a Favorite"}
            />
          </div>
        </div>

        <div>
          <Heading as="h5">{name}</Heading>

          {hardwareType !== "UNSET" && <Subtle>{hardwareType}</Subtle>}

          {!!node.deviceMetrics?.batteryLevel && (
            <div
              className="flex items-center gap-1 mt-0.5"
              title={`${node.deviceMetrics?.voltage?.toPrecision(3) ?? "Unknown"
                } volts`}
            >
              {node.deviceMetrics?.batteryLevel > 100
                ? <BatteryChargingIcon size={22} />
                : node.deviceMetrics?.batteryLevel > 80
                  ? <BatteryFullIcon size={22} />
                  : node.deviceMetrics?.batteryLevel > 20
                    ? <BatteryMediumIcon size={22} />
                    : <BatteryLowIcon size={22} />}
              <Subtle aria-label="Battery">
                {node.deviceMetrics?.batteryLevel > 100
                  ? "Charging"
                  : `${node.deviceMetrics?.batteryLevel}%`}
              </Subtle>
            </div>
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
                  Heard <TimeAgo timestamp={node.lastHeard * 1000} />
                </div>
              )}
            </div>
            {node.viaMqtt && (
              <div style={{ color: "#660066" }} className="font-medium">
                MQTT
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-1" />

      <div className="flex mt-2 text-sm">
        <div className="flex items-center grow">
          <div className="border-2 border-slate-900 rounded-sm px-0.5 mr-1">
            {Number.isNaN(node.hopsAway) ? "?" : node.hopsAway}
          </div>
          <div>{node.hopsAway === 1 ? "Hop" : "Hops"}</div>
        </div>
        {node.position?.altitude && (
          <div className="flex items-center grow">
            <MountainSnow
              size={15}
              className="ml-2 mr-1"
              aria-label="Elevation"
            />
            <div>
              {formatQuantity(node.position?.altitude, {
                one: "meter",
                other: "meters",
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex mt-2">
        {!!node.deviceMetrics?.channelUtilization && (
          <div className="grow">
            <div>Channel Util</div>
            <Mono>
              {node.deviceMetrics?.channelUtilization.toPrecision(3)}%
            </Mono>
          </div>
        )}
        {!!node.deviceMetrics?.airUtilTx && (
          <div className="grow">
            <div>Airtime Util</div>
            <Mono>{node.deviceMetrics?.airUtilTx.toPrecision(3)}%</Mono>
          </div>
        )}
      </div>

      {node.snr !== 0 && (
        <div className="mt-2">
          <div>SNR</div>
          <Mono className="flex items-center text-xs">
            {node.snr}db
            <Dot />
            {Math.min(Math.max((node.snr + 10) * 5, 0), 100)}%
            <Dot />
            {(node.snr + 10) * 5}raw
          </Mono>
        </div>
      )}
    </div>
  );
};
