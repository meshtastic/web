import MapPage from "@app/pages/Map/index.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import ChannelsPage from "@pages/Channels.tsx";
import ConfigPage from "@pages/Config/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import NodesPage from "@pages/Nodes.tsx";

export const PageRouter = () => {
  const { activePage } = useDevice();
  return (
    <>
      {activePage === "messages" && <MessagesPage />}
      {activePage === "map" && <MapPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "nodes" && <NodesPage />}
    </>
  );
};
