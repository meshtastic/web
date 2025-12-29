import { useNodes } from "@data/hooks";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useDeviceContext } from "@state/index.ts";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper";

export interface LocationResponseDialogProps {
  location: Types.PacketMetadata<Protobuf.Mesh.Position> | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationResponseDialog = ({
  location,
  open,
  onOpenChange,
}: LocationResponseDialogProps) => {
  const { t } = useTranslation("dialog");
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);

  const from = allNodes.find((n) => n.nodeNum === (location?.from ?? 0));
  const longName =
    from?.longName ??
    (from ? `!${numberToHexUnpadded(from.nodeNum)}` : t("unknown.shortName"));
  const shortName =
    from?.shortName ??
    (from
      ? `${numberToHexUnpadded(from.nodeNum).substring(0, 4)}`
      : t("unknown.shortName"));

  const position = location?.data;

  const hasCoordinates =
    position &&
    typeof position.latitudeI === "number" &&
    typeof position.longitudeI === "number" &&
    typeof position.altitude === "number";

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="info"
      title={t("locationResponse.title", {
        interpolation: { escapeValue: false },
        identifier: `${longName} (${shortName})`,
      })}
    >
      {hasCoordinates ? (
        <div className="ml-5 flex">
          <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
            <p>
              {t("locationResponse.coordinates")}
              <a
                className="text-blue-500 dark:text-blue-400"
                href={`https://www.openstreetmap.org/?mlat=${
                  position.latitudeI ?? 0 / 1e7
                }&mlon=${position.longitudeI ?? 0 / 1e7}&layers=N`}
                target="_blank"
                rel="noreferrer"
              >
                {" "}
                {position.latitudeI ?? 0 / 1e7},{" "}
                {position.longitudeI ?? 0 / 1e7}
              </a>
            </p>
            <p>
              {t("locationResponse.altitude")} {position.altitude}
              {(position.altitude ?? 0) < 1
                ? t("unit.meter.one")
                : t("unit.meter.plural")}
            </p>
          </span>
        </div>
      ) : (
        <p className="text-textPrimary">
          {t("locationResponse.noCoordinates")}
        </p>
      )}
    </DialogWrapper>
  );
};
