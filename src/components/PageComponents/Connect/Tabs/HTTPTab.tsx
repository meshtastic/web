import { useState } from "react";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import {
  formatHostnameForConnection,
  formatHostnameForTransport,
  parseHostname,
} from "@core/utils/hostname.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  Clock,
  Edit,
  Lock,
  LockOpen,
  Plus,
  Server,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";
import type { SavedServer } from "@core/stores/appStore.ts";
import { useTranslation } from "react-i18next";

interface AddServerFormData {
  hostname: string;
  secure: boolean;
}

interface EditServerFormData {
  hostname: string;
  secure: boolean;
}

interface HTTPTabProps {
  closeDialog: () => void;
}

export const HTTPTab = ({ closeDialog }: HTTPTabProps) => {
  const { t } = useTranslation("dialog");
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState<string | null>(
    null,
  );
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [editServerOpen, setEditServerOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<SavedServer | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [addServerError, setAddServerError] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<
    AddServerFormData | null
  >(null);
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

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    setValue: setValueAdd,
    watch: watchAdd,
  } = useForm<AddServerFormData>({
    defaultValues: {
      hostname: ["client.meshtastic.org", "localhost"].includes(
          globalThis.location.hostname,
        )
        ? "meshtastic.local"
        : globalThis.location.host,
      secure: true,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    watch: watchEdit,
  } = useForm<EditServerFormData>({
    defaultValues: {
      hostname: "",
      secure: false,
    },
  });

  const secureValueAdd = watchAdd("secure");
  const secureValueEdit = watchEdit("secure");

  const retryCertConnection = () => {
    if (!pendingConnection) return;

    setAddServerError(null);
    const connectionData = pendingConnection;
    setPendingConnection(null);

    // Wait a moment for the certificate to be trusted, then retry
    setTimeout(async () => {
      try {
        await attemptConnection(connectionData);
      } catch (error) {
        console.error("Retry connection failed:", error);
        setPendingConnection(connectionData);
        setAddServerError(
          "Connection still failed. Make sure you accepted the certificate in the device page.",
        );
      }
    }, 1000);
  };

  const attemptConnection = async (data: AddServerFormData) => {
    const parsed = parseHostname(data.hostname);

    if (!parsed.isValid) {
      throw new Error(parsed.error ?? "Invalid hostname");
    }

    // Use explicit secure setting if provided, otherwise use parsed protocol
    const secure = data.secure || parsed.secure;
    const protocol = secure ? "https" : "http";
    const transportHostname = formatHostnameForTransport({
      ...parsed,
      secure,
    });
    const displayHostname = formatHostnameForConnection({
      ...parsed,
      secure,
    });

    // Set up connection timeout (20 seconds for initial connection)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      const id = randId();
      const transport = await TransportHTTP.create(transportHostname, secure);
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      (connection as MeshDevice & { connType?: string }).connType = "http"; // Add connection type for Dashboard
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      addSavedServer(displayHostname, protocol);

      setAddServerOpen(false);
      resetAdd();
      closeDialog();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const connectToServer = async (server: SavedServer) => {
    setConnectingToServer(server.url);
    setConnectionError(null);

    // Set up connection timeout (20 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      // Ensure saved server host includes port for transport
      const parsed = parseHostname(server.host);
      const secure = server.protocol === "https";
      const transportHostname = parsed.isValid
        ? formatHostnameForTransport({ ...parsed, secure })
        : server.host;

      const id = randId();
      const transport = await TransportHTTP.create(
        transportHostname,
        secure,
      );
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      (connection as MeshDevice & { connType?: string }).connType = "http"; // Add connection type for Dashboard
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      addSavedServer(server.host, server.protocol);

      closeDialog();
    } catch (error) {
      console.error("Connection error:", error);
      const errorMessage = controller.signal.aborted
        ? `Connection timed out after 20 seconds connecting to ${server.host}`
        : `Failed to connect to ${server.host}`;
      setConnectionError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setConnectingToServer(null);
    }
  };

  const isCertificateError = (errorMessage: string, isSecure: boolean) => {
    if (!isSecure) return false;
    return errorMessage.includes("certificate") ||
      errorMessage.includes("SSL") ||
      errorMessage.includes("TLS") ||
      errorMessage.includes("CERT_") ||
      errorMessage.includes("net::ERR_CERT");
  };

  const isNetworkError = (errorMessage: string) => {
    return errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("CONNECTION_REFUSED");
  };

  const isTimeoutError = (error: unknown) => {
    if (error instanceof Error) {
      return error.name === "AbortError" ||
        error.message.includes("aborted") ||
        error.message.includes("timeout");
    }
    return false;
  };

  const handleConnectionError = (error: unknown, data: AddServerFormData) => {
    const errorMessage = error instanceof Error
      ? error.message
      : `Failed to connect to ${data.hostname}`;

    const parsed = parseHostname(data.hostname);
    const secure = data.secure || parsed.secure;
    const hostname = parsed.isValid
      ? formatHostnameForConnection({ ...parsed, secure })
      : data.hostname;

    if (isTimeoutError(error)) {
      setAddServerError(
        `Connection timed out after 20 seconds connecting to ${hostname}. Check that the device is powered on and accessible.`,
      );
    } else if (isCertificateError(errorMessage, secure)) {
      setPendingConnection(data);
      setAddServerError(
        `SSL certificate error connecting to ${hostname}. Click "Open Device Page" to accept the certificate, then "Retry Connection".`,
      );
    } else if (isNetworkError(errorMessage)) {
      const port = parsed.port ?? (secure ? 443 : 80);
      setAddServerError(
        `Network error connecting to ${hostname}. Check that the device is accessible and running on port ${port}.`,
      );
    } else {
      setAddServerError(`Failed to connect to ${hostname}: ${errorMessage}`);
    }
  };

  const handleAddServer = handleSubmitAdd(async (data) => {
    setConnectionInProgress(true);
    setAddServerError(null);

    try {
      await attemptConnection(data);
    } catch (error) {
      console.error("Connection error:", error);
      handleConnectionError(error, data);
    } finally {
      setConnectionInProgress(false);
    }
  });

  const handleEditServer = (server: SavedServer) => {
    setEditingServer(server);
    resetEdit({
      hostname: server.host,
      secure: server.protocol === "https",
    });
    setEditServerOpen(true);
  };

  const handleSaveEdit = handleSubmitEdit((data) => {
    if (!editingServer) return;

    // Remove old server and add updated one
    removeSavedServer(editingServer.url);
    addSavedServer(data.hostname, data.secure ? "https" : "http");

    setEditServerOpen(false);
    setEditingServer(null);
    resetEdit();
  });

  const getSecurityIcon = (protocol: "http" | "https") => {
    return protocol === "https"
      ? <Lock className="h-4 w-4 text-green-600" />
      : <LockOpen className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {t("newDeviceDialog.tabs.http.title")}
            </h3>
          </div>
          {savedServers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSavedServers}
              className="text-red-600 hover:text-red-700"
            >
              {t("newDeviceDialog.tabs.http.clearAll")}
            </Button>
          )}
        </div>

        {/* Server List */}
        <div className="space-y-2 min-h-[300px]">
          {savedServers.length === 0
            ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Server className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm mb-2">
                  {t("newDeviceDialog.tabs.http.noServers")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("newDeviceDialog.tabs.http.addFirstServer")}
                </p>
              </div>
            )
            : (
              savedServers.map((server) => (
                <div
                  key={server.url}
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* Server Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {server.host?.replace(/[<>]/g, "")}
                      </span>
                      {getSecurityIcon(server.protocol)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {server.deviceInfo?.model && (
                        <>
                          <span>•</span>
                          <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1 rounded">
                            {server.deviceInfo.model.replace(/[<>]/g, "")}
                          </span>
                        </>
                      )}

                      {server.deviceInfo?.nodeCount && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {typeof server.deviceInfo.nodeCount === "number"
                              ? server.deviceInfo.nodeCount.toString()
                              : "0"}
                          </span>
                        </>
                      )}
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
                      {t("newDeviceDialog.tabs.actions.connect")}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditServer(server)}
                      className="text-slate-400 hover:text-blue-600 p-1"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSavedServer(server.url)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))
            )}

          {/* Add Server Button */}
          <Button
            variant="outline"
            onClick={() => {
              setAddServerError(null);
              setAddServerOpen(true);
            }}
            className="w-full border-dashed hover:border-solid"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("newDeviceDialog.tabs.http.addNewDevice")}
          </Button>

          {/* Connection Error */}
          {connectionError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {connectionError?.replace(/[<>]/g, "")}
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
              {t("newDeviceDialog.tabs.http.addServer")}
            </DialogTitle>
            <DialogDescription>
              Enter the hostname or IP address of your Meshtastic device to
              connect via HTTP/HTTPS.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddServer} className="space-y-4">
            <div>
              <Label htmlFor="hostname">Hostname or IP Address</Label>
              <Input
                id="hostname"
                placeholder="meshtastic.local or 192.168.1.100"
                className="mt-1"
                {...registerAdd("hostname", { required: true })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={isURLHTTPS || secureValueAdd}
                onCheckedChange={(checked) => setValueAdd("secure", checked)}
                disabled={isURLHTTPS}
                {...registerAdd("secure")}
              />
              <Label className="flex items-center gap-2">
                {secureValueAdd
                  ? <Lock className="h-4 w-4 text-green-600" />
                  : <LockOpen className="h-4 w-4 text-yellow-600" />}
                Use HTTPS (Secure)
              </Label>
            </div>

            {/* Connection Error Display */}
            {addServerError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {addServerError?.replace(/[<>]/g, "")}
                    </p>
                    {pendingConnection && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const parsed = parseHostname(
                              pendingConnection.hostname,
                            );
                            const secure = pendingConnection.secure ||
                              parsed.secure;
                            const protocol = secure ? "https" : "http";
                            const hostname = parsed.isValid
                              ? formatHostnameForConnection({
                                ...parsed,
                                secure,
                              })
                              : pendingConnection.hostname;

                            // Open the node directly to accept certificate
                            const nodeUrl = `${protocol}://${hostname}`;
                            globalThis.open(
                              nodeUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          className="text-xs"
                        >
                          Open Device Page
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={retryCertConnection}
                          className="text-xs"
                        >
                          Retry Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddServerOpen(false)}
                className="flex-1"
              >
                {t("newDeviceDialog.tabs.actions.cancel")}
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

      {/* Edit Server Dialog */}
      <Dialog open={editServerOpen} onOpenChange={setEditServerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t("newDeviceDialog.tabs.http.editServer")}
            </DialogTitle>
            <DialogDescription>
              Update the hostname or connection settings for this Meshtastic
              device.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-hostname">Hostname or IP Address</Label>
              <Input
                id="edit-hostname"
                placeholder="meshtastic.local or 192.168.1.100"
                className="mt-1"
                {...registerEdit("hostname", { required: true })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={secureValueEdit}
                onCheckedChange={(checked) => setValueEdit("secure", checked)}
                {...registerEdit("secure")}
              />
              <Label className="flex items-center gap-2">
                {secureValueEdit
                  ? <Lock className="h-4 w-4 text-green-600" />
                  : <LockOpen className="h-4 w-4 text-yellow-600" />}
                Use HTTPS (Secure)
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditServerOpen(false)}
                className="flex-1"
              >
                {t("newDeviceDialog.tabs.actions.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                {t("newDeviceDialog.tabs.actions.saveChanges")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
