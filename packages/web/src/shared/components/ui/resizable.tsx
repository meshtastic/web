import { cn } from "@shared/utils/cn";
import { usePanelSizes } from "@db/hooks";
import { GripVertical } from "lucide-react";
import { useCallback, useEffectEvent, useRef } from "react";
import {
  type ImperativePanelGroupHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

type ResizablePanelGroupProps = React.ComponentProps<typeof PanelGroup> & {
  /** Unique ID for persisting panel sizes to database */
  persistId?: string;
  /** Default sizes for panels (required if persistId is set) */
  defaultSizes?: number[];
};

function ResizablePanelGroup({
  className,
  persistId,
  defaultSizes = [50, 50],
  onLayout,
  ...props
}: ResizablePanelGroupProps) {
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const [savedSizes, persistSizes] = usePanelSizes(
    persistId ?? "",
    defaultSizes,
  );
  const hasAppliedSizes = useRef(false);

  // Apply saved sizes when they load from database
  useEffectEvent(() => {
    if (
      persistId &&
      panelGroupRef.current &&
      !hasAppliedSizes.current &&
      JSON.stringify(savedSizes) !== JSON.stringify(defaultSizes)
    ) {
      hasAppliedSizes.current = true;
      panelGroupRef.current.setLayout(savedSizes);
    }
  });

  const handleLayout = useCallback(
    (sizes: number[]) => {
      // Call original onLayout if provided
      onLayout?.(sizes);

      // Persist sizes if persistId is set
      if (persistId) {
        persistSizes(sizes);
      }
    },
    [onLayout, persistId, persistSizes],
  );

  return (
    <PanelGroup
      ref={panelGroupRef}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className,
      )}
      onLayout={persistId ? handleLayout : onLayout}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel className={cn("", className)} {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <PanelResizeHandle
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <GripVertical className="h-2.5 w-2.5" />
        </div>
      )}
    </PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
