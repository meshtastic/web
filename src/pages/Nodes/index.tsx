// @/pages/NodesPage.tsx (abbreviated)
import { useVirtualizer } from "@tanstack/react-virtual";
import { JSX, useCallback, useDeferredValue, useRef, useState } from "react";
import { NodeRow } from "./NodeRow.tsx";
import {
  FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
// ... other imports

const NodesPage = (): JSX.Element => {
  const { getNodes, hasNodeError, setDialogOpen } = useDevice();
  const { setNodeNumDetails } = useAppStore();
  const { nodeFilter, defaultFilterValues } = useFilterNode();

  // No changes to filtering logic, `useDeferredValue` is still a great choice
  const [filterState, setFilterState] = useState<FilterState>(() =>
    defaultFilterValues
  );
  const deferredFilterState = useDeferredValue(filterState);
  const filteredNodes = getNodes((node) =>
    nodeFilter(node, deferredFilterState)
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimate row height in pixels
    overscan: 5, // Render 5 extra items in each direction
  });

  const handleNodeInfoDialog = useCallback(
    (nodeNum: number): void => {
      setNodeNumDetails(nodeNum);
      setDialogOpen("nodeDetails", true);
    },
    [setNodeNumDetails, setDialogOpen],
  );

  return (
    <>
      <PageLayout label="" leftBar={<Sidebar />}>
        {/* ... Filter controls ... */}

        {/* Your scrollable container with the ref */}
        <div ref={parentRef} className="overflow-y-auto h-[calc(100vh-200px)]">
          {/* Adjust height as needed */}
          {/* A container to set the total size of the virtual list */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {/* Map over the virtual items, not the full filteredNodes array */}
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const node = filteredNodes[virtualItem.index];
              return (
                <NodeRow
                  key={node.num}
                  node={node}
                  hasNodeError={hasNodeError}
                  onNodeInfo={handleNodeInfoDialog}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* ... Dialogs ... */}
      </PageLayout>
    </>
  );
};

export default NodesPage;
