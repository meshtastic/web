import { Mono } from "@shared/components/generic/Mono";
import { TimeAgo } from "@shared/components/generic/TimeAgo";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import { CircularProgress } from "@shared/components/ui/circular-progress";
import { Input } from "@shared/components/ui/input";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { Separator } from "@shared/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { Skeleton } from "@shared/components/ui/skeleton";
import { useFavoriteNode } from "@core/hooks/useFavoriteNode";
import { useGetMyNode } from "@core/hooks/useGetMyNode";
import { useIgnoreNode } from "@core/hooks/useIgnoreNode";
import useLang from "@core/hooks/useLang";
import { useTraceroute } from "@core/hooks/useTraceroute";
import { useDevice, useDeviceContext, useUIStore } from "@core/stores";
import { isDefined } from "@shared/utils/typeGuards";
import { useNodes } from "@data/hooks";
import { nodeRepo } from "@data/repositories";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useNavigate } from "@tanstack/react-router";
import {
  BatteryIcon,
  CableIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  MessageSquareIcon,
  QrCodeIcon,
  SaveIcon,
  SettingsIcon,
  SignalIcon,
  StarIcon,
  ThermometerIcon,
  TrashIcon,
  UserIcon,
  VolumeXIcon,
  ZapIcon,
} from "lucide-react";
import React, { Activity, lazy, Suspense } from "react";
import { ActionItem } from "../../generic/ActionItem.tsx";
import { ActionToggle } from "../../generic/ActionToggle.tsx";
import { TraceRoute } from "@features/messages/components/TraceRoute";
import { SectionHeader } from "./SectionHeader.tsx";

const MiniMap = lazy(() =>
  import("./MiniMap.tsx").then((m) => ({ default: m.MiniMap })),
);
const TelemetryChart = lazy(() =>
  import("./TelemetryChart.tsx").then((m) => ({ default: m.TelemetryChart })),
);
const SignalMetricsLog = lazy(() =>
  import("./SignalMetricsLog.tsx").then((m) => ({
    default: m.SignalMetricsLog,
  })),
);

interface PositionSectionProps {
  node: { lastHeard: Date | null; altitude: number | null };
  latitudeI: number;
  longitudeI: number;
  locale: string | undefined;
  onNavigateToMap: (lat: number, long: number) => void;
}

