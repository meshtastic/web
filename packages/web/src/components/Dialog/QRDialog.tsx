import { create, toBinary } from "@bufbuild/protobuf";
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
import { Protobuf, type Types } from "@meshtastic/core";
import { fromByteArray } from "base64-js";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCode } from "react-qrcode-logo";
import { Checkbox } from "../UI/Checkbox/index.tsx";

export interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
  channels: Map<Types.ChannelNumber, Protobuf.Channel.Channel>;
}

export const QRDialog = ({
  open,
  onOpenChange,
  loraConfig,
  channels,
}: QRDialogProps) => {
  const { t } = useTranslation("dialog");
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrCodeAdd, setQrCodeAdd] = useState<boolean>();

  const allChannels = useMemo(() => Array.from(channels.values()), [channels]);

  useEffect(() => {
    const channelsToEncode = allChannels
      .filter((ch) => selectedChannels.includes(ch.index))
      .map((channel) => channel.settings)
      .filter((ch): ch is Protobuf.Channel.ChannelSettings => !!ch);
    const encoded = create(
      Protobuf.AppOnly.ChannelSetSchema,
      create(Protobuf.AppOnly.ChannelSetSchema, {
        loraConfig,
        settings: channelsToEncode,
      }),
    );
    const base64 = fromByteArray(
      toBinary(Protobuf.AppOnly.ChannelSetSchema, encoded),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    setQrCodeUrl(
      `https://meshtastic.org/e/${qrCodeAdd ? "?add=true" : ""}#${base64}`,
    );
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
                    {channel.settings?.name.length
                      ? channel.settings.name
                      : channel.role === Protobuf.Channel.Channel_Role.PRIMARY
                        ? t("page.broadcastLabel", { ns: "channels" })
                        : `${t("page.channelIndex", {
                            ns: "channels",
                            index: channel.index,
                          })}`}
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
            <button
              type="button"
              className={`border-slate-900 border-t border-l border-b rounded-l h-10 px-7 py-2 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${
                qrCodeAdd
                  ? "focus:ring-green-800 bg-green-800 text-white"
                  : "focus:ring-slate-400 bg-slate-400 hover:bg-green-600"
              }`}
              name="addChannels"
              onClick={() => setQrCodeAdd(true)}
            >
              {t("qr.addChannels")}
            </button>
            <button
              type="button"
              className={`border-slate-900 border-t border-r border-b rounded-r h-10 px-4 py-2 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${
                !qrCodeAdd
                  ? "focus:ring-green-800 bg-green-800 text-white"
                  : "focus:ring-slate-400 bg-slate-400 hover:bg-green-600"
              }`}
              name="replaceChannels"
              onClick={() => setQrCodeAdd(false)}
            >
              {t("qr.replaceChannels")}
            </button>
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
