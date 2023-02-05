import { useDevice } from "@core/stores/deviceStore.js";
import { ChannelsPage } from "@pages/Channels.js";
import { ConfigPage } from "@pages/Config/index.js";
import { MapPage } from "@pages/Map.js";
import { MessagesPage } from "@pages/Messages.js";
import { PeersPage } from "@pages/Peers.js";

export const PageRouter = (): JSX.Element => {
  const { activePage } = useDevice();
  return (
    <>
      {activePage === "messages" && <MessagesPage />}
      {activePage === "map" && <MapPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "peers" && <PeersPage />}
    </>
  );
};
