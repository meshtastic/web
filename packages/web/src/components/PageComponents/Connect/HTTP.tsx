import type { TabElementProps } from "@components/Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Circle,
  Clock,
  Lock,
  LockOpen,
  MessageCircle,
  Plus,
  Server,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";
import type { SavedServer } from "@core/stores/appStore.ts";

interface AddServerFormData {
  hostname: string;
  secure: boolean;
}

export const HTTP = ({ closeDialog }: TabElementProps) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState<string | null>(
    null,
  );
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isURLHTTPS = location.protocol === "https:";

  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const {
    setSelectedDevice,
    addSavedServer,
    removeSavedServer,
    clearSavedServers,
    getSavedServers,
  } = useAppStore();

  const savedServers = getSavedServers();

  const { register, handleSubmit, reset, setValue, watch } = useForm<
    AddServerFormData
  >({
    defaultValues: {
      hostname: ["client.meshtastic.org", "localhost"].includes(
          globalThis.location.hostname,
        )
        ? "meshtastic.local"
        : globalThis.location.host,
      secure: isURLHTTPS,
    },
  });

  const secureValue = watch("secure");

  const connectToServer = async (server: SavedServer) => {
    setConnectingToServer(server.url);
    setConnectionError(null);

    try {
      const id = randId();
      const transport = await TransportHTTP.create(
        server.host,
        server.protocol === "https",
      );
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      // Update last used time
      addSavedServer(server.host, server.protocol);

      closeDialog();
    } catch (error) {
      console.error("Connection error:", error);
      setConnectionError(`Failed to connect to ${server.host}`);
    } finally {
      setConnectingToServer(null);
    }
  };

  const handleAddServer = handleSubmit(async (data) => {
    setConnectionInProgress(true);
    setConnectionError(null);

    try {
      const protocol = data.secure ? "https" : "http";
      const id = randId();
      const transport = await TransportHTTP.create(data.hostname, data.secure);
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      // Save to history
      addSavedServer(data.hostname, protocol);

      setAddServerOpen(false);
      reset();
      closeDialog();
    } catch (error) {
      console.error("Connection error:", error);
      setConnectionError(`Failed to connect to ${data.hostname}`);
    } finally {
      setConnectionInProgress(false);
    }
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "online":
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case "offline":
        return <Circle className="h-3 w-3 fill-red-500 text-red-500" />;
      case "checking":
        return (
          <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500 animate-spin" />
        );
      default:
        return <Circle className="h-3 w-3 fill-slate-300 text-slate-300" />;
    }
  };

  const getSecurityIcon = (protocol: "http" | "https") => {
    return protocol === "https"
      ? <Lock className="h-4 w-4 text-green-600" />
      : <LockOpen className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "checking":
        return "Checking...";
      default:
        return "Unknown";
    }
  };

  return (
    <>
      <div
        className="flex w-full flex-col gap-3 p-4"
        style={{ minHeight: "12rem" }}
      >
        {/* Server List Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Meshtastic Servers
            </span>
          </div>
          {savedServers.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSavedServers}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Server List */}
        <div className="flex-1 space-y-2 max-h-48 overflow-y-auto">
          {savedServers.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Server className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No saved servers yet
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Add your first Meshtastic node to get started
                </p>
              </div>
            )
            : (
              savedServers.slice(0, 5).map((server) => (
                <div
                  key={server.url}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(server.status)}
                  </div>

                  {/* Server Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {server.host}
                      </span>
                      {getSecurityIcon(server.protocol)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        {(() => {
                          let statusBgColor = "";
                          if (server.status === "online") {
                            statusBgColor = "bg-green-500";
                          } else if (server.status === "offline") {
                            statusBgColor = "bg-red-500";
                          } else {
                            statusBgColor = "bg-yellow-500";
                          }
                          return (
                            <span
                              className={`w-2 h-2 rounded-full ${statusBgColor}`}
                            />
                          );
                        })()}
                        {getStatusText(server.status)}
                      </span>

                      {/* Device info if available */}
                      {server.deviceInfo?.model && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">
                            {server.deviceInfo.model}
                          </span>
                        </>
                      )}

                      {server.deviceInfo?.nodeCount && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {server.deviceInfo.nodeCount}
                          </span>
                        </>
                      )}

                      {server.deviceInfo?.unreadCount &&
                        server.deviceInfo.unreadCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <MessageCircle className="h-3 w-3" />
                            {server.deviceInfo.unreadCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => connectToServer(server)}
                      disabled={connectingToServer === server.url}
                      className="h-8 px-3"
                    >
                      {connectingToServer === server.url
                        ? <Clock className="h-3 w-3 mr-1 animate-spin" />
                        : <Wifi className="h-3 w-3 mr-1" />}
                      Connect
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSavedServer(server.url)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Add New Server Button */}
        <Button
          variant="outline"
          onClick={() => setAddServerOpen(true)}
          className="w-full h-10 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Server
        </Button>

        {/* Connection Error */}
        {connectionError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {connectionError}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Server Dialog */}
      <Dialog open={addServerOpen} onOpenChange={setAddServerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Server
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddServer} className="space-y-4">
            <div>
              <Label htmlFor="hostname">Hostname or IP Address</Label>
              <Input
                id="hostname"
                placeholder="meshtastic.local or 192.168.1.100"
                className="mt-1"
                {...register("hostname", { required: true })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={isURLHTTPS || secureValue}
                onCheckedChange={(checked) => setValue("secure", checked)}
                disabled={isURLHTTPS}
                {...register("secure")}
              />
              <Label className="flex items-center gap-2">
                {secureValue
                  ? <Lock className="h-4 w-4 text-green-600" />
                  : <LockOpen className="h-4 w-4 text-yellow-600" />}
                Use HTTPS (Secure)
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddServerOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connectionInProgress}
                className="flex-1"
              >
                {connectionInProgress
                  ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  )
                  : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
