import { useDevice } from "@core/stores/deviceStore.ts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../UI/Dialog.tsx";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

export interface LocationResponseDialogProps {
  location: Types.PacketMetadata<Protobuf.Mesh.location> | undefined;
  open: boolean;
  onOpenChange: () => void;
}

export const LocationResponseDialog = ({
  location,
  open,
  onOpenChange,
}: LocationResponseDialogProps) => {
  const { t } = useTranslation("dialog");
  const { getNode } = useDevice();

  const from = getNode(location?.from ?? 0);
  const longName = from?.user?.longName ??
    (from ? `!${numberToHexUnpadded(from?.num)}` : t("unknown.shortName"));
  const shortName = from?.user?.shortName ??
    (from
      ? `${numberToHexUnpadded(from?.num).substring(0, 4)}`
      : t("unknown.shortName"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("locationResponse.title", {
              identifier: `${longName} (${shortName})`,
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="ml-5 flex">
            <span className="ml-4 border-l-2 border-l-backgroundPrimary pl-2 text-textPrimary">
              <p>
                {t("locationResponse.coordinates")}
                <a
                  className="text-blue-500 dark:text-blue-400"
                  href={`https://www.openstreetmap.org/?mlat=${
                    location?.data.latitudeI / 1e7
                  }&mlon=${location?.data.longitudeI / 1e7}&layers=N`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {location?.data.latitudeI / 1e7},{" "}
                  {location?.data.longitudeI / 1e7}
                </a>
              </p>
              <p>
                {t("locationResponse.altitude")}
                {location?.data.altitude}
                {location?.data.altitde < 1
                  ? t("unit.meter.one")
                  : t("unit.meter.plural")}
              </p>
            </span>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
