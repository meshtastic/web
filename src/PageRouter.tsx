import type React from "react";

import { useDevice } from "@core/providers/useDevice.js";
import { ChannelsPage } from "@pages/Channels.js";
import { ConfigPage } from "@pages/Config/index.js";
import { ExtensionsPage } from "@pages/Extensions/Index.js";
import { InfoPage } from "@pages/Info.js";
import { LogsPage } from "@pages/Logs.js";
import { MapPage } from "@pages/Map.js";
import { MessagesPage } from "@pages/Messages.js";
import { PeersPage } from "@pages/Peers.js";
import { SetupPage } from "./pages/Setup";

export const PageRouter = (): JSX.Element => {
  const { activePage } = useDevice();
  return (
    <div className="flex-grow overflow-y-auto">
      {activePage === "messages" && <MessagesPage />}
      {activePage === "map" && <MapPage />}
      {activePage === "extensions" && <ExtensionsPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "peers" && <PeersPage />}
      {activePage === "info" && <InfoPage />}
      {activePage === "logs" && <LogsPage />}
      {activePage === "setup" && <SetupPage />}
    </div>
  );
};
