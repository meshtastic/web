import {
  type BrowserFeature,
  useBrowserFeatureDetection,
} from "@core/hooks/useBrowserFeatureDetection.ts";
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
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "../UI/Typography/Link.tsx";

export interface TabElementProps {
  closeDialog: () => void;
}

export interface TabManifest {
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
}

const links: { [key: string]: string } = {
  "Web Bluetooth":
    "https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility",
  "Web Serial":
    "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
  "Secure Context":
    "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts",
};

const ErrorMessage = ({ missingFeatures }: FeatureErrorProps) => {
  const { i18n } = useTranslation("dialog");

  const listFormatter = useMemo(
    () =>
      new Intl.ListFormat(i18n.language, {
        style: "long",
        type: "disjunction",
      }),
    [i18n.language],
  );

  if (missingFeatures.length === 0) return null;

  const browserFeatures = missingFeatures.filter(
    (feature) => feature !== "Secure Context",
  );
  const needsSecureContext = missingFeatures.includes("Secure Context");

  const formatFeatureList = (features: string[]) => {
    const parts = listFormatter.formatToParts(features);
    return parts.map((part) => {
      if (part.type === "element") {
        return (
          <Link key={part.value} href={links[part.value]}>
            {part.value}
          </Link>
        );
      }
      return <span key={part.value}>{part.value}</span>;
    });
  };

  const featureNodes = formatFeatureList(browserFeatures);

  return (
    <Subtle className="flex flex-col items-start gap-2 bg-red-500 p-4 rounded-md">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle size={40} className="mr-2 shrink-0 text-white" />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white">
            {browserFeatures.length > 0 && (
              <Trans
                i18nKey="newDeviceDialog.validation.requiresFeatures"
                components={{
                  "0": <>{featureNodes}</>,
                }}
              />
            )}
            {browserFeatures.length > 0 && needsSecureContext && " "}
            {needsSecureContext && (
              <Trans
                i18nKey={browserFeatures.length > 0
                  ? "newDeviceDialog.validation.additionallyRequiresSecureContext"
                  : "newDeviceDialog.validation.requiresSecureContext"}
                components={{
                  "0": (
                    <Link
                      href={links["Secure Context"]}
                      className="underline hover:text-slate-200"
                    />
                  ),
                }}
              />
            )}
          </p>
        </div>
      </div>
    </Subtle>
  );
};

export const NewDeviceDialog = ({
  open,
  onOpenChange,
}: NewDeviceProps) => {
  const { t } = useTranslation("dialog");
  const { unsupported } = useBrowserFeatureDetection();

  const tabs: TabManifest[] = [
    {
      label: t("newDeviceDialog.tabHttp"),
      element: HTTP,
      isDisabled: false,
    },
    {
      label: t("newDeviceDialog.tabBluetooth"),
      element: BLE,
      isDisabled: unsupported.includes("Web Bluetooth") ||
        unsupported.includes("Secure Context"),
    },
    {
      label: t("newDeviceDialog.tabSerial"),
      element: Serial,
      isDisabled: unsupported.includes("Web Serial") ||
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
              <TabsTrigger key={tab.label} value={tab.label}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.label} value={tab.label}>
              <fieldset disabled={tab.isDisabled}>
                {(tab.label !== "HTTP" &&
                    tab.isDisabled)
                  ? <ErrorMessage missingFeatures={unsupported} />
                  : null}
                <tab.element
                  closeDialog={() => onOpenChange(false)}
                />
              </fieldset>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