function PositionSection({
  node,
  latitudeI,
  longitudeI,
  locale,
  onNavigateToMap,
}: PositionSectionProps) {
  const latitude = latitudeI / 1e7;
  const longitude = longitudeI / 1e7;

  return (
    <div className="space-y-3">
      <SectionHeader>Position</SectionHeader>
      <Card className="bg-muted/20 overflow-hidden">
        <div className="relative h-40">
          <Suspense
            fallback={<Skeleton className="absolute inset-0 rounded-none" />}
          >
            <MiniMap
              latitude={latitude}
              longitude={longitude}
              altitude={node.altitude}
              className="absolute inset-0"
            />
          </Suspense>
        </div>
        <CardContent className="p-0 border-t">
          <button
            type="button"
            onClick={() => onNavigateToMap(latitude, longitude)}
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Last position update</div>
                <Mono className="text-sm text-muted-foreground">
                  {node.lastHeard && (
                    <>
                      <TimeAgo
                        timestamp={node.lastHeard.getTime()}
                        locale={locale}
                      />{" "}
                      •{" "}
                    </>
                  )}
                  {`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
                </Mono>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" size="sm">
        <MapPinIcon className="mr-2 h-4 w-4" />
        Exchange position
      </Button>
    </div>
  );
}

export interface NodeDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeDetailsDrawer = ({
  open,
  onOpenChange,
}: NodeDetailsDrawerProps) => {
  const { hardware, setDialogOpen } = useDevice();
  const { current } = useLang();
  const { deviceId } = useDeviceContext();
  const { nodeNumDetails } = useUIStore();
  const { updateFavorite } = useFavoriteNode();
  const { updateIgnored } = useIgnoreNode();
  const { myNodeNum, myNode } = useGetMyNode();
  const { nodeMap } = useNodes(deviceId);
  const navigate = useNavigate();

  // Look up the selected node from nodeMap, or fall back to myNode if not found
  const node = nodeNumDetails ? nodeMap.get(nodeNumDetails) : myNode;

  // Traceroute hook - must be called unconditionally
  const {
    isRunning: isTracerouteRunning,
    progress: tracerouteProgress,
    result: tracerouteResult,
    startTraceroute,
  } = useTraceroute({ nodeNum: nodeNumDetails ?? 0 });

  // Check if this node is the connected device (can't traceroute to self)
  const isOwnNode = node?.nodeNum === myNodeNum;

  const [noteText, setNoteText] = React.useState(node?.privateNote ?? "");
  const [isSavingNote, setIsSavingNote] = React.useState(false);

  // Drawer navigation state machine
  type DrawerState = { page: "main" } | { page: "signal-log"; from: "main" };

  type DrawerAction =
    | { type: "SHOW_SIGNAL_LOG" }
    | { type: "GO_BACK" }
    | { type: "RESET" };

  const drawerReducer = (
    state: DrawerState,
    action: DrawerAction,
  ): DrawerState => {
    switch (action.type) {
      case "SHOW_SIGNAL_LOG":
        if (state.page === "main") {
          return { page: "signal-log", from: "main" };
        }
        return state;
      case "GO_BACK":
        if (state.page === "signal-log") {
          return { page: state.from };
        }
        return state;
      case "RESET":
        return { page: "main" };
      default:
        return state;
    }
  };

  const [drawerState, dispatchDrawer] = React.useReducer(drawerReducer, {
    page: "main",
  });

  // Reset navigation when drawer closes or node changes
  React.useEffect(() => {
    if (!open) {
      dispatchDrawer({ type: "RESET" });
    }
  }, [open]);

  React.useEffect(() => {
    dispatchDrawer({ type: "RESET" });
  }, []);

  // Sync noteText when node changes or drawer opens with a different node
  React.useEffect(() => {
    setNoteText(node?.privateNote ?? "");
  }, [node?.privateNote]);

  if (!node) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <VisuallyHidden>
            <SheetTitle>Node Details</SheetTitle>
          </VisuallyHidden>
        </SheetContent>
      </Sheet>
    );
  }

  const shortName =
    node.shortName ?? numberToHexUnpadded(node.nodeNum).slice(-4).toUpperCase();
  const longName = node.longName ?? `Meshtastic ${shortName}`;
  const userId = node.userId ?? "";

  const handleToggleFavorite = () => {
    updateFavorite({ nodeNum: node.nodeNum, isFavorite: !node.isFavorite });
  };

  const handleToggleIgnore = () => {
    updateIgnored({ nodeNum: node.nodeNum, isIgnored: !node.isIgnored });
  };

  const handleRemoveNode = () => {
    setDialogOpen("nodeRemoval", true);
    onOpenChange(false);
  };

  const handleDirectMessage = () => {
    onOpenChange(false);
    navigate({ to: "/messages", search: { node: node.nodeNum } });
  };

  const handleSaveNote = () => {
    setIsSavingNote(true);
    const noteValue = noteText.trim() || null;
    nodeRepo
      .updatePrivateNote(deviceId, node.nodeNum, noteValue)
      .then(() => setIsSavingNote(false))
      .catch((error) => {
        console.error("Failed to save note:", error);
        setIsSavingNote(false);
      });
  };

  // Check if there are unsaved changes to the note
  const hasNoteChanges = noteText !== (node.privateNote ?? "");

  // Environment metrics are no longer stored on the node directly
  // They would be in telemetry logs if needed
  const hasEnvironmentMetrics = false;

  // Get device image based on hardware model
  const getDeviceImage = (): string => {
    if (!node.hwModel) {
      return "/devices/diy.svg";
    }

    const hwModelName = Protobuf.Mesh.HardwareModel[node.hwModel]
      ?.toLowerCase()
      ?.replace(/_/g, "-");

    return `/devices/${hwModelName}.svg`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        {drawerState.page === "signal-log" && (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <SignalMetricsLog
              nodeNum={node.nodeNum}
              nodeName={longName}
              deviceId={deviceId}
              onBack={() => dispatchDrawer({ type: "GO_BACK" })}
            />
          </Suspense>
        )}
        {drawerState.page === "main" && (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader>
                <SheetTitle>{longName}</SheetTitle>
              </SheetHeader>

              {/* Device Section */}
              {node.hwModel && (
                <div className="space-y-3">
                  <Card className="bg-muted/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-center py-4">
                        <img
                          src={getDeviceImage()}
                          alt={Protobuf.Mesh.HardwareModel[node.hwModel]}
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">
                            Hardware
                          </div>
                          <Mono className="text-sm">
                            {Protobuf.Mesh.HardwareModel[node.hwModel]}
                          </Mono>
                        </div>
                      </div>
                      {node.publicKey && node.publicKey.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Supported
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Details Section */}
              <div className="space-y-3">
                <SectionHeader>Details</SectionHeader>
                <Card className="bg-muted/20">
                  <CardContent className="p-0 divide-y">
                    <div className="p-4 flex items-center gap-3">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Long Name
                        </div>
                        <Mono className="text-sm">{longName}</Mono>
                      </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Short Name
                        </div>
                        <Mono className="text-sm">{shortName}</Mono>
                      </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                      <span className="h-5 w-5 flex items-center justify-center text-muted-foreground font-mono">
                        #
                      </span>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Node Number
                        </div>
                        <Mono className="text-sm">{node.nodeNum}</Mono>
                      </div>
                    </div>
                    {userId && (
                      <div className="p-4 flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            User ID
                          </div>
                          <Mono className="text-sm">{userId}</Mono>
                        </div>
                      </div>
                    )}
                    {node.role != null && (
                      <div className="p-4 flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Device Role
                          </div>
                          <Mono className="text-sm">
                            {
                              Protobuf.Config.Config_DeviceConfig_Role[
                                node.role
                              ]
                            }
                          </Mono>
                        </div>
                      </div>
                    )}
                    {node.lastHeard ? (
                      <div className="p-4 flex items-center gap-3">
                        <ClockIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Last heard
                          </div>
                          <Mono className="text-sm">
                            <TimeAgo
                              timestamp={node.lastHeard.getTime()}
                              locale={current?.code}
                            />
                          </Mono>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              {/* Notes Section */}
              <div className="space-y-3">
                <SectionHeader>Notes</SectionHeader>
                <Card className="bg-muted/20">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Add a private note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    {hasNoteChanges && (
                      <Button
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        size="sm"
                        className="w-full"
                      >
                        <SaveIcon className="h-4 w-4 mr-2" />
                        {isSavingNote ? "Saving..." : "Save Note"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Actions Section */}
              <div className="space-y-3">
                <SectionHeader>Actions</SectionHeader>
                <Card className="bg-muted/20">
                  <CardContent className="p-0 divide-y">
                    <ActionItem
                      icon={QrCodeIcon}
                      label="Share Contact"
                      showChevron
                    />
                    <ActionItem
                      icon={MessageSquareIcon}
                      label="Direct Message"
                      onClick={handleDirectMessage}
                      showChevron
                    />
                    <ActionItem
                      icon={UserIcon}
                      label="Exchange user info"
                      showChevron
                    />
                    <Activity mode={!isOwnNode ? "visible" : "hidden"}>
                      <ActionItem
                        icon={CableIcon}
                        label="Traceroute"
                        onClick={startTraceroute}
                        isDisabled={isOwnNode}
                        isActive={isTracerouteRunning}
                        activeIndicator={
                          <CircularProgress
                            progress={tracerouteProgress}
                            size={16}
                            className="text-primary"
                          />
                        }
                        showChevron
                      />
                    </Activity>
                    <ActionToggle
                      icon={StarIcon}
                      label="Favorite"
                      checked={node.isFavorite ?? false}
                      onCheckedChange={handleToggleFavorite}
                      checkedClassName="fill-yellow-400 text-yellow-500"
                    />
                    <ActionToggle
                      icon={VolumeXIcon}
                      label="Ignore"
                      checked={node.isIgnored ?? false}
                      onCheckedChange={handleToggleIgnore}
                    />
                    <ActionItem
                      icon={TrashIcon}
                      label="Remove"
                      onClick={handleRemoveNode}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Traceroute Result Section */}
              {tracerouteResult && (
                <div className="space-y-3">
                  <SectionHeader>Traceroute Result</SectionHeader>
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <TraceRoute
                        route={tracerouteResult.data.route ?? []}
                        routeBack={tracerouteResult.data.routeBack ?? []}
                        from={{
                          longName: myNode?.longName ?? null,
                          shortName: myNode?.shortName ?? null,
                          nodeNum: myNodeNum ?? 0,
                        }}
                        to={{
                          longName: node.longName,
                          shortName: node.shortName,
                          nodeNum: node.nodeNum,
                        }}
                        snrTowards={(
                          tracerouteResult.data.snrTowards ?? []
                        ).map((snr) => snr / 4)}
                        snrBack={(tracerouteResult.data.snrBack ?? []).map(
                          (snr) => snr / 4,
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Position Section */}
              {isDefined(node.latitudeI) && isDefined(node.longitudeI) && (
                <PositionSection
                  node={node}
                  latitudeI={node.latitudeI}
                  longitudeI={node.longitudeI}
                  locale={current?.code}
                  onNavigateToMap={(lat, long) => {
                    onOpenChange(false);
                    navigate({
                      to: "/map/$long/$lat/$zoom",
                      params: { long, lat, zoom: 15 },
                    });
                  }}
                />
              )}

              {/* Telemetry Charts Section */}
              <div className="space-y-3">
                <SectionHeader>Telemetry History</SectionHeader>
                <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                  <TelemetryChart nodeNum={node.nodeNum} durationHours={24} />
                </Suspense>
              </div>

              {/* Logs Section */}
              <div className="space-y-3">
                <SectionHeader>Logs</SectionHeader>
                <Card className="bg-muted/20">
                  <CardContent className="p-0 divide-y">
                    {hasEnvironmentMetrics ? (
                      <>
                        <ActionItem
                          icon={ZapIcon}
                          label="Device Metrics Log"
                          showChevron
                        />
                        <ActionItem
                          icon={ThermometerIcon}
                          label="Environment Metrics Log"
                          showChevron
                        />
                        <ActionItem
                          icon={BatteryIcon}
                          label="Power Metrics Log"
                          showChevron
                        />
                      </>
                    ) : (
                      <ActionItem
                        icon={SignalIcon}
                        label="Signal Metrics Log"
                        onClick={() =>
                          dispatchDrawer({ type: "SHOW_SIGNAL_LOG" })
                        }
                        showChevron
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Administration Section */}
              {node.nodeNum !== hardware.myNodeNum && (
                <div className="space-y-3">
                  <SectionHeader>Administration</SectionHeader>
                  <Card className="bg-muted/20">
                    <CardContent className="p-0 divide-y">
                      <ActionItem
                        icon={SettingsIcon}
                        label="Request Metadata"
                      />
                      <ActionItem
                        icon={SettingsIcon}
                        label="Remote Administration"
                        showChevron
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
