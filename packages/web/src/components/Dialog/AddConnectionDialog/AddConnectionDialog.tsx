import { SupportBadge } from "@app/components/Badge/SupportedBadge.tsx";
import { Switch } from "@app/components/UI/Switch.tsx";
import type { NewConnection } from "@app/core/stores/deviceStore/types.ts";
import { testHttpReachable } from "@app/pages/Connections/utils";
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
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
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
import { Trans, useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";
import { urlOrIpv4Schema } from "./validation.ts";

type TabKey = "http" | "bluetooth" | "serial";
type TestingStatus = "idle" | "testing" | "success" | "failure";
type DialogState = {
  tab: TabKey;
  name: string;
  protocol: "http" | "https";
  url: string;
  testStatus: TestingStatus;
  btSelected: { id: string; name?: string; device?: BluetoothDevice } | undefined;
  serialSelected: { vendorId?: number; productId?: number } | undefined;
};

type DialogAction =
  | { type: "RESET"; payload?: { isHTTPS?: boolean } }
  | { type: "SET_TAB"; payload: TabKey }
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_PROTOCOL"; payload: "http" | "https" }
  | { type: "SET_URL"; payload: string }
  | { type: "SET_TEST_STATUS"; payload: TestingStatus }
  | {
      type: "SET_BT_SELECTED";
      payload: { id: string; name?: string; device?: BluetoothDevice } | undefined;
    }
  | {
      type: "SET_SERIAL_SELECTED";
      payload: { vendorId?: number; productId?: number } | undefined;
    }
  | { type: "SET_URL_AND_RESET_TEST"; payload: string };

interface FeatureErrorProps {
  missingFeatures: BrowserFeature[];
  tabId: "bluetooth" | "serial";
}

type Pane = {
  children: () => React.ReactNode;
  placeholder: string;
  validate: () => boolean;
  build: () => NewConnection | null;
};

const featureErrors: Record<BrowserFeature, { href: string; i18nKey: string }> =
  {
    "Web Bluetooth": {
      href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility",
      i18nKey: "addConnection.validation.requiresWebBluetooth",
    },
    "Web Serial": {
      href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
      i18nKey: "addConnection.validation.requiresWebSerial",
    },
    "Secure Context": {
      href: "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts",
      i18nKey: "addConnection.validation.requiresSecureContext",
    },
  };

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
                    ? "addConnection.validation.additionallyRequiresSecureContext"
                    : "addConnection.validation.requiresSecureContext"
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

const initialState: DialogState = {
  tab: "http",
  name: "",
  protocol: "http",
  url: "",
  testStatus: "idle",
  btSelected: undefined,
  serialSelected: undefined,
};
export const createInitialDialogState = (
  overrides?: Partial<DialogState>,
): DialogState => {
  return { ...initialState, ...(overrides ?? {}) };
};

export const dialogStateInitializer = (
  overrides?: Partial<DialogState>,
): DialogState => createInitialDialogState(overrides);

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "RESET":
      return createInitialDialogState(
        action.payload?.isHTTPS ? { protocol: "https" } : {},
      );
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

const TAB_META: Array<{ key: TabKey; label: string; Icon: LucideIcon }> = [
  { key: "http", label: "HTTP", Icon: Globe },
  { key: "bluetooth", label: "Bluetooth", Icon: Bluetooth },
  { key: "serial", label: "Serial", Icon: Cable },
];

export default function AddConnectionDialog({
  open = false,
  onOpenChange = () => {},
  onSave = async () => {},
  isHTTPS = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (conn: NewConnection, device?: BluetoothDevice) => Promise<void>;
  isHTTPS?: boolean;
}) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(dialogReducer, initialState, () =>
    dialogStateInitializer(isHTTPS ? { protocol: "https" } : {}),
  );
  const { unsupported } = useBrowserFeatureDetection();
  const { t } = useTranslation();

  const bluetoothSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;
  const serialSupported =
    typeof navigator !== "undefined" && "serial" in navigator;
  const isURLHTTPS = isHTTPS;

  const reset = useCallback(() => {
    dispatch({ type: "RESET", payload: { isHTTPS } });
  }, [isHTTPS]);

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
        title: t("addConnection.bluetoothConnection.notSupported.title"),
        description: t(
          "addConnection.bluetoothConnection.notSupported.description",
        ),
      });
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
      });
      dispatch({
        type: "SET_BT_SELECTED",
        payload: { id: device.id, name: device.name ?? undefined, device },
      });
      if (!state.name || state.name === "") {
        dispatch({
          type: "SET_NAME",
          payload: device.name
            ? t("addConnection.bluetoothConnection.short", {
                deviceName: device.name,
              })
            : t("addConnection.bluetoothConnection.long"),
        });
      }
      toast({
        title: t("addConnection.bluetoothConnection.selected"),
        description: device.name || device.id,
      });
    } catch (err) {
      makeToastErrorHandler("Bluetooth")(err);
    }
  }, [bluetoothSupported, state.name, toast, makeToastErrorHandler, t]);

  const handlePickSerial = useCallback(async () => {
    if (!serialSupported) {
      toast({
        title: t("addConnection.serialConnection.notSupported.title"),
        description: t(
          "addConnection.serialConnection.notSupported.description",
        ),
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
        title: t("addConnection.serialConnection.portSelected.title"),
        description: t(
          "addConnection.serialConnection.portSelected.description",
        ),
      });
    } catch (err) {
      makeToastErrorHandler("Serial")(err);
    }
  }, [serialSupported, state.name, toast, makeToastErrorHandler, t]);

  const handleTestHttp = useCallback(async () => {
    const fullUrl = `${state.protocol}://${state.url}`;
    const validatedURL = urlOrIpv4Schema.safeParse(fullUrl);
    if (validatedURL.success === false) {
      toast({
        title: t("addConnection.httpConnection.invalidUrl.title"),
        description: t("addConnection.httpConnection.invalidUrl.description"),
      });
      return;
    }
    dispatch({ type: "SET_TEST_STATUS", payload: "testing" });
    const reachable = await testHttpReachable(validatedURL.data);
    if (reachable) {
      dispatch({ type: "SET_TEST_STATUS", payload: "success" });
      toast({
        title: t("addConnection.httpConnection.connectionTest.success.title"),
        description: t(
          "addConnection.httpConnection.connectionTest.success.description",
        ),
      });
    } else {
      dispatch({ type: "SET_TEST_STATUS", payload: "failure" });
      toast({
        title: t("addConnection.httpConnection.connectionTest.failure.title"),
        description: t(
          "addConnection.httpConnection.connectionTest.failure.description",
        ),
      });
    }
  }, [state.protocol, state.url, toast, t]);

  const PANES: Record<TabKey, Pane> = useMemo(
    () => ({
      http: {
        placeholder: t("addConnection.httpConnection.namePlaceholder"),
        children: () => (
          <div className="flex flex-col gap-4">
            <Label htmlFor="url">
              {t("addConnection.httpConnection.heading")}
            </Label>

            <Input
              id={"url"}
              inputMode="url"
              placeholder={t("addConnection.httpConnection.inputPlaceholder")}
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
                checked={state.protocol === "https"}
                onCheckedChange={(value) => {
                  dispatch({
                    type: "SET_PROTOCOL",
                    payload: value ? "https" : "http",
                  });
                  dispatch({ type: "SET_TEST_STATUS", payload: "idle" });
                }}
              ></Switch>
              <Label>{t("addConnection.httpConnection.useHttps")}</Label>
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
                    {t(
                      "addConnection.httpConnection.connectionTest.button.loading",
                    )}
                  </>
                ) : (
                  <>
                    <MousePointerClick className="h-4 w-4" />
                    {t(
                      "addConnection.httpConnection.connectionTest.button.label",
                    )}
                  </>
                )}
              </Button>
              {state.testStatus === "success" && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("addConnection.httpConnection.connectionTest.reachable")}
                </div>
              )}
              {state.testStatus === "failure" && (
                <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  {t(
                    "addConnection.httpConnection.connectionTest.notReachable",
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("addConnection.httpConnection.connectionTest.description")}
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
              labelSupported={t(
                "addConnection.bluetoothConnection.supported.title",
              )}
              labelUnsupported={t(
                "addConnection.bluetoothConnection.notSupported.title",
              )}
            />
            <PickerRow
              label={t("addConnection.bluetoothConnection.device")}
              buttonText={t("addConnection.bluetoothConnection.selectDevice")}
              onPick={handlePickBluetooth}
              disabled={!bluetoothSupported}
              display={
                state.btSelected
                  ? state.btSelected.name || state.btSelected.id
                  : t("addConnection.bluetoothConnection.notSelected")
              }
              helper={t("addConnection.bluetoothConnection.helperText")}
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
          gattServiceUUID: TransportWebBluetooth.ServiceUuid,
        }),
      },
      serial: {
        placeholder: t("addConnection.serialConnection.namePlaceholder"),
        children: () => (
          <>
            <SupportBadge
              supported={serialSupported}
              labelSupported={t(
                "addConnection.serialConnection.supported.title",
              )}
              labelUnsupported={t(
                "addConnection.serialConnection.notSupported.title",
              )}
            />
            <PickerRow
              label={t("addConnection.serialConnection.port")}
              buttonText={t("addConnection.serialConnection.selectPort")}
              onPick={handlePickSerial}
              disabled={!serialSupported}
              display={
                state.serialSelected
                  ? t("addConnection.serialConnection.deviceName", {
                      vendorId:
                        state.serialSelected.vendorId?.toString(16) ?? "?",
                      productId:
                        state.serialSelected.productId?.toString(16) ?? "?",
                    })
                  : t("addConnection.serialConnection.notSelected")
              }
              helper={t("addConnection.serialConnection.helperText")}
            />
            <FeatureErrorMessage missingFeatures={unsupported} tabId="serial" />
          </>
        ),
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
      t,
    ],
  );

  const currentPane = PANES[state.tab];
  const canCreate = useMemo(() => currentPane.validate(), [currentPane]);

  const submit = (fn: (p: NewConnection, device?: BluetoothDevice) => Promise<void>) => async () => {
    if (!canCreate) {
      return;
    }
    const payload = currentPane.build();

    if (!payload) {
      return;
    }
    const btDevice = state.tab === "bluetooth" ? state.btSelected?.device : undefined;
    await fn(payload, btDevice);
  };

  return (
    <DialogWrapper
      variant="default"
      type="custom"
      title={t("addConnection.title")}
      description={t("addConnection.description")}
      cancelText={t("button.cancel")}
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
                      {t("button.saveConnection")}
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
