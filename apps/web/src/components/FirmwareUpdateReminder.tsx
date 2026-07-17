import { FirmwareUpdateNudge } from "@components/FirmwareUpdateNudge.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  buildFirmwareUpdateNotice,
  fetchLatestStableFirmwareRelease,
  notifyFirmwareUpdateIfPermitted,
  type FirmwareUpdateNotice,
} from "@core/services/firmwareUpdate.ts";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const FirmwareUpdateReminder = (): null => {
  const { connectionPhase, metadata, myNodeNum } = useDevice();
  const { toast } = useToast();
  const { t } = useTranslation("ui");
  const [latestStableVersion, setLatestStableVersion] = useState<
    string | undefined
  >(undefined);
  const dismissRef = useRef<(() => void) | null>(null);
  const shownNoticeKeyRef = useRef<string | undefined>(undefined);

  const deviceMetadata = metadata.get(0);
  const hardwareTarget =
    deviceMetadata?.hwModel === undefined ||
    deviceMetadata.hwModel === Protobuf.Mesh.HardwareModel.UNSET
      ? undefined
      : Protobuf.Mesh.HardwareModel[deviceMetadata.hwModel];
  const isConnected = connectionPhase === "configured";

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
    });
  }, [notice]);

  useEffect(() => {
    if (!notice) {
      dismissRef.current?.();
      dismissRef.current = null;
      shownNoticeKeyRef.current = undefined;
      return;
    }
    if (shownNoticeKeyRef.current === notice.notificationKey) return;

    dismissRef.current?.();
    const { dismiss } = toast({
      title: t("firmwareUpdate.title"),
      duration: Number.POSITIVE_INFINITY,
      dismissible: false,
      action: <FirmwareUpdateAction notice={notice} />,
    });
    dismissRef.current = dismiss;
    shownNoticeKeyRef.current = notice.notificationKey;
  }, [notice, t, toast]);

  useEffect(
    () => () => {
      dismissRef.current?.();
    },
    [],
  );

  return null;
};

const FirmwareUpdateAction = ({ notice }: { notice: FirmwareUpdateNotice }) => (
  <FirmwareUpdateNudge
    currentVersion={notice.currentVersion}
    latestStableVersion={notice.latestStableVersion}
    onOpen={() => {
      window.open(notice.actionUrl, "_blank", "noopener,noreferrer");
    }}
  />
);
