import type React from "react";

import { useDevice } from "./core/stores/deviceStore.js";
import { ChannelsPage } from "./pages/Channels/index.js";
import { ConfigPage } from "./pages/Config/index.js";
import { ExtensionsPage } from "./pages/Extensions/Index.js";
import { InfoPage } from "./pages/Info/index.js";
import { MessagesPage } from "./pages/Messages/index.js";

export const PageRouter = (): JSX.Element => {
  const { activePage } = useDevice();
  return (
    <>
      {activePage === "messages" && <MessagesPage />}
      {/* {activePage === "map" && <MapPage />} */}
      {activePage === "extensions" && <ExtensionsPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "info" && <InfoPage />}
    </>
  );
};
