import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { useCopyToClipboard } from "@core/hooks/useCopyToClipboard.ts";
import {
  encodeChannelShare,
  type ChannelShareMode,
} from "@core/utils/channelShare.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useChannels } from "@meshtastic/sdk-react";
import { Share2 } from "lucide-react";
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
  const { copy } = useCopyToClipboard();
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [mode, setMode] = useState<ChannelShareMode>("replace");
  const allChannels = useChannels();

  const qrCodeUrl = useMemo(() => {
    const settings = allChannels
      .filter((channel) => selectedChannels.includes(channel.index))
      .map((channel) => channel.settings)
      .filter(
        (channel): channel is Protobuf.Channel.ChannelSettings => !!channel,
      );

    return settings.length > 0
      ? encodeChannelShare({ mode, settings, loraConfig })
      : "";
  }, [allChannels, loraConfig, mode, selectedChannels]);

  const share = async () => {
    if (!qrCodeUrl) return;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: t("qr.title"),
          text: t("qr.shareText"),
          url: qrCodeUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    await copy(qrCodeUrl);
  };

  const selectMode = (nextMode: ChannelShareMode) => setMode(nextMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("qr.title")}</DialogTitle>
          <DialogDescription>
            {t(
              mode === "replace"
                ? "qr.replaceDescription"
                : "qr.addDescription",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <ModePicker mode={mode} onChange={selectMode} />
          </div>
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
                    checked={selectedChannels.includes(channel.index)}
                    onChange={() => {
                      if (selectedChannels.includes(channel.index)) {
                        if (selectedChannels.length > 1) {
                          setSelectedChannels(
                            selectedChannels.filter(
                              (selected) => selected !== channel.index,
                            ),
                          );
                        }
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
        </div>
        <DialogFooter className="gap-2">
          <Label>{t("qr.sharableUrl")}</Label>
          <Input value={qrCodeUrl} disabled showCopyButton />
          <Button onClick={() => void share()} disabled={!qrCodeUrl}>
            <Share2 className="mr-2" size={16} />
            {t("qr.share")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ModePicker = ({
  mode,
  onChange,
}: {
  mode: ChannelShareMode;
  onChange: (mode: ChannelShareMode) => void;
}) => {
  const { t } = useTranslation("dialog");
  return (
    <fieldset className="flex border-0 p-0" aria-label={t("qr.mode")}>
      {(["replace", "add"] as const).map((modeOption) => (
        <button
          className={`h-10 border-slate-900 border-t border-b px-4 py-2 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-offset-2 first:rounded-l last:rounded-r ${
            mode === modeOption
              ? "bg-green-800 text-white focus:ring-green-800"
              : "bg-slate-400 hover:bg-green-600 focus:ring-slate-400"
          }`}
          key={modeOption}
          name={`${modeOption}Channels`}
          onClick={() => onChange(modeOption)}
          type="button"
        >
          {t(`qr.${modeOption}Channels`)}
        </button>
      ))}
    </fieldset>
  );
};
