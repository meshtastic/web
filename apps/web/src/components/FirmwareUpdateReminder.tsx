import { FirmwareUpdateNudge } from "@components/FirmwareUpdateNudge.tsx";
import {
  buildFirmwareUpdateNotice,
  fetchLatestStableFirmwareRelease,
  notifyFirmwareUpdateIfPermitted,
  type FirmwareUpdateNotice,
} from "@core/services/firmwareUpdate.ts";
import { useDevice } from "@core/stores";
import { Types } from "@meshtastic/sdk";
import { useEffect, useMemo, useState } from "react";

export const FirmwareUpdateReminder = () => {
  const { hardware, metadata, myNodeNum, status } = useDevice();
  const [latestStableVersion, setLatestStableVersion] = useState<
    string | undefined
  >(undefined);

  const deviceMetadata = metadata.get(0);
  const hardwareTarget = hardware.pioEnv.trim();
  const isConnected = status === Types.DeviceStatusEnum.DeviceConfigured;

  useEffect(() => {
    let active = true;
    setLatestStableVersion(undefined);

    if (!isConnected || !deviceMetadata?.firmwareVersion || !hardwareTarget) {
      return;
    }

    void fetchLatestStableFirmwareRelease().then((version) => {
      if (active) setLatestStableVersion(version);
    });

    return () => {
      active = false;
    };
  }, [isConnected, deviceMetadata?.firmwareVersion, hardwareTarget, myNodeNum]);

  const notice = useMemo(
    () =>
      latestStableVersion &&
      hardwareTarget &&
      myNodeNum !== undefined &&
      deviceMetadata?.firmwareVersion
        ? buildFirmwareUpdateNotice({
            nodeIdentity: myNodeNum.toString(),
            hardwareTarget,
            currentVersion: deviceMetadata.firmwareVersion,
            latestStableVersion,
          })
        : null,
    [
      deviceMetadata?.firmwareVersion,
      hardwareTarget,
      latestStableVersion,
      myNodeNum,
    ],
  );

  useEffect(() => {
    if (!notice || typeof window === "undefined") return;

    const BrowserNotification = window.Notification;
    notifyFirmwareUpdateIfPermitted(notice, {
      notificationPermission: BrowserNotification?.permission,
      notification: BrowserNotification
        ? (title, options) => new BrowserNotification(title, options)
        : undefined,
      storage: window.localStorage,
      onClick: () => {
        window.open(notice.actionUrl, "_blank", "noopener,noreferrer");
      },
    });
  }, [notice]);

  if (!notice) return null;

  return <FirmwareUpdateAction notice={notice} />;
};

const FirmwareUpdateAction = ({ notice }: { notice: FirmwareUpdateNotice }) => (
  <aside className="fixed right-6 bottom-6 z-50 w-[min(100%-3rem,26rem)]">
    <FirmwareUpdateNudge
      currentVersion={notice.currentVersion}
      latestStableVersion={notice.latestStableVersion}
      onOpen={() => {
        window.open(notice.actionUrl, "_blank", "noopener,noreferrer");
      }}
    />
  </aside>
);
