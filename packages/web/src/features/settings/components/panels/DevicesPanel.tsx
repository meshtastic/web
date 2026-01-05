import { useDevices } from "@data/hooks";
import type { Device } from "@data/schema";
import { RemoveDeviceDialog } from "@shared/components/Dialog/RemoveDeviceDialog";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { TimeAgo } from "@shared/components/TimeAgo";
import { Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DevicesPanelProps {
  searchQuery?: string;
}

export const DevicesPanel = ({ searchQuery = "" }: DevicesPanelProps) => {
  const { t } = useTranslation("ui");
  const { devices, isLoading } = useDevices();
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  const query = searchQuery.toLowerCase().trim();

  const isVisible =
    !query ||
    "devices device remove delete data".includes(query) ||
    t("preferences.devices.title").toLowerCase().includes(query);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <Card className="max-w-7xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t("preferences.devices.title")}
          </CardTitle>
          <CardDescription>
            {t("preferences.devices.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading devices...</p>
          ) : devices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("preferences.devices.noDevices")}
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <DeviceRow
                  key={device.nodeNum}
                  device={device}
                  onRemove={() => setDeviceToRemove(device)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RemoveDeviceDialog
        open={deviceToRemove !== null}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
        device={deviceToRemove}
        onRemoved={() => setDeviceToRemove(null)}
      />
    </>
  );
};

function DeviceRow({
  device,
  onRemove,
}: {
  device: Device;
  onRemove: () => void;
}) {
  const { t } = useTranslation("ui");
  const displayName =
    device.longName ?? device.shortName ?? `Node ${device.nodeNum}`;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>#{device.nodeNum}</span>
          <span>-</span>
          <span>{t("preferences.devices.lastSeen")}</span>
          <TimeAgo
            timestamp={device.lastSeen.getTime()}
            className="text-sm text-muted-foreground"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
        aria-label={t("preferences.devices.remove")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
