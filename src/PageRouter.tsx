import MapPage from "@app/pages/Map/index.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import ChannelsPage from "@pages/Channels.tsx";
import ConfigPage from "@pages/Config/index.tsx";
import MessagesPage from "@pages/Messages.tsx";
import NodesPage from "@pages/Nodes.tsx";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";

export const ErrorBoundaryWrapper = ({
  children,
}: { children: React.ReactNode }) => (
  <ErrorBoundary FallbackComponent={ErrorPage}>{children}</ErrorBoundary>
);

export const PageRouter = () => {
  const { activePage } = useDevice();
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      {activePage === "messages" && <MessagesPage />}
      {activePage === "map" && <MapPage />}
      {activePage === "config" && <ConfigPage />}
      {activePage === "channels" && <ChannelsPage />}
      {activePage === "nodes" && <NodesPage />}
    </ErrorBoundary>
  );
};
