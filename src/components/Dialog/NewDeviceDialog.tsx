import {
  type BrowserFeature,
  useBrowserFeatureDetection,
} from "../../core/hooks/useBrowserFeatureDetection.ts";
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
import { Link } from "../UI/Typography/Link.tsx";
import { Fragment } from "react/jsx-runtime";

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

const listFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

const ErrorMessage = ({ missingFeatures }: FeatureErrorProps) => {
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
      return <Fragment key={part.value}>{part.value}</Fragment>;
    });
  };

  return (
    <Subtle className="flex flex-col items-start gap-2 text-slate-900 bg-red-200/80 p-4 rounded-md">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle size={40} className="mr-2 shrink-0" />
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {browserFeatures.length > 0 && (
              <>
                This application requires{" "}
                {formatFeatureList(browserFeatures)}. Please use a
                Chromium-based browser like Chrome or Edge.
              </>
            )}
            {needsSecureContext && (
              <>
                {browserFeatures.length > 0 && " Additionally, it"}
                {browserFeatures.length === 0 && "This application"} requires a
                {" "}
                <Link href={links["Secure Context"]}>secure context</Link>.
                Please connect using HTTPS or localhost.
              </>
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
  const { unsupported } = useBrowserFeatureDetection();

  const tabs: TabManifest[] = [
    {
      label: "HTTP",
      element: HTTP,
      isDisabled: false,
    },
    {
      label: "Bluetooth",
      element: BLE,
      isDisabled: unsupported.includes("Web Bluetooth") ||
        unsupported.includes("Secure Context"),
    },
    {
      label: "Serial",
      element: Serial,
      isDisabled: unsupported.includes("Web Serial") ||
        unsupported.includes("Secure Context"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Connect New Device</DialogTitle>
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
                {tab.isDisabled
                  ? <ErrorMessage missingFeatures={unsupported} />
                  : null}
                <tab.element closeDialog={() => onOpenChange(false)} />
              </fieldset>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
