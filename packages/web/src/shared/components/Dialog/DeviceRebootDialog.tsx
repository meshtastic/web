import { useConnection } from "@features/connect/hooks/useConnect";
import { ConnectionService } from "@features/connect/services";
import { Button } from "@shared/components/ui/button";
import { useDeviceStore } from "@state/device/store";
import { LoaderCircleIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper";

export interface DeviceRebootDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RebootPhase = "rebooting" | "disconnected" | "reconnecting";

export const DeviceRebootDialog = ({
  open,
  onOpenChange,
}: DeviceRebootDialogProps) => {
  const { t } = useTranslation("dialog");
  const connectionId = useDeviceStore((s) => s.activeConnectionId);
  const { connection } = useConnection(connectionId ?? 0);
  const [phase, setPhase] = useState<RebootPhase>("rebooting");
  const [reconnectError, setReconnectError] = useState(false);

  // Reset phase when dialog opens
  useEffect(() => {
    if (open) {
      setPhase("rebooting");
      setReconnectError(false);
    }
  }, [open]);

  // Watch connection status and transition phases
  useEffect(() => {
    if (!open) return;

    const status = connection?.status;
    if (
      phase === "rebooting" &&
      (status === "disconnected" || status === "error")
    ) {
      setPhase("disconnected");
    }

    if (
      phase === "reconnecting" &&
      (status === "connected" || status === "configured")
    ) {
      onOpenChange(false);
    }
  }, [open, connection?.status, phase, onOpenChange]);

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
                <RefreshCwIcon className="mr-2" size={16} />
                {t("deviceReboot.reconnect")}
              </Button>
            </div>
          </>
        )}
        {phase === "reconnecting" && (
          <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
        )}
      </div>
    </DialogWrapper>
  );
};
