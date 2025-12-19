import { Mono } from "@shared/components/generic/Mono";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import useLang from "@core/hooks/useLang";
import { useDevice } from "@core/stores";
import { usePacketLogs } from "@db/hooks/usePacketLogs";
import { Protobuf } from "@meshtastic/core";
import {
  ClipboardCopyIcon,
  DownloadIcon,
  FileText,
  FilterIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface DebugLogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimestamp(date: Date, locale: string | undefined): string {
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getPortName(portnum: number): string {
  return Protobuf.Portnums.PortNum[portnum] ?? `PORT_${portnum}`;
}

function getPriorityName(priority: number): string {
  const priorities: Record<number, string> = {
    1: "MIN",
    10: "BACKGROUND",
    64: "DEFAULT",
    70: "RELIABLE",
    120: "ACK",
    127: "MAX",
  };
  return priorities[priority] ?? `Priority ${priority}`;
}

function decodePayload(
  portnum: number,
  payload: Uint8Array | string | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;

  try {
    const bytes =
      typeof payload === "string"
        ? Uint8Array.from(payload, (c) => c.charCodeAt(0))
        : payload;

    switch (portnum) {
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP:
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        return { message: new TextDecoder().decode(bytes) };
      case Protobuf.Portnums.PortNum.ROUTING_APP:
        return Protobuf.Mesh.Routing.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.ADMIN_APP:
        return Protobuf.Admin.AdminMessage.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.POSITION_APP:
        return Protobuf.Mesh.Position.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.NODEINFO_APP:
        return Protobuf.Mesh.User.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.TELEMETRY_APP:
        return Protobuf.Telemetry.Telemetry.fromBinary(
          bytes,
        ).toJson() as Record<string, unknown>;
      case Protobuf.Portnums.PortNum.WAYPOINT_APP:
        return Protobuf.Mesh.Waypoint.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.TRACEROUTE_APP:
        return Protobuf.Mesh.RouteDiscovery.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.NEIGHBORINFO_APP:
        return Protobuf.Mesh.NeighborInfo.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.STORE_FORWARD_APP:
        return Protobuf.StoreAndForward.StoreAndForward.fromBinary(
          bytes,
        ).toJson() as Record<string, unknown>;
      case Protobuf.Portnums.PortNum.PAXCOUNTER_APP:
        return Protobuf.Paxcount.Paxcount.fromBinary(bytes).toJson() as Record<
          string,
          unknown
        >;
      case Protobuf.Portnums.PortNum.REMOTE_HARDWARE_APP:
        return Protobuf.RemoteHardware.HardwareMessage.fromBinary(
          bytes,
        ).toJson() as Record<string, unknown>;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function PacketEntry({
  packet,
  locale,
  onCopy,
}: {
  packet: ReturnType<typeof usePacketLogs>["packets"][0];
  locale: string | undefined;
  onCopy: (text: string) => void;
}) {
  const rawPacket = packet.rawPacket as Record<string, unknown> | null;
  const decoded = rawPacket?.decoded as Record<string, unknown> | undefined;
  const portnum = decoded?.portnum as number | undefined;
  const payload = decoded?.payload as string | Uint8Array | undefined;
  const priority = rawPacket?.priority as number | undefined;
  const wantAck = rawPacket?.wantAck as boolean | undefined;
  const requestId = decoded?.requestId as number | undefined;

  const decodedPayload =
    portnum !== undefined ? decodePayload(portnum, payload) : null;

  const copyPacketData = () => {
    const data = JSON.stringify(rawPacket, null, 2);
    onCopy(data);
  };

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-lg">Packet</span>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyPacketData}
              >
                <ClipboardCopyIcon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy packet JSON</TooltipContent>
          </Tooltip>
          <Mono className="text-base text-muted-foreground">
            {formatTimestamp(packet.rxTime, locale)}
          </Mono>
        </div>
      </div>

      <div className="space-y-1 text-base font-mono">
        {packet.fromNode !== undefined && (
          <div>
            <span className="text-muted-foreground">from: </span>
            <span>{packet.fromNode}</span>
            <span className="text-green-500 ml-1">
              (!{packet.fromNode.toString(16)})
            </span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">to: </span>
          <span>
            {packet.toNode === 0xffffffff ? "4294967295" : packet.toNode}
          </span>
          {packet.toNode !== null && (
            <span className="text-green-500 ml-1">
              (!{packet.toNode.toString(16)})
            </span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">id: </span>
          <span>{rawPacket?.id as number}</span>
        </div>
        <div>
          <span className="text-muted-foreground">rx_time: </span>
          <span>{Math.floor(packet.rxTime.getTime() / 1000)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">hop_limit: </span>
          <span>{packet.hopLimit}</span>
        </div>
        {wantAck !== undefined && (
          <div>
            <span className="text-muted-foreground">want_ack: </span>
            <span>{wantAck ? "true" : "false"}</span>
          </div>
        )}
        {priority !== undefined && (
          <div>
            <span className="text-muted-foreground">priority: </span>
            <span>{getPriorityName(priority)}</span>
          </div>
        )}

        {decoded && (
          <div className="mt-1">
            <span className="text-muted-foreground">decoded {"{"}</span>
            <div className="ml-4">
              {portnum !== undefined && (
                <div>
                  <span className="text-muted-foreground">portnum: </span>
                  <span>{getPortName(portnum)}</span>
                </div>
              )}
              {payload && (
                <div>
                  <span className="text-muted-foreground">payload: </span>
                  <span className="break-all">
                    "{typeof payload === "string" ? payload : "[binary]"}"
                  </span>
                </div>
              )}
              {requestId !== undefined && (
                <div>
                  <span className="text-muted-foreground">request_id: </span>
                  <span>{requestId}</span>
                </div>
              )}
            </div>
            <span className="text-muted-foreground">{"}"}</span>
          </div>
        )}
      </div>

      {decodedPayload && (
        <div className="mt-3">
          <div className="text-green-500 font-semibold mb-2">Decoded Payload:</div>
          <div className="text-base font-mono bg-muted/30 p-3 rounded space-y-1">
            {Object.entries(decodedPayload).map(([key, value]) => (
              <div key={key}>
                <span className="text-muted-foreground">{key}: </span>
                <span>
                  {typeof value === "object" && value !== null
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PacketLogContent() {
  const { t } = useTranslation("config");
  const { current } = useLang();
  const device = useDevice();
  const { packets } = usePacketLogs(device.id, 200);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPackets = useMemo(() => {
    if (!searchQuery.trim()) return packets;
    const query = searchQuery.toLowerCase();
    return packets.filter((packet) => {
      const rawPacket = packet.rawPacket as Record<string, unknown> | null;
      const decoded = rawPacket?.decoded as Record<string, unknown> | undefined;
      const portnum = decoded?.portnum as number | undefined;
      const portName =
        portnum !== undefined ? getPortName(portnum).toLowerCase() : "";

      return (
        packet.fromNode.toString(16).includes(query) ||
        packet.toNode?.toString(16).includes(query) ||
        portName.includes(query) ||
        JSON.stringify(rawPacket).toLowerCase().includes(query)
      );
    });
  }, [packets, searchQuery]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    const data = JSON.stringify(packets, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `packet-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Input
          placeholder="Search in logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm">
              Filters
              <FilterIcon className="size-5 ml-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Filter packets by type</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <DownloadIcon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export logs as JSON</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1">
        {filteredPackets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t("settings.advanced.debugLog.noPackets", "No packets logged")}
          </div>
        ) : (
          filteredPackets.map((packet) => (
            <PacketEntry
              key={packet.id}
              packet={packet}
              locale={current?.code}
              onCopy={handleCopy}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}

function DebugLogDrawer({ open, onOpenChange }: DebugLogDrawerProps) {
  const device = useDevice();
  const { clearLogs } = usePacketLogs(device.id, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0">
        <TooltipProvider>
          <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
            <SheetTitle>Debug Panel</SheetTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearLogs()}
                  className="h-8 w-8 mr-8"
                >
                  <Trash2Icon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all logs</TooltipContent>
            </Tooltip>
          </SheetHeader>
          <div className="h-[calc(100vh-5rem)]">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <PacketLogContent />
            </Suspense>
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

export function DebugLog() {
  const { t } = useTranslation("config");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setDrawerOpen(true)}
      >
        <FileText className="size-5 mr-2" />
        {t("settings.advanced.debugLog.button.open", "View Debug Log")}
      </Button>
      <DebugLogDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
