import { create } from "@bufbuild/protobuf";
import { useSettingsReadOnly } from "@components/Settings/SettingsReadOnly.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Card } from "@components/UI/Card.tsx";
import { CopyField } from "@components/UI/CopyField.tsx";
import { Protobuf } from "@core/protobuf.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { DownloadIcon, QrCodeIcon, UploadIcon } from "lucide-react";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { QRCode } from "react-qrcode-logo";

export interface ChannelShareCardProps {
  /** The channel as it is on the radio; undefined or disabled when not. */
  settings: Protobuf.Channel.ChannelSettings | undefined;
  index: number;
  name: string;
  loraConfig: Protobuf.Config.Config_LoRaConfig | undefined;
  /** Pick several channels or add vs replace (the QR dialog). */
  onMoreOptions: () => void;
  onImport: () => void;
}

/**
 * QR code and link for the selected channel, as it is on the radio.
 * Secondary channels are shared as "add" links so they don't replace the
 * receiver's primary.
 */
export const ChannelShareCard = ({
  settings,
  index,
  name,
  loraConfig,
  onMoreOptions,
  onImport,
}: ChannelShareCardProps) => {
  const { t } = useTranslation("channels");
  const qrId = useId();
  // Sharing reads the radio; importing changes it.
  const readOnly = useSettingsReadOnly();

  const url = useMemo(
    () =>
      settings
        ? channelSetToUrl(
            create(Protobuf.AppOnly.ChannelSetSchema, {
              loraConfig,
              settings: [settings],
            }),
            { add: index !== 0 },
          )
        : undefined,
    [settings, loraConfig, index],
  );

  const downloadQr = () => {
    const canvas = document.getElementById(qrId);
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `meshtastic-channel-${index}.png`;
    link.click();
  };

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      {url ? (
        <figure className="m-0 flex-none overflow-hidden rounded-control">
          <QRCode id={qrId} value={url} size={88} quietZone={4} />
          <figcaption className="sr-only">
            {t("share.qrLabel", { name })}
          </figcaption>
        </figure>
      ) : (
        <div
          aria-hidden="true"
          className="flex size-24 flex-none items-center justify-center rounded-control border border-dashed border-subtle text-muted"
        >
          <QrCodeIcon className="size-8" />
        </div>
      )}
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2">
        <h3 className="m-0 text-body font-semibold">{t("share.title")}</h3>
        {url ? (
          <CopyField
            value={url}
            label={t("share.linkLabel")}
            actions={
              <Button
                variant="secondary"
                className="text-help"
                icon={<DownloadIcon aria-hidden="true" className="size-4" />}
                onClick={downloadQr}
              >
                {t("share.download")}
              </Button>
            }
          />
        ) : (
          <p className="m-0 text-help text-muted">{t("share.notOnRadio")}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Button
            variant="link"
            className="h-auto p-0 text-help"
            icon={<QrCodeIcon aria-hidden="true" className="size-4" />}
            onClick={onMoreOptions}
          >
            {t("share.more")}
          </Button>
          <Button
            variant="link"
            className="h-auto p-0 text-help"
            icon={<UploadIcon aria-hidden="true" className="size-4" />}
            disabled={readOnly}
            onClick={onImport}
          >
            {t("share.import")}
          </Button>
        </div>
      </div>
    </Card>
  );
};
