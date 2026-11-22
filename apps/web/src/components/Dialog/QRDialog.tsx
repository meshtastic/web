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
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Segmented } from "@components/UI/Segmented.tsx";
import { channelLabel } from "@core/channels/channelLabel.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useChannels } from "@core/kmp/hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCode } from "react-qrcode-logo";
import { Checkbox } from "../UI/Checkbox/index.tsx";

export interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
}

export const QRDialog = ({ open, onOpenChange, loraConfig }: QRDialogProps) => {
  const { t } = useTranslation("dialog");
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [qrCodeAdd, setQrCodeAdd] = useState<boolean>();

  const allChannels = useChannels();

  const qrCodeUrl = useMemo(() => {
    const channelsToEncode = allChannels
      .filter((ch) => selectedChannels.includes(ch.index))
      .map((channel) => channel.settings)
      .filter((ch): ch is Protobuf.Channel.ChannelSettings => !!ch);
    const encoded = create(Protobuf.AppOnly.ChannelSetSchema, {
      loraConfig,
      settings: channelsToEncode,
    });
    return channelSetToUrl(encoded, { add: qrCodeAdd });
  }, [allChannels, selectedChannels, qrCodeAdd, loraConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("qr.title")}</DialogTitle>
          <DialogDescription>{t("qr.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <QRCode value={qrCodeUrl} size={200} qrStyle="dots" />
          </div>
          <div className="flex justify-center">
            <Segmented
              aria-label={t("qr.linkMode")}
              options={[
                { value: "add", label: t("qr.addChannels") },
                { value: "replace", label: t("qr.replaceChannels") },
              ]}
              value={qrCodeAdd ? "add" : "replace"}
              onValueChange={(mode) => setQrCodeAdd(mode === "add")}
            />
          </div>
        </div>
        <DialogFooter>
          <Label>{t("qr.sharableUrl")}</Label>
          <Input value={qrCodeUrl} disabled />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
