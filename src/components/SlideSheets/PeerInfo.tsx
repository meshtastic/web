import type React from "react";
import { useEffect, useState } from "react";

import { GeolocationIcon, Pane, PropertyIcon, SideSheet } from "evergreen-ui";

import { SlideSheetTabbedContent } from "@components/layout/page/SlideSheetTabbedContent.js";
import type { TabType } from "@components/layout/page/TabbedContent.js";
import { Location } from "@components/SlideSheets/tabs/nodes/Location.js";
import { Overview } from "@components/SlideSheets/tabs/nodes/Overview.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Node } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const PeerInfo = () => {
  const { peerInfoOpen, activePeer, setPeerInfoOpen, nodes } = useDevice();
  const [node, setNode] = useState<Node | undefined>();

  useEffect(() => {
    setNode(nodes.find((n) => n.data.num === activePeer));
  }, [nodes, activePeer]);

  const tabs: TabType[] = [
    {
      name: "Info",
      icon: PropertyIcon,
      element: () => <Overview node={node} />,
    },
    {
      name: "Location",
      icon: GeolocationIcon,
      element: () => <Location node={node} />,
    },
  ];

  return (
    <SideSheet
      isShown={peerInfoOpen}
      onCloseComplete={() => {
        setPeerInfoOpen(false);
      }}
      containerProps={{
        display: "flex",
        flex: "1",
        flexDirection: "column",
      }}
    >
      <SlideSheetTabbedContent
        heading={node?.data.user?.longName ?? "UNK"}
        description={Protobuf.HardwareModel[node?.data.user?.hwModel ?? 0]}
        tabs={tabs}
        tabIcon={
          <Pane marginY="auto">
            <Hashicon size={32} value={(node?.data.num ?? 0).toString()} />
          </Pane>
        }
      />
    </SideSheet>
  );
};
