import { useState } from "react";
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
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Clock,
  Lock,
  LockOpen,
  Plus,
  Server,
  Trash2,
  Wifi,
} from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";
import type { SavedServer } from "@core/stores/appStore.ts";

interface AddServerFormData {
  hostname: string;
  secure: boolean;
}

interface HTTPServerSectionProps {
  onConnect?: () => void;
}

export const HTTPServerSection = ({ onConnect }: HTTPServerSectionProps) => {
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

      addSavedServer(server.host, server.protocol);

      onConnect?.();
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

      addSavedServer(data.hostname, protocol);

      setAddServerOpen(false);
      reset();
      onConnect?.();
    } catch (error) {
      console.error("Connection error:", error);
      setConnectionError(`Failed to connect to ${data.hostname}`);
    } finally {
      setConnectionInProgress(false);
    }
  });

  const getSecurityIcon = (protocol: "http" | "https") => {
    return protocol === "https"
      ? <Lock className="h-4 w-4 text-green-600" />
      : <LockOpen className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              HTTP Servers
            </h3>
          </div>
          {savedServers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSavedServers}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Server List */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          {savedServers.length === 0
            ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                <Server className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No HTTP servers added yet</p>
              </div>
            )
            : (
              savedServers.slice(0, 5).map((server) => (
                <div
                  key={server.url}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-sm transition-shadow"
                >
                  {/* Server Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {server.host}
                      </span>
                      {getSecurityIcon(server.protocol)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => connectToServer(server)}
                      disabled={connectingToServer === server.url}
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
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </div>
              ))
            )}

          {/* Add Server Button */}
          <Button
            variant="outline"
            onClick={() => setAddServerOpen(true)}
            className="w-full border-dashed hover:border-solid"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add HTTP Server
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
      </div>

      {/* Add Server Dialog */}
      <Dialog open={addServerOpen} onOpenChange={setAddServerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add HTTP Server
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
