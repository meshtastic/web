import { BLE } from "@components/PageComponents/Connect/BLE.tsx";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { Serial } from "@components/PageComponents/Connect/Serial.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import {
  type BrowserFeature,
  useBrowserFeatureDetection,
} from "@core/hooks/useBrowserFeatureDetection.ts";
import { AlertCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "../UI/Typography/Link.tsx";

export interface TabElementProps {
  closeDialog: () => void;
}

export interface TabManifest {
  id: "HTTP" | "BLE" | "Serial";
  label: string;
  element: React.FC<TabElementProps>;
  isDisabled: boolean;
}

export interface NewDeviceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FeatureErrorProps {
  missingFeatures: BrowserFeature[];
  tabId: "HTTP" | "BLE" | "Serial";
}

const errors: Record<BrowserFeature, { href: string; i18nKey: string }> = {
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

const ErrorMessage = ({ missingFeatures, tabId }: FeatureErrorProps) => {
  if (missingFeatures.length === 0) {
    return null;
  }

  const browserFeatures = missingFeatures.filter(
    (feature) => feature !== "Secure Context",
  );
  const needsSecureContext = missingFeatures.includes("Secure Context");

  const needsFeature =
    tabId === "BLE" && browserFeatures.includes("Web Bluetooth")
      ? "Web Bluetooth"
      : tabId === "Serial" && browserFeatures.includes("Web Serial")
        ? "Web Serial"
        : undefined;

  return (
    <div className="flex flex-col items-start gap-2 bg-red-500 p-4 rounded-md text-sm text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle size={40} className="mr-2 shrink-0 text-white" />
        <div className="flex flex-col gap-3">
          <div className="text-sm text-white">
            {needsFeature && (
              <Trans
                i18nKey={errors[needsFeature].i18nKey}
                components={[
                  <Link
                    key="0"
                    href={errors[needsFeature].href}
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
                      href={errors["Secure Context"].href}
                      className="underline hover:text-slate-200"
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

export const NewDeviceDialog = ({ open, onOpenChange }: NewDeviceProps) => {
  const { t } = useTranslation("dialog");
  const { unsupported } = useBrowserFeatureDetection();

  const tabs: TabManifest[] = [
    {
      id: "HTTP",
      label: t("newDeviceDialog.tabHttp"),
      element: HTTP,
      isDisabled: false,
    },
    {
      id: "BLE",
      label: t("newDeviceDialog.tabBluetooth"),
      element: BLE,
      isDisabled:
        unsupported.includes("Web Bluetooth") ||
        unsupported.includes("Secure Context"),
    },
    {
      id: "Serial",
      label: t("newDeviceDialog.tabSerial"),
      element: Serial,
      isDisabled:
        unsupported.includes("Web Serial") ||
        unsupported.includes("Secure Context"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("newDeviceDialog.title")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="HTTP">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <fieldset disabled={tab.isDisabled}>
                {tab.id !== "HTTP" && tab.isDisabled ? (
                  <ErrorMessage missingFeatures={unsupported} tabId={tab.id} />
                ) : (
                  <tab.element closeDialog={() => onOpenChange(false)} />
                )}
              </fieldset>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
