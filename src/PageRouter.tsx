import { useDevice } from "@core/providers/useDevice.js";
import { ChannelsPage } from "@pages/Channels.js";
import { ConfigPage } from "@pages/Config/index.js";
import { MapPage } from "@pages/Map.js";
import { MessagesPage } from "@pages/Messages.js";
import { PeersPage } from "@pages/Peers.js";
import { SetupPage } from "./pages/Setup";

export const PageRouter = (): JSX.Element => {
  const { activePage } = useDevice();
  return (
    <div className="flex-grow overflow-y-auto bg-backgroundPrimary">
      {activePage === "messages" && <MessagesPage />}
      {activePage === "map" && <MapPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "peers" && <PeersPage />}
      {activePage === "setup" && <SetupPage />}
    </div>
  );
};
