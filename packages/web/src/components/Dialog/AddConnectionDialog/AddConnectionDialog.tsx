import { Switch } from "@app/components/UI/Switch.tsx";
import type { NewConnection } from "@app/core/stores/deviceStore/types.ts";
import {
  DEFAULT_MESHTASTIC_GATT_SERVICE,
  testHttpReachable,
} from "@app/pages/Connections/utils";
import { Badge } from "@components/UI/Badge.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import {
  type BrowserFeature,
  useBrowserFeatureDetection,
} from "@core/hooks/useBrowserFeatureDetection.ts";
import { useToast } from "@core/hooks/useToast.ts";
import {
  AlertCircle,
  Bluetooth,
  Cable,
  CheckCircle2,
  Globe,
  Loader2,
  type LucideIcon,
  MousePointerClick,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Trans } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";
import { urlOrIpv4Schema } from "./validation.ts";

type TabKey = "http" | "bluetooth" | "serial";
type TestingStatus = "idle" | "testing" | "success" | "failure";

const featureErrors: Record<BrowserFeature, { href: string; i18nKey: string }> =
  {
    "Web Bluetooth": {
      href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility",
      i18nKey: "newDeviceDialog.validation.requiresWebBluetooth",
    },
    "Web Serial": {
      href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
      i18nKey: "newDeviceDialog.validation.requiresWebSerial",
    },
    "Secure Context": {
      href: "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts",
      i18nKey: "newDeviceDialog.validation.requiresSecureContext",
    },
  };

interface FeatureErrorProps {
  missingFeatures: BrowserFeature[];
  tabId: "bluetooth" | "serial";
}

