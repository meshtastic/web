import { Switch } from "@app/components/UI/Switch.tsx";
import type {
  ConnectionType,
  NewConnection,
} from "@app/core/stores/deviceStore/types.ts";
import {
  isLocalNetworkHost,
  testHttpReachable,
} from "@app/pages/Connections/utils";
import {
  type ConnectionHandle,
  MESHTASTIC_BLE_SERVICE,
} from "@core/connections/browserDevices.ts";
import { CertificateGuide } from "@components/CertificateGuide.tsx";
import { cn } from "@core/utils/cn.ts";
import { useLocalNetworkAccess } from "@core/hooks/useLocalNetworkAccess.ts";
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
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { urlOrIpv4Schema } from "@core/connections/address.ts";

type TabKey = ConnectionType;

const secondaryButtonClasses =
  "h-auto min-h-11 gap-2 rounded-control border border-control bg-transparent px-4 font-medium text-primary hover:bg-raised hover:opacity-100";

const TAB_KEYS: readonly TabKey[] = ["http", "bluetooth", "serial"];
const isTabKey = (value: string): value is TabKey =>
  TAB_KEYS.some((key) => key === value);

/** A .local test slower than this was mostly spent looking the name up. */
const SLOW_LOCAL_NAME_MS = 2000;
type TestingStatus = "idle" | "testing" | "success" | "failure" | "cert-error";
type DialogState = {
  tab: TabKey;
  name: string;
  protocol: "http" | "https";
  /** The user set the protocol; automatic defaults leave it alone. */
  protocolTouched: boolean;
  url: string;
  testStatus: TestingStatus;
  /** The last test reached a .local name, but only slowly. */
  slowLocalName: boolean;
  btSelected:
    | { id: string; name?: string; device?: BluetoothDevice }
    | undefined;
  serialSelected:
    | { vendorId?: number; productId?: number; port?: SerialPort }
    | undefined;
};

