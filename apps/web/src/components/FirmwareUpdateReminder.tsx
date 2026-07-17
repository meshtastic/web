import { FirmwareUpdateNudge } from "@components/FirmwareUpdateNudge.tsx";
import {
  buildFirmwareUpdateNotice,
  fetchLatestStableFirmwareRelease,
  notifyFirmwareUpdateIfPermitted,
  type FirmwareReleaseWithTargets,
  type FirmwareUpdateNotice,
} from "@core/services/firmwareUpdate.ts";
import { useDevice } from "@core/stores";
import { Types } from "@meshtastic/sdk";
import { useEffect, useMemo, useState } from "react";

export const FirmwareUpdateReminder = () => {
  const { hardware, metadata, myNodeNum, status } = useDevice();
  const [latestStableRelease, setLatestStableRelease] = useState<
    FirmwareReleaseWithTargets | undefined
  >(undefined);

  const deviceMetadata = metadata.get(0);
  const hardwareTarget = hardware.pioEnv.trim();
  const isConnected = status === Types.DeviceStatusEnum.DeviceConfigured;

  useEffect(() => {
    let active = true;
    setLatestStableRelease(undefined);

    if (!isConnected || !deviceMetadata?.firmwareVersion || !hardwareTarget) {
      return;
    }

    void fetchLatestStableFirmwareRelease().then((release) => {
      if (active) setLatestStableRelease(release);
    });

    return () => {
      active = false;
    };
  }, [isConnected, deviceMetadata?.firmwareVersion, hardwareTarget, myNodeNum]);

  const notice = useMemo(
    () =>
      latestStableRelease &&
      hardwareTarget &&
      myNodeNum !== undefined &&
      deviceMetadata?.firmwareVersion
        ? buildFirmwareUpdateNotice({
            nodeIdentity: myNodeNum.toString(),
            hardwareTarget,
            currentVersion: deviceMetadata.firmwareVersion,
            latestStableVersion: latestStableRelease.id,
            releaseTargets: latestStableRelease.targets,
          })
        : null,
    [
      deviceMetadata?.firmwareVersion,
      hardwareTarget,
      latestStableRelease,
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
      storage: getBrowserStorage(),
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

function getBrowserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return;
  }
}
