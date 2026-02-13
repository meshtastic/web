import {
  useConnectionByNodeNum,
  useDeviceDisconnectDetection,
  useDeviceReconnectionDetection,
} from "@features/connect/hooks";
import { ConnectionService } from "@features/connect/services";
import { Button } from "@shared/components/ui/button";
import { LoaderCircleIcon, RotateCw, WifiOffIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { DialogWrapper } from "./DialogWrapper";

export interface DeviceRebootDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RebootPhase = "rebooting" | "disconnected" | "reconnecting";

// How long to wait for a disconnect before assuming the device rebooted
// without losing the transport (e.g. serial over USB stays connected).
const REBOOT_TIMEOUT_MS = 10_000;

export const DeviceRebootDialog = ({
  open,
  onOpenChange,
}: DeviceRebootDialogProps) => {
  const { t } = useTranslation("dialog");
  const params = useParams({ strict: false });
  const nodeNum = params.nodeNum ? Number(params.nodeNum) : null;
  const { connection } = useConnectionByNodeNum(nodeNum);
  const [phase, setPhase] = useState<RebootPhase>("rebooting");
  const [reconnectError, setReconnectError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Reset phase when dialog opens, start reboot timeout
  useEffect(() => {
    if (open) {
      setPhase("rebooting");
      setReconnectError(false);

      timeoutRef.current = setTimeout(() => {
        // If still in "rebooting" after timeout, the transport stayed alive
        // (serial USB). Close the dialog — the device has rebooted in place.
        setPhase((current) => {
          if (current === "rebooting") {
            onOpenChange(false);
          }
          return current;
        });
      }, REBOOT_TIMEOUT_MS);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [open, onOpenChange]);

  // Listen for disconnect events to transition from rebooting to disconnected
  useDeviceDisconnectDetection(() => {
    if (!open) return;

    setPhase((current) => {
      if (current === "rebooting") {
        clearTimeout(timeoutRef.current);
        return "disconnected";
      }
      return current;
    });
  });

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

  const description = (() => {
    switch (phase) {
      case "rebooting":
        return t("deviceReboot.rebooting");
      case "disconnected":
        return reconnectError
          ? t("deviceReboot.reconnectFailed")
          : t("deviceReboot.disconnected");
      case "reconnecting":
        return t("deviceReboot.reconnecting");
    }
  })();

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="custom"
      title={t("deviceReboot.title")}
      description={description}
      showFooter={false}
    >
      <div className="flex flex-col items-center gap-4 p-4">
        {phase === "rebooting" && (
          <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
        )}
        {phase === "disconnected" && (
          <>
            <WifiOffIcon className="size-8 text-muted-foreground" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("deviceReboot.close")}
              </Button>
              <Button onClick={handleReconnect}>
                <RotateCw className="mr-2 size-4" />
                {t("deviceReboot.reconnect")}
              </Button>
            </div>
          </>
        )}
        {phase === "reconnecting" && (
          <>
            <WifiOffIcon className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("deviceReboot.close")}
                </Button>
                <Button disabled>
                  <RotateCw className="mr-2 size-4 animate-spin" />
                  {t("deviceReboot.reconnectingButton")}
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={handleCancel}>
                {t("deviceReboot.cancel")}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogWrapper>
  );
};