type DialogAction =
  | { type: "RESET"; payload?: { isHTTPS?: boolean } }
  | { type: "SET_TAB"; payload: TabKey }
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_PROTOCOL"; payload: "http" | "https" }
  | { type: "SET_PROTOCOL_DEFAULT"; payload: "http" | "https" }
  | { type: "FORCE_PROTOCOL"; payload: "http" | "https" }
  | { type: "SET_URL"; payload: string }
  | { type: "SET_TEST_STATUS"; payload: TestingStatus }
  | {
      type: "TEST_RESULT";
      payload: {
        protocol: "http" | "https";
        url: string;
        status: TestingStatus;
        slowLocalName: boolean;
      };
    }
  | { type: "SET_SLOW_LOCAL_NAME"; payload: boolean }
  | {
      type: "SET_BT_SELECTED";
      payload:
        | { id: string; name?: string; device?: BluetoothDevice }
        | undefined;
    }
  | {
      type: "SET_SERIAL_SELECTED";
      payload:
        | { vendorId?: number; productId?: number; port?: SerialPort }
        | undefined;
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

  if (!needsFeature && !needsSecureContext) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-card border border-danger bg-danger p-4 text-sm text-on-danger">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle className="mr-2 size-8 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-3">
          <div className="text-sm">
            {needsFeature && (
              <Trans
                i18nKey={featureErrors[needsFeature].i18nKey}
                components={[
                  <Link
                    key="0"
                    href={featureErrors[needsFeature].href}
                    className="font-medium text-on-danger underline hover:text-danger"
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
                      className="font-medium text-on-danger underline hover:text-danger"
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
  protocolTouched: false,
  url: "",
  testStatus: "idle",
  slowLocalName: false,
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

/** Change the protocol and drop the previous test, which no longer applies. */
const withProtocol = (
  state: DialogState,
  protocol: "http" | "https",
): DialogState => ({
  ...state,
  protocol,
  testStatus: "idle",
  slowLocalName: false,
});

export function dialogReducer(
  state: DialogState,
  action: DialogAction,
): DialogState {
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
      return { ...state, protocol: action.payload, protocolTouched: true };
    case "FORCE_PROTOCOL":
      return state.protocol === action.payload
        ? state
        : withProtocol(state, action.payload);
    case "SET_PROTOCOL_DEFAULT":
      return state.protocolTouched || state.protocol === action.payload
        ? state
        : withProtocol(state, action.payload);
    case "TEST_RESULT":
      // A test that finished after the protocol or URL changed tested
      // something else; ignore it.
      return action.payload.protocol === state.protocol &&
        action.payload.url === state.url
        ? {
            ...state,
            testStatus: action.payload.status,
            slowLocalName: action.payload.slowLocalName,
          }
        : state;
    case "SET_URL":
      return { ...state, url: action.payload };
    case "SET_TEST_STATUS":
      return { ...state, testStatus: action.payload };
    case "SET_SLOW_LOCAL_NAME":
      return { ...state, slowLocalName: action.payload };
    case "SET_BT_SELECTED":
      return { ...state, btSelected: action.payload };
    case "SET_SERIAL_SELECTED":
      return { ...state, serialSelected: action.payload };
    case "SET_URL_AND_RESET_TEST":
      return {
        ...state,
        url: action.payload,
        testStatus: "idle",
        slowLocalName: false,
      };
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
          className={secondaryButtonClasses}
          onClick={onPick}
          disabled={disabled}
        >
          <MousePointerClick className="h-4 w-4" />
          {buttonText}
        </Button>
        <div className="min-w-0 break-words text-sm text-muted">{display}</div>
      </div>
      {helper ? <p className="text-sm text-muted">{helper}</p> : null}
    </div>
  );
}

function SupportPill({
  supported,
  labelSupported,
  labelUnsupported,
}: {
  supported: boolean;
  labelSupported: string;
  labelUnsupported: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-control bg-surface px-2.5 py-0.5 text-sm font-medium text-secondary">
      <span
        className={cn(
          "size-2 rounded-full",
          supported ? "bg-online" : "bg-danger-strong",
        )}
        aria-hidden="true"
      />
      {supported ? labelSupported : labelUnsupported}
    </span>
  );
}

const TAB_META: Array<{ key: TabKey; label: string; Icon: LucideIcon }> = [
  { key: "http", label: "HTTP", Icon: Globe },
  { key: "bluetooth", label: "Bluetooth", Icon: Bluetooth },
  { key: "serial", label: "Serial", Icon: Cable },
];

/**
 * The "Add connection" form: HTTP, Bluetooth and Serial panes with their
 * reachability test, validation and certificate guide. Rendered as a view
 * inside the Connections drawer; it resets by unmounting.
 */
export function AddConnectionForm({
  onSave,
  isHTTPS = false,
}: {
  onSave: (conn: NewConnection, handle?: ConnectionHandle) => Promise<void>;
  isHTTPS?: boolean;
}) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(dialogReducer, initialState, () =>
    dialogStateInitializer(isHTTPS ? { protocol: "https" } : {}),
  );
  // Lets an async test check whether the form changed while it ran.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const { unsupported } = useBrowserFeatureDetection();
  const { t } = useTranslation();

  const bluetoothSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;
  const serialSupported =
    typeof navigator !== "undefined" && "serial" in navigator;
  // On an HTTPS page, plain HTTP to a device is mixed content unless the
  // browser supports Chrome's Local Network Access (Chrome/Edge 142+).
  const localNetworkAccess = useLocalNetworkAccess();
  // HTTP stays locked until the browser confirms support.
  const httpAllowed =
    !isHTTPS ||
    (localNetworkAccess !== "unsupported" && localNetworkAccess !== "unknown");
  const isLocalHost = isLocalNetworkHost(state.url);

  // Default local devices to HTTP (no certificate) where the browser allows
  // it, everything else to HTTPS, until the user picks a protocol.
  useEffect(() => {
    if (!isHTTPS || localNetworkAccess === "unknown") return;
    if (!httpAllowed) {
      // Unsupported overrides any earlier choice: HTTP would be blocked.
      dispatch({ type: "FORCE_PROTOCOL", payload: "https" });
      return;
    }
    dispatch({
      type: "SET_PROTOCOL_DEFAULT",
      payload: isLocalHost ? "http" : "https",
    });
  }, [isHTTPS, localNetworkAccess, httpAllowed, isLocalHost]);

  const makeToastErrorHandler = useCallback(
    (titlePrefix: string) =>
      (err: unknown): void => {
        if (err instanceof Error && err.name === "NotFoundError") {
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
        filters: [{ services: [MESHTASTIC_BLE_SERVICE] }],
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
      const port = await navigator.serial.requestPort({});
      const info = port.getInfo();
      dispatch({
        type: "SET_SERIAL_SELECTED",
        payload: {
          vendorId: info.usbVendorId,
          productId: info.usbProductId,
          port,
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
    const tested = { protocol: state.protocol, url: state.url };
    dispatch({ type: "SET_TEST_STATUS", payload: "testing" });
    dispatch({ type: "SET_SLOW_LOCAL_NAME", payload: false });
    const { reachable, certError, elapsedMs } = await testHttpReachable(
      validatedURL.data,
    );
    const status: TestingStatus = reachable
      ? "success"
      : certError
        ? "cert-error"
        : "failure";
    dispatch({
      type: "TEST_RESULT",
      payload: {
        ...tested,
        status,
        slowLocalName:
          reachable &&
          elapsedMs > SLOW_LOCAL_NAME_MS &&
          new URL(validatedURL.data).hostname.endsWith(".local"),
      },
    });
    const current = stateRef.current;
    if (
      status === "failure" &&
      current.protocol === tested.protocol &&
      current.url === tested.url
    ) {
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
              className="h-auto min-h-11 text-base"
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
                disabled={!httpAllowed}
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
            {isHTTPS &&
              state.protocol === "http" &&
              localNetworkAccess === "denied" && (
                <p className="text-sm text-warning">
                  {t("addConnection.httpConnection.localNetwork.denied")}
                </p>
              )}
            {isHTTPS && !httpAllowed && (
              <p className="text-sm text-muted">
                {t("addConnection.httpConnection.localNetwork.unsupported")}
              </p>
            )}
            <div className="flex items-center gap-2 mt-4">
              <Button
                className={secondaryButtonClasses}
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
                <div className="flex items-center gap-1 text-sm text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("addConnection.httpConnection.connectionTest.reachable")}
                </div>
              )}
              {state.testStatus === "failure" && (
                <div className="flex items-center gap-1 text-sm text-danger">
                  <XCircle className="h-4 w-4" />
                  {t(
                    "addConnection.httpConnection.connectionTest.notReachable",
                  )}
                </div>
              )}
            </div>
            {(state.testStatus === "cert-error" ||
              (state.testStatus === "failure" &&
                state.protocol === "https")) && (
              <CertificateGuide
                uncertain={state.testStatus === "failure"}
                url={`${state.protocol}://${state.url.trim()}`}
                retest={async () =>
                  (
                    await testHttpReachable(
                      `${state.protocol}://${state.url.trim()}`,
                    )
                  ).reachable
                }
                onTrusted={() =>
                  dispatch({ type: "SET_TEST_STATUS", payload: "success" })
                }
              />
            )}
            {state.testStatus === "success" && state.slowLocalName && (
              <p className="text-sm text-warning">
                {t("addConnection.httpConnection.connectionTest.slowLocalName")}
              </p>
            )}
            <p className="text-sm text-muted">
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
            <SupportPill
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
          gattServiceUUID: MESHTASTIC_BLE_SERVICE,
        }),
      },
      serial: {
        placeholder: t("addConnection.serialConnection.namePlaceholder"),
        children: () => (
          <>
            <SupportPill
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
      httpAllowed,
      isHTTPS,
      localNetworkAccess,
      handlePickBluetooth,
      handlePickSerial,
      handleTestHttp,
      unsupported,
      t,
    ],
  );

  const currentPane = PANES[state.tab];
  const canCreate = useMemo(() => currentPane.validate(), [currentPane]);

  const submit =
    (fn: (p: NewConnection, handle?: ConnectionHandle) => Promise<void>) =>
    async () => {
      if (!canCreate) {
        return;
      }
      const payload = currentPane.build();

      if (!payload) {
        return;
      }
      const handle: ConnectionHandle = {
        bluetoothDevice:
          state.tab === "bluetooth" ? state.btSelected?.device : undefined,
        serialPort:
          state.tab === "serial" ? state.serialSelected?.port : undefined,
      };
      await fn(payload, handle);
    };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("addConnection.description")}</p>
      <Tabs
        value={state.tab}
        onValueChange={(v) => {
          if (isTabKey(v)) {
            dispatch({ type: "SET_TAB", payload: v });
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-3 gap-1">
          {TAB_META.map(({ key, label, Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className={cn("min-h-11 min-w-0 gap-2")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_META.map(({ key }) => (
          <TabsContent
            key={key}
            value={key}
            className="rounded-card border-subtle bg-inset p-4 @md:p-5"
          >
            {state.tab === key ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <Label htmlFor={`name-${state.tab}`}>Name</Label>
                  <Input
                    id={`name-${state.tab}`}
                    className="h-auto min-h-11 text-base"
                    value={state.name}
                    onChange={(evt) =>
                      dispatch({ type: "SET_NAME", payload: evt.target.value })
                    }
                    placeholder={currentPane.placeholder}
                  />
                </div>
                {PANES[key].children()}
                <div className="flex justify-end">
                  <Button
                    onClick={submit(onSave)}
                    disabled={!canCreate}
                    className="h-auto min-h-11 px-5"
                  >
                    {t("button.saveConnection")}
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
