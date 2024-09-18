import { useDevice } from "@app/core/stores/deviceStore";
import type { Types } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useCallback, useEffect } from "react";

export const Notifications = (): JSX.Element | null => {
  const { nodes, connection, channels } = useDevice();
  let notificationPermission = Notification.permission;

  useEffect(() => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications.");
      notificationPermission = "denied";
      return;
    }
    Notification.requestPermission().then(() => notificationPermission);
    connection?.events.onMessagePacket.subscribe(messageHandler);
    return () => connection?.events.onMessagePacket.unsubscribe(messageHandler);
  }, [notificationPermission, connection]);

  const messageHandler = useCallback(
    (packet: Types.PacketMetadata<string>) => {
      if (notificationPermission !== "granted") return;

      const notificationBody = packet.data;
      let notificationTitle = `New Message from ${nodes.get(packet.from)?.user?.longName ?? `!${numberToHexUnpadded(packet.from)}`}`;

      if (packet.type === "broadcast") {
        notificationTitle = `New Message in ${channels.get(packet.channel)?.settings?.name ?? "Broadcast"}, from ${nodes.get(packet.from)?.user?.longName ?? `!${numberToHexUnpadded(packet.from)}`}`;
      }

      new Notification(notificationTitle, {
        body: notificationBody,
        icon: "/favicon.ico",
      });
    },
    [notificationPermission, nodes, channels],
  );
  return null;
};
