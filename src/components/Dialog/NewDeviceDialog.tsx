import {
  type BrowserFeature,
  useBrowserFeatureDetection,
} from "@app/core/hooks/useBrowserFeatureDetection";
import { BLE } from "@components/PageComponents/Connect/BLE.tsx";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { Serial } from "@components/PageComponents/Connect/Serial.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { AlertCircle, } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { Link } from "../UI/Typography/Link";
import { Fragment } from "react/jsx-runtime";

export interface TabElementProps {
  closeDialog: () => void;
}

export interface TabManifest {
  label: string;
  element: React.FC<TabElementProps>;
  disabled: boolean;
  disabledMessage: string;
  disabledLink?: string;
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

const listFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction'
});

const ErrorMessage = ({ missingFeatures }: FeatureErrorProps) => {
  if (missingFeatures.length === 0) return null;

  const browserFeatures = missingFeatures.filter(feature => feature !== "Secure Context");
  const needsSecureContext = missingFeatures.includes("Secure Context");

  const formatFeatureList = (features: string[]) => {
    const parts = listFormatter.formatToParts(features);
    return parts.map((part) => {
      if (part.type === 'element') {
        return (
          <Link
            key={part.value}
            href={links[part.value]}
          >
            {part.value}
          </Link>
        );
      }
      return <Fragment key={part.value}>{part.value}</Fragment>;
    });
  };

  return (
    <Subtle className="flex flex-col items-start gap-2 text-black bg-red-200/80 p-4 rounded-md">
      <div className="flex items-center gap-2 w-full">
        <AlertCircle size={40} className="mr-2 flex-shrink-0" />
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {browserFeatures.length > 0 && (
              <>
                This application requires {formatFeatureList(browserFeatures)}.
                Please use a Chromium-based browser like Chrome or Edge.
              </>
            )}
            {needsSecureContext && (
              <>
                {browserFeatures.length > 0 && " Additionally, it"}
                {browserFeatures.length === 0 && "This application"} requires a{" "}
                <Link
                  href={links["Secure Context"]}
                >
                  secure context
                </Link>
                . Please connect using HTTPS or localhost.
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
}: NewDeviceProps): JSX.Element => {
  const { unsupported } = useBrowserFeatureDetection();

  const tabs: TabManifest[] = [
    {
      label: "HTTP",
      element: HTTP,
      disabled: false,
      disabledMessage: "Unsuported connection method",
    },
    {
      label: "Bluetooth",
      element: BLE,
      disabled:
        unsupported.includes("Web Bluetooth") ||
        unsupported.includes("Secure Context"),
      disabledMessage: "",
    },
    {
      label: "Serial",
      element: Serial,
      disabled:
        unsupported.includes("Web Serial") ||
        unsupported.includes("Secure Context"),
      disabledMessage: "",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect New Device</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="HTTP">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.label}
                value={tab.label}
                disabled={tab.disabled}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.label} value={tab.label}>
              {tab.disabled ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tab.disabledMessage}
                </p>
              ) : (
                <tab.element closeDialog={() => onOpenChange(false)} />
              )}
            </TabsContent>
          ))}
          <ErrorMessage missingFeatures={unsupported} />
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
