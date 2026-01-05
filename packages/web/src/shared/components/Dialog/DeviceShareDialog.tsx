import { useMyNode } from "@app/shared/hooks/useMyNode";
import { useNodes } from "@data/hooks";
import {
  DeviceQRCode,
  generateDeviceShareUrl,
} from "@shared/components/QRCode";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Check, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper.tsx";

export interface DeviceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeNum?: number; // If not provided, shares own device
}

export const DeviceShareDialog = ({
  open,
  onOpenChange,
  nodeNum,
}: DeviceShareDialogProps) => {
  const { t } = useTranslation("dialog");
  const { myNodeNum, myNode } = useMyNode();
  const { nodeMap } = useNodes(myNodeNum);
  const [copied, setCopied] = useState(false);

  const targetNodeNum = nodeNum ?? myNodeNum;
  const targetNode = targetNodeNum
    ? nodeNum
      ? nodeMap.get(targetNodeNum)
      : myNode
    : null;

  const deviceInfo = useMemo(() => {
    if (!targetNodeNum) {
      return null;
    }
    return {
      nodeNum: targetNodeNum,
      longName: targetNode?.longName ?? null,
      shortName: targetNode?.shortName ?? null,
      publicKey: targetNode?.publicKey ?? null,
    };
  }, [targetNodeNum, targetNode]);

  const shareUrl = useMemo(() => {
    if (!deviceInfo) {
      return "";
    }
    return generateDeviceShareUrl(deviceInfo);
  }, [deviceInfo]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [shareUrl]);

  if (!deviceInfo) {
    return null;
  }

  const displayName =
    deviceInfo.longName ?? deviceInfo.shortName ?? `Node ${deviceInfo.nodeNum}`;

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="info"
      title={t("deviceShare.title", { name: displayName })}
      description={t("deviceShare.description")}
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="rounded-lg bg-white p-3">
          <DeviceQRCode device={deviceInfo} size={200} />
        </div>

        <div className="w-full space-y-2">
          <Label>{t("deviceShare.shareableUrl")}</Label>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="flex-1 text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label={t("deviceShare.copyUrl")}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </DialogWrapper>
  );
};
