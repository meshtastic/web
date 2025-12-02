import { ChannelsConfig } from "@components/PageComponents/Settings/Channels/ChannelsConfig";
import { LoRaConfig } from "@components/PageComponents/Settings/LoRa/LoRaConfig";
import { SecurityConfig } from "@components/PageComponents/Settings/Security/SecurityConfig";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { ScrollArea } from "@components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Separator } from "@components/ui/separator";
import { Slider } from "@components/ui/slider";
import { Spinner } from "@components/ui/spinner";
import { Switch } from "@components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/ui/tabs";
import { cn } from "@core/utils/cn";
import type { UseFormReturn } from "react-hook-form";
import {
  Bell,
  Check,
  Copy,
  LayersIcon,
  Radio,
  RadioTowerIcon,
  RefreshCwIcon,
  RouterIcon,
  SaveIcon,
  Shield,
  Wifi,
} from "lucide-react";
import { useState } from "react";

type SettingsSection =
  | "radio"
  | "device"
  | "module"
  | "notifications"
  | "security";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("radio");
  const [copied, setCopied] = useState(false);
  const [transmitPower, setTransmitPower] = useState([30]);
  const [bandwidth, setBandwidth] = useState([125]);
  const [spreadFactor, setSpreadFactor] = useState([7]);
  const [codingRate, setCodingRate] = useState([5]);
  const [frequencyOffset, setFrequencyOffset] = useState([0]);
  const nodeId = "!abc123def";

  const copyNodeId = () => {
    navigator.clipboard.writeText(nodeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      key: "radio" as const,
      label: "Radio Config",
      icon: RadioTowerIcon,
      changeCount: 0,
    },
    {
      key: "device" as const,
      label: "Device Config",
      icon: RouterIcon,
      changeCount: 0,
    },
    {
      key: "module" as const,
      label: "Module Config",
      icon: LayersIcon,
      changeCount: 0,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Sidebar - Navigation */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Configuration</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors",
                  activeSection === section.key
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <section.icon className="h-4 w-4" />
                  <span className="text-sm">{section.label}</span>
                </div>
                {section.changeCount > 0 && (
                  <Badge
                    variant="rounded"
                    className="h-5 min-w-5 justify-center bg-primary text-primary-foreground"
                  >
                    {section.changeCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <h1 className="text-lg font-semibold">
            {sections.find((s) => s.key === activeSection)?.label}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button size="sm">
              <SaveIcon className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {activeSection === "radio" && (
            <Tabs defaultValue="lora" className="space-y-4">
              <TabsList>
                <TabsTrigger value="lora">LoRa</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              <TabsContent value="lora">
                <LoRaConfig />
              </TabsContent>
              <TabsContent value="channels">
                <ChannelsConfig />
              </TabsContent>
              <TabsContent value="security">
                <SecurityConfig />
              </TabsContent>
            </Tabs>
          )}

          {activeSection !== "radio" && (
            <div className="max-w-4xl space-y-6">

            {activeSection === "device" && (
              <>
                {/* User Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="h-5 w-5" />
                      Node Identity
                    </CardTitle>
                    <CardDescription>
                      Configure your node's name and identity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="longName">Long Name</Label>
                      <Input
                        id="longName"
                        defaultValue="My Node"
                        maxLength={40}
                        placeholder="Enter long name (max 40 chars)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Full name for your node (1-40 characters)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortName">Short Name</Label>
                      <Input
                        id="shortName"
                        defaultValue="MYND"
                        maxLength={4}
                        minLength={2}
                        className="w-32"
                        placeholder="ABCD"
                      />
                      <p className="text-xs text-muted-foreground">
                        Short identifier (2-4 characters)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nodeId">Node ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="nodeId"
                          value={nodeId}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyNodeId}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Unique identifier for this node
                      </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Unmessageable</Label>
                        <p className="text-sm text-muted-foreground">
                          Prevent other nodes from sending direct messages
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Licensed Operator</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable licensed amateur radio features
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                {/* Device Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RouterIcon className="h-5 w-5" />
                      Device Settings
                    </CardTitle>
                    <CardDescription>
                      General device configuration and behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Node Role</Label>
                      <Select defaultValue="client">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="client_mute">Client Mute</SelectItem>
                          <SelectItem value="router">Router</SelectItem>
                          <SelectItem value="router_client">Router Client</SelectItem>
                          <SelectItem value="repeater">Repeater</SelectItem>
                          <SelectItem value="tracker">Tracker</SelectItem>
                          <SelectItem value="sensor">Sensor</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Defines how this node behaves in the mesh
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Rebroadcast Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          How this node rebroadcasts messages
                        </p>
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="all_skip_decoding">
                            All Skip Decoding
                          </SelectItem>
                          <SelectItem value="local_only">Local Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Serial Console</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable serial debugging output
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Debug Log</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable debug logging to serial console
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                {/* Position Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Position Settings
                    </CardTitle>
                    <CardDescription>
                      Configure GPS and location sharing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Position Flags</Label>
                      <Select defaultValue="enabled">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Unset</SelectItem>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="positionBroadcastSecs">
                        Position Broadcast Interval
                      </Label>
                      <Input
                        id="positionBroadcastSecs"
                        type="number"
                        defaultValue="900"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Seconds between position broadcasts (0 = disabled)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gpsUpdateInterval">
                        GPS Update Interval
                      </Label>
                      <Input
                        id="gpsUpdateInterval"
                        type="number"
                        defaultValue="120"
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Seconds between GPS position updates
                      </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Fixed Position</Label>
                        <p className="text-sm text-muted-foreground">
                          Use a fixed position instead of GPS
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "module" && (
              <Card>
                <CardHeader>
                  <CardTitle>Module Configuration</CardTitle>
                  <CardDescription>
                    Configure module-specific settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Module configuration content coming soon...
                  </p>
                </CardContent>
              </Card>
            )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
