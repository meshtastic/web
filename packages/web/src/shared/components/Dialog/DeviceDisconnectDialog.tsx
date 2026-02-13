import {
  useConnectionByNodeNum,
  useDeviceReconnectionDetection,
} from "@features/connect/hooks";
import { ConnectionService } from "@features/connect/services";
import { Button } from "@shared/components/ui/button";
import { RotateCw, WifiOffIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { DialogWrapper } from "./DialogWrapper";

export interface DeviceDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DisconnectPhase = "disconnected" | "reconnecting";

export const DeviceDisconnectDialog = ({
  open,
  onOpenChange,
}: DeviceDisconnectDialogProps) => {
  const { t } = useTranslation("dialog");
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const nodeNum = params.nodeNum ? Number(params.nodeNum) : null;
  const { connection } = useConnectionByNodeNum(nodeNum);
  const [phase, setPhase] = useState<DisconnectPhase>("disconnected");
  const [reconnectError, setReconnectError] = useState(false);

  // Reset phase when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("disconnected");
      setReconnectError(false);
    }
  }, [open]);

  // Listen for reconnection events to auto-close the dialog
  useDeviceReconnectionDetection(() => {
    if (!open) return;

    setPhase((current) => {
      if (current === "reconnecting") {
        onOpenChange(false);
      }
      return current;
    });
  });

  const handleReconnect = useCallback(async () => {
    if (!connection) return;

    setPhase("reconnecting");
    setReconnectError(false);

    const success = await ConnectionService.connect(connection, {
      allowPrompt: true,
    });

    if (!success) {
      setPhase("disconnected");
      setReconnectError(true);
    }
  }, [connection]);

  const handleCancel = useCallback(async () => {
    if (!connection) return;
    setPhase("disconnected");
    await ConnectionService.disconnect(connection);
  }, [connection]);

  const handleGoToConnections = useCallback(() => {
    onOpenChange(false);
    navigate({ to: "/connect" });
  }, [onOpenChange, navigate]);

  const description = (() => {
    switch (phase) {
      case "disconnected":
        return reconnectError
          ? t("deviceDisconnect.reconnectFailed")
          : t("deviceDisconnect.description");
      case "reconnecting":
        return t("deviceDisconnect.reconnecting");
    }
  })();

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="custom"
      title={t("deviceDisconnect.title")}
      description={description}
      showFooter={false}
    >
      <div className="flex flex-col items-center gap-4 p-4">
        <WifiOffIcon className="size-8 text-muted-foreground" />
        {phase === "disconnected" && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("deviceDisconnect.close")}
              </Button>
              <Button onClick={handleReconnect}>
                <RotateCw className="mr-2 size-4" />
                {t("deviceDisconnect.reconnect")}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleGoToConnections}
            >
              {t("deviceDisconnect.goToConnections")}
            </Button>
          </div>
        )}
        {phase === "reconnecting" && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("deviceDisconnect.close")}
              </Button>
              <Button disabled>
                <RotateCw className="mr-2 size-4 animate-spin" />
                {t("deviceDisconnect.reconnectingButton")}
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={handleCancel}>
              {t("deviceDisconnect.cancel")}
            </Button>
          </div>
        )}
      </div>
    </DialogWrapper>
  );
};
