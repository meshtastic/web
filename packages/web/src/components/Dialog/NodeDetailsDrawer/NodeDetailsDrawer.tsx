import { NodeAvatar } from "@app/components/NodeAvatar";
import { Mono } from "@components/generic/Mono";
import { TimeAgo } from "@components/generic/TimeAgo";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { ScrollArea } from "@components/ui/scroll-area";
import { Separator } from "@components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet";
import useLang from "@core/hooks/useLang";
import { useFavoriteNode } from "@core/hooks/useFavoriteNode";
import { useIgnoreNode } from "@core/hooks/useIgnoreNode";
import { useAppStore, useDevice, useDeviceContext } from "@core/stores";
import { useNodes } from "@db/hooks";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import {
  BatteryIcon,
  ChevronRightIcon,
  ClockIcon,
  DropletIcon,
  FlameIcon,
  GaugeIcon,
  LightbulbIcon,
  MapPinIcon,
  MessageSquareIcon,
  QrCodeIcon,
  RouteIcon,
  SaveIcon,
  SettingsIcon,
  SignalIcon,
  StarIcon,
  ThermometerIcon,
  TrashIcon,
  UserIcon,
  VolumeXIcon,
  WindIcon,
  ZapIcon,
} from "lucide-react";
import React from "react";
import { ActionItem } from "../../generic/ActionItem";
import { ActionToggle } from "../../generic/ActionToggle";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";
import { TelemetryChart } from "./TelemetryChart";

export interface NodeDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeDetailsDrawer = ({
  open,
  onOpenChange,
}: NodeDetailsDrawerProps) => {
  const { nodeNumDetails } = useAppStore();
  const { hardware, setDialogOpen } = useDevice();
  const { current } = useLang();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  const { updateFavorite } = useFavoriteNode();
  const { updateIgnored } = useIgnoreNode();

  const [noteText, setNoteText] = React.useState("");

  const node = allNodes.find((n) => n.nodeNum === nodeNumDetails);

  if (!node) {
    return null;
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
    // Navigate to messages page with this node selected
    // TODO: Implement navigation
  };

  const handleSaveNote = () => {
    // TODO: Implement note saving
    console.log("Save note:", noteText);
  };

  // Environment metrics are no longer stored on the node directly
  // They would be in telemetry logs if needed
  const hasEnvironmentMetrics = false;

  // Get device image based on hardware model
  const getDeviceImage = (): string => {
    if (!node.hwModel) {
      return "/devices/diy.svg";
    }

    const hwModelName = Protobuf.Mesh.HardwareModel[node.hwModel]
      .toLowerCase()
      .replace(/_/g, "-");

    return `/devices/${hwModelName}.svg`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
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
                  {node.role && (
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
                <CardContent className="p-4">
                  <div className="relative">
                    <Input
                      placeholder="Add a private note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="pr-10"
                    />
                    {noteText && (
                      <button
                        onClick={handleSaveNote}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        type="button"
                      >
                        <SaveIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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
                  <ActionItem icon={RouteIcon} label="Traceroute" showChevron />
                  <ActionToggle
                    icon={StarIcon}
                    label="Favorite"
                    checked={node.isFavorite ?? false}
                    onCheckedChange={handleToggleFavorite}
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

            {/* Position Section */}
            {(node.latitudeI || node.longitudeI) && (
              <div className="space-y-3">
                <Card className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium">
                            Last position update
                          </div>
                          <Mono className="text-sm text-muted-foreground">
                            {node.lastHeard && (
                              <>
                                <TimeAgo
                                  timestamp={node.lastHeard.getTime()}
                                  locale={current?.code}
                                />{" "}
                                •{" "}
                              </>
                            )}
                            {node.latitudeI && node.longitudeI
                              ? `${(node.latitudeI / 1e7).toFixed(5)}, ${(node.longitudeI / 1e7).toFixed(5)}`
                              : "Unknown"}
                          </Mono>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Button variant="outline" className="w-full" size="sm">
                  <MapPinIcon className="mr-2 h-4 w-4" />
                  Exchange position
                </Button>
              </div>
            )}

            {/* Telemetry Charts Section */}
            <div className="space-y-3">
              <SectionHeader>Telemetry History</SectionHeader>
              <TelemetryChart nodeNum={node.nodeNum} durationHours={24} />
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
                    <ActionItem icon={SettingsIcon} label="Request Metadata" />
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
      </SheetContent>
    </Sheet>
  );
};
