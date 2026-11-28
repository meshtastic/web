import { create } from "@bufbuild/protobuf";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { CopyField } from "@components/UI/CopyField.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Segmented } from "@components/UI/Segmented.tsx";
import { ShareButton } from "@components/UI/ShareButton.tsx";
import { channelLabel } from "@core/channels/channelLabel.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useChannels } from "@core/kmp/hooks";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCode } from "react-qrcode-logo";
import { Checkbox } from "../UI/Checkbox/index.tsx";

export interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
}

type ShareMode = "replace" | "add";

/**
 * Share channels as a QR code and link. Replace is the default: the link
 * carries the channels and this radio's LoRa settings. An Add link carries
 * only the channels.
 */
export const QRDialog = ({ open, onOpenChange, loraConfig }: QRDialogProps) => {
  const { t } = useTranslation("dialog");
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [mode, setMode] = useState<ShareMode>("replace");
  const hintId = useId();

  const allChannels = useChannels();

  const channelsToEncode = useMemo(
    () =>
      allChannels
        .filter((ch) => selectedChannels.includes(ch.index))
        .map((channel) => channel.settings)
        .filter((ch): ch is Protobuf.Channel.ChannelSettings => !!ch),
    [allChannels, selectedChannels],
  );
  const qrCodeUrl = useMemo(
    () =>
      channelSetToUrl(
        create(Protobuf.AppOnly.ChannelSetSchema, {
          loraConfig,
          settings: channelsToEncode,
        }),
        { add: mode === "add" },
      ),
    [channelsToEncode, mode, loraConfig],
  );
  // A Replace link without LoRa settings could only be added, so none goes
  // out until this radio's LoRa section has loaded.
  const waitingForLora = mode === "replace" && loraConfig === undefined;
  const hasChannels = channelsToEncode.length > 0;
  const showLink = hasChannels && !waitingForLora;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("qr.title")}</DialogTitle>
          <DialogDescription>{t("qr.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <Segmented
              aria-label={t("qr.linkMode")}
              aria-describedby={hintId}
              options={[
                { value: "replace", label: t("qr.replaceChannels") },
                { value: "add", label: t("qr.addChannels") },
              ]}
              value={mode}
              onValueChange={setMode}
            />
            <p id={hintId} className="m-0 text-center text-help text-secondary">
              {mode === "add" ? t("qr.addHint") : t("qr.replaceHint")}
            </p>
          </div>
          <div className="flex gap-3 px-4 py-5 sm:p-6">
            <div className="flex w-40 flex-col gap-2">
              {allChannels.map((channel) => (
                <div className="flex justify-between" key={channel.index}>
                  <Label>
                    {channelLabel(
                      { index: channel.index, name: channel.settings?.name },
                      t,
                    )}
                  </Label>
                  <Checkbox
                    key={channel.index}
                    checked={selectedChannels.includes(channel.index)}
                    onChange={() => {
                      if (selectedChannels.includes(channel.index)) {
                        setSelectedChannels(
                          selectedChannels.filter((c) => c !== channel.index),
                        );
                      } else {
                        setSelectedChannels([
                          ...selectedChannels,
                          channel.index,
                        ]);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            {showLink ? (
              <QRCode value={qrCodeUrl} size={200} qrStyle="dots" />
            ) : (
              <p className="m-0 self-center text-help text-muted">
                {hasChannels ? t("qr.waitingForLora") : t("qr.selectOne")}
              </p>
            )}
          </div>
        </div>
        {showLink && (
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
            <CopyField
              value={qrCodeUrl}
              label={t("qr.sharableUrl")}
              fill
              actions={
                <ShareButton url={qrCodeUrl} title={t("qr.shareTitle")} />
              }
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