const FeatureErrorMessage = ({ missingFeatures, tabId }: FeatureErrorProps) => {
  if (missingFeatures.length === 0) {
    return null;
  }

  const browserFeatures = missingFeatures.filter(
    (feature) => feature !== "Secure Context",
  );
  const needsSecureContext = missingFeatures.includes("Secure Context");

  const needsFeature =
    tabId === "bluetooth" && browserFeatures.includes("Web Bluetooth")
      ? "Web Bluetooth"
      : tabId === "serial" && browserFeatures.includes("Web Serial")
        ? "Web Serial"
        : undefined;

  return (
    <div className="flex flex-col items-start gap-2 bg-red-500 p-4 rounded-md text-sm mt-4">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle size={40} className="mr-2 shrink-0 text-white" />
        <div className="flex flex-col gap-3">
          <div className="text-sm text-white">
            {needsFeature && (
              <Trans
                i18nKey={featureErrors[needsFeature].i18nKey}
                components={[
                  <Link
                    key="0"
                    href={featureErrors[needsFeature].href}
                    className="underline hover:text-slate-200 text-white dark:text-white dark:hover:text-slate-300"
                  />,
                ]}
              />
            )}
            {needsFeature && needsSecureContext && " "}
            {needsSecureContext && (
              <Trans
                i18nKey={
                  browserFeatures.length > 0
                    ? "newDeviceDialog.validation.additionallyRequiresSecureContext"
                    : "newDeviceDialog.validation.requiresSecureContext"
                }
                components={{
                  "0": (
                    <Link
                      href={featureErrors["Secure Context"].href}
                      className="underline hover:text-slate-200 text-white dark:text-white dark:hover:text-slate-300"
                    />
                  ),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

type DialogState = {
  tab: TabKey;
  name: string;
  protocol: "http" | "https";
  url: string;
  testStatus: TestingStatus;
  btSelected: { id: string; name?: string } | undefined;
  serialSelected: { vendorId?: number; productId?: number } | undefined;
};

type DialogAction =
  | { type: "RESET" }
  | { type: "SET_TAB"; payload: TabKey }
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_PROTOCOL"; payload: "http" | "https" }
  | { type: "SET_URL"; payload: string }
  | { type: "SET_TEST_STATUS"; payload: TestingStatus }
  | {
      type: "SET_BT_SELECTED";
      payload: { id: string; name?: string } | undefined;
    }
  | {
      type: "SET_SERIAL_SELECTED";
      payload: { vendorId?: number; productId?: number } | undefined;
    }
  | { type: "SET_URL_AND_RESET_TEST"; payload: string };

const initialState: DialogState = {
  tab: "http",
  name: "",
  protocol: "http",
  url: "",
  testStatus: "idle",
  btSelected: undefined,
  serialSelected: undefined,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "SET_TAB":
      return { ...state, tab: action.payload };
    case "SET_NAME":
      return { ...state, name: action.payload };
    case "SET_PROTOCOL":
      return { ...state, protocol: action.payload };
    case "SET_URL":
      return { ...state, url: action.payload };
    case "SET_TEST_STATUS":
      return { ...state, testStatus: action.payload };
    case "SET_BT_SELECTED":
      return { ...state, btSelected: action.payload };
    case "SET_SERIAL_SELECTED":
      return { ...state, serialSelected: action.payload };
    case "SET_URL_AND_RESET_TEST":
      return { ...state, url: action.payload, testStatus: "idle" };
    default:
      return state;
  }
}

function SupportBadge({
  supported,
  labelSupported,
  labelUnsupported,
}: {
  supported: boolean;
  labelSupported: string;
  labelUnsupported: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={supported ? "secondary" : "destructive"}>
        {supported ? labelSupported : labelUnsupported}
      </Badge>
    </div>
  );
}

function PickerRow({
  label,
  buttonText,
  onPick,
  disabled,
  display,
  helper,
}: {
  label: string;
  buttonText: string;
  onPick: () => void | Promise<void>;
  disabled?: boolean;
  display: string;
  helper?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          variant="subtle"
          className="gap-2"
          onClick={onPick}
          disabled={disabled}
        >
          <MousePointerClick className="h-4 w-4" />
          {buttonText}
        </Button>
        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {display}
        </div>
      </div>
      {helper ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

type Pane = {
  children: () => React.ReactNode;
  placeholder: string;
  validate: () => boolean;
  build: () => NewConnection | null;
};

const TAB_META: Array<{ key: TabKey; label: string; Icon: LucideIcon }> = [
  { key: "http", label: "HTTP", Icon: Globe },
  { key: "bluetooth", label: "Bluetooth", Icon: Bluetooth },
  { key: "serial", label: "Serial", Icon: Cable },
];

export default function AddConnectionDialog({
  open = false,
  onOpenChange = () => {},
  onSave = async () => {},
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (conn: NewConnection) => Promise<void>;
}) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(dialogReducer, initialState);
  const { unsupported } = useBrowserFeatureDetection();

  const bluetoothSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;
  const serialSupported =
    typeof navigator !== "undefined" && "serial" in navigator;
  const isURLHTTPS = useMemo(() => location.protocol === "https:", []);
  console.log(isURLHTTPS);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [reset, open]);

  const makeToastErrorHandler = useCallback(
    (titlePrefix: string) =>
      (err: unknown): void => {
        if (err && (err as { name?: string }).name === "NotFoundError") {
          return; // user canceled
        }
        const message = err instanceof Error ? err.message : String(err);
        toast({ title: `${titlePrefix} error`, description: message });
      },
    [toast],
  );

  const handlePickBluetooth = useCallback(async () => {
    if (!bluetoothSupported) {
      toast({
        title: "Bluetooth not supported",
        description: "Your browser or device does not support Web Bluetooth.",
      });
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [DEFAULT_MESHTASTIC_GATT_SERVICE] }],
        optionalServices: [DEFAULT_MESHTASTIC_GATT_SERVICE],
      });
      dispatch({
        type: "SET_BT_SELECTED",
        payload: { id: device.id, name: device.name ?? undefined },
      });
      if (!state.name || state.name === "") {
        dispatch({
          type: "SET_NAME",
          payload: device.name ? `BT: ${device.name}` : "Bluetooth Device",
        });
      }
      toast({
        title: "Bluetooth device selected",
        description: device.name || device.id,
      });
    } catch (err) {
      makeToastErrorHandler("Bluetooth")(err);
    }
  }, [bluetoothSupported, state.name, toast, makeToastErrorHandler]);

  const handlePickSerial = useCallback(async () => {
    if (!serialSupported) {
      toast({
        title: "Serial not supported",
        description: "Your browser does not support Web Serial API.",
      });
      return;
    }
    try {
      const port = await (
        navigator as Navigator & {
          serial: {
            requestPort: (o: Record<string, unknown>) => Promise<SerialPort>;
          };
        }
      ).serial.requestPort({});
      const info =
        (
          port as SerialPort & {
            getInfo?: () => { usbVendorId?: number; usbProductId?: number };
          }
        ).getInfo?.() ?? {};
      dispatch({
        type: "SET_SERIAL_SELECTED",
        payload: {
          vendorId: info.usbVendorId,
          productId: info.usbProductId,
        },
      });
      if (!state.name || state.name === "") {
        const v = info.usbVendorId ? info.usbVendorId.toString(16) : "?";
        const p = info.usbProductId ? info.usbProductId.toString(16) : "?";
        dispatch({ type: "SET_NAME", payload: `Serial: ${v}:${p}` });
      }
      toast({
        title: "Serial port selected",
        description: "Port permission granted.",
      });
    } catch (err) {
      makeToastErrorHandler("Serial")(err);
    }
  }, [serialSupported, state.name, toast, makeToastErrorHandler]);

  const handleTestHttp = useCallback(async () => {
    const fullUrl = `${state.protocol}://${state.url}`;
    const validatedURL = urlOrIpv4Schema.safeParse(fullUrl);
    if (validatedURL.success === false) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid HTTP or HTTPS URL.",
      });
      return;
    }
    dispatch({ type: "SET_TEST_STATUS", payload: "testing" });
    const reachable = await testHttpReachable(validatedURL.data);
    if (reachable) {
      dispatch({ type: "SET_TEST_STATUS", payload: "success" });
      toast({
        title: "Connection test successful",
        description: "The device appears to be reachable.",
      });
    } else {
      dispatch({ type: "SET_TEST_STATUS", payload: "failure" });
      toast({
        title: "Connection test failed",
        description: "Could not reach the device. Check the URL and try again.",
      });
    }
  }, [state.protocol, state.url, toast]);

  const PANES: Record<TabKey, Pane> = useMemo(
    () => ({
      http: {
        placeholder: "My HTTP Node",
        children: () => (
          <div className="flex flex-col gap-4">
            <Label htmlFor="url">URL or IP</Label>

            <Input
              id={"url"}
              inputMode="url"
              placeholder="192.168.1.10 or meshtastic.local"
              prefix={`${state.protocol}://`}
              value={state.url}
              onChange={(e) => {
                dispatch({
                  type: "SET_URL_AND_RESET_TEST",
                  payload: e.target.value,
                });
              }}
            />
            <div className="flex items-center gap-2 mt-1">
              <Switch
                value={state.protocol}
                disabled={!!isURLHTTPS}
                checked={isURLHTTPS}
                onCheckedChange={(value) => {
                  dispatch({
                    type: "SET_PROTOCOL",
                    payload: value ? "https" : "http",
                  });
                  dispatch({ type: "SET_TEST_STATUS", payload: "idle" });
                }}
              ></Switch>
              <Label>Use HTTPS</Label>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="subtle"
                className="gap-2"
                onClick={handleTestHttp}
                disabled={
                  urlOrIpv4Schema.safeParse(`${state.protocol}://${state.url}`)
                    .success === false || state.testStatus === "testing"
                }
              >
                {state.testStatus === "testing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <MousePointerClick className="h-4 w-4" />
                    Test connection
                  </>
                )}
              </Button>
              {state.testStatus === "success" && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Reachable
                </div>
              )}
              {state.testStatus === "failure" && (
                <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  Not reachable
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test the connection before saving to verify the device is
              reachable.
            </p>
          </div>
        ),
        validate: () =>
          urlOrIpv4Schema.safeParse(`${state.protocol}://${state.url}`)
            .success === true && state.testStatus === "success",
        build: () => ({
          type: "http",
          name: state.name.trim(),
          url: `${state.protocol}://${state.url.trim()}`,
        }),
      },
      bluetooth: {
        placeholder: "My Bluetooth Node",
        children: () => (
          <>
            <SupportBadge
              supported={bluetoothSupported}
              labelSupported="Web Bluetooth supported"
              labelUnsupported="Web Bluetooth not supported"
            />
            <PickerRow
              label="Device"
              buttonText="Select device"
              onPick={handlePickBluetooth}
              disabled={!bluetoothSupported}
              display={
                state.btSelected
                  ? state.btSelected.name || state.btSelected.id
                  : "No device selected"
              }
              helper="Uses the Meshtastic default GATT service for discovery."
            />
            <FeatureErrorMessage
              missingFeatures={unsupported}
              tabId="bluetooth"
            />
          </>
        ),
        validate: () => state.name.trim().length > 0 && !!state.btSelected,
        build: () => ({
          type: "bluetooth",
          name: state.name.trim(),
          deviceId: state.btSelected?.id,
          deviceName: state.btSelected?.name,
        }),
      },
      serial: {
        placeholder: "My Serial Node",
        children: () => (
          <>
            <SupportBadge
              supported={serialSupported}
              labelSupported="Web Serial supported"
              labelUnsupported="Web Serial not supported"
            />
            <PickerRow
              label="Port"
              buttonText="Select port"
              onPick={handlePickSerial}
              disabled={!serialSupported}
              display={
                state.serialSelected
                  ? `USB ${state.serialSelected.vendorId?.toString(16) ?? "?"}:${state.serialSelected.productId?.toString(16) ?? "?"}`
                  : "No port selected"
              }
              helper="Selecting a port grants permission so the app can open it to connect."
            />
            <FeatureErrorMessage missingFeatures={unsupported} tabId="serial" />
          </>
        ),
        // allow "create" if unsupported (you might want to disallow—keep your earlier rule if desired)
        validate: () =>
          state.name.trim().length > 0 &&
          (!!state.serialSelected || !serialSupported),
        build: () => ({
          type: "serial",
          name: state.name.trim(),
          usbVendorId: state.serialSelected?.vendorId,
          usbProductId: state.serialSelected?.productId,
        }),
      },
    }),
    [
      state,
      bluetoothSupported,
      serialSupported,
      isURLHTTPS,
      handlePickBluetooth,
      handlePickSerial,
      handleTestHttp,
      unsupported,
    ],
  );

  const currentPane = PANES[state.tab];
  const canCreate = useMemo(() => currentPane.validate(), [currentPane]);

  const submit = (fn: (p: NewConnection) => Promise<void>) => async () => {
    if (!canCreate) {
      return;
    }
    const payload = currentPane.build();

    if (!payload) {
      return;
    }
    await fn(payload);
  };

  return (
    <DialogWrapper
      variant="default"
      type="custom"
      title="Add connection"
      description="Choose a connection type and fill in the details"
      cancelText="Close"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Tabs
        value={state.tab}
        onValueChange={(v) =>
          dispatch({ type: "SET_TAB", payload: v as TabKey })
        }
      >
        <TabsList className="grid grid-cols-3">
          {TAB_META.map(({ key, label, Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_META.map(({ key }) => (
          <TabsContent key={key} value={key}>
            {state.tab === key ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <Label htmlFor={`name-${state.tab}`}>Name</Label>
                  <Input
                    id={`name-${state.tab}`}
                    value={state.name}
                    onChange={(evt) =>
                      dispatch({ type: "SET_NAME", payload: evt.target.value })
                    }
                    placeholder={currentPane.placeholder}
                  />
                </div>
                {PANES[key].children()}
                <div className="flex justify-end">
                  <div className="inline-flex rounded-md shadow-sm overflow-hidden border">
                    <Button
                      onClick={submit(onSave)}
                      disabled={!canCreate}
                      className="rounded-none"
                    >
                      Save connection
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </DialogWrapper>
  );
}
