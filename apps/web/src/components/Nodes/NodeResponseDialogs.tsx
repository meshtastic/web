import { LocationResponseDialog } from "@components/Dialog/LocationResponseDialog.tsx";
import { TracerouteResponseDialog } from "@components/Dialog/TracerouteResponseDialog.tsx";
import { useActiveClient } from "@core/kmp/hooks";
import type { Protobuf, Types } from "@core/protobuf.ts";
import { useDevice } from "@core/stores";
import { useEffect, useState } from "react";

type Traceroute = Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>;
type Location = Types.PacketMetadata<Protobuf.Mesh.Position>;

/**
 * Shows traceroute and position replies addressed to this device while the
 * Nodes or Map screen is open, so a request sent from either one gets its
 * answer on screen.
 */
export const NodeResponseDialogs = () => {
  const connection = useActiveClient();
  const { hardware } = useDevice();
  const myNodeNum = hardware.myNodeNum;
  const [traceroute, setTraceroute] = useState<Traceroute | undefined>();
  const [location, setLocation] = useState<Location | undefined>();

  useEffect(() => {
    if (!connection) {
      return;
    }
    return connection.events.onTraceRoutePacket.subscribe(setTraceroute);
  }, [connection]);

  useEffect(() => {
    if (!connection) {
      return;
    }
    return connection.events.onPositionPacket.subscribe((packet) => {
      // Only replies to our own requests, not every broadcast position.
      if (packet.to.valueOf() === myNodeNum && packet.from !== myNodeNum) {
        setLocation(packet);
      }
    });
  }, [connection, myNodeNum]);

  return (
    <>
      <TracerouteResponseDialog
        traceroute={traceroute}
        open={traceroute !== undefined}
        onOpenChange={() => setTraceroute(undefined)}
      />
      <LocationResponseDialog
        location={location}
        open={location !== undefined}
        onOpenChange={() => setLocation(undefined)}
      />
    </>
  );
};
