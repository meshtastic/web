import { Separator } from "@app/components/UI/Seperator";
import { H5 } from "@app/components/UI/Typography/H5.tsx";
import { Subtle } from "@app/components/UI/Typography/Subtle.tsx";
import { formatQuantity } from "@app/core/utils/string";
import { Avatar } from "@components/UI/Avatar";
import { Mono } from "@components/generic/Mono.tsx";
import { TimeAgo } from "@components/generic/Table/tmp/TimeAgo.tsx";
import { Protobuf } from "@meshtastic/js";
import type { Protobuf as ProtobufType } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import {
  BatteryChargingIcon,
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  Dot,
  LockIcon,
  LockOpenIcon,
  MountainSnow,
  Star,
} from "lucide-react";

export interface NodeDetailProps {
  node: ProtobufType.Mesh.NodeInfo;
}

export const NodeDetail = ({ node }: NodeDetailProps) => {
  const name = node.user?.longName || `!${numberToHexUnpadded(node.num)}`;
  const hwModel = node.user?.hwModel ?? 0;
  const hardwareType =
    Protobuf.Mesh.HardwareModel[hwModel]?.replaceAll("_", " ") ?? `${hwModel}`;

  return (
    <div className="dark:text-black p-1">
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-2 min-w-6 pt-1">
          <Avatar text={node.user?.shortName} />

          <div>
            {node.user?.publicKey && node.user?.publicKey.length > 0 ? (
              <LockIcon
                className="text-green-600"
                size={12}
                strokeWidth={3}
                aria-label="Public Key Enabled"
              />
            ) : (
              <LockOpenIcon
                className="text-yellow-500"
                size={12}
                strokeWidth={3}
                aria-label="No Public Key"
              />
            )}
          </div>

          <Star
            fill={node.isFavorite ? "black" : "none"}
            size={15}
            aria-label={node.isFavorite ? "Favorite" : "Not a Favorite"}
          />
        </div>

        <div>
          <H5>{name}</H5>

          {hardwareType !== "UNSET" && <Subtle>{hardwareType}</Subtle>}

          {!!node.deviceMetrics?.batteryLevel && (
            <div
              className="flex items-center gap-1"
              title={`${
                node.deviceMetrics?.voltage?.toPrecision(3) ?? "Unknown"
              } volts`}
            >
              {node.deviceMetrics?.batteryLevel > 100 ? (
                <BatteryChargingIcon size={22} />
              ) : node.deviceMetrics?.batteryLevel > 80 ? (
                <BatteryFullIcon size={22} />
              ) : node.deviceMetrics?.batteryLevel > 20 ? (
                <BatteryMediumIcon size={22} />
              ) : (
                <BatteryLowIcon size={22} />
              )}
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
        <div className="flex items-center flex-grow">
          <div className="border-2 border-black rounded px-0.5 mr-1">
            {Number.isNaN(node.hopsAway) ? "?" : node.hopsAway}
          </div>
          <div>{node.hopsAway === 1 ? "Hop" : "Hops"}</div>
        </div>
        {node.position?.altitude && (
          <div className="flex items-center flex-grow">
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
          <div className="flex-grow">
            <div>Channel Util</div>
            <Mono>
              {node.deviceMetrics?.channelUtilization.toPrecision(3)}%
            </Mono>
          </div>
        )}
        {!!node.deviceMetrics?.airUtilTx && (
          <div className="flex-grow">
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
