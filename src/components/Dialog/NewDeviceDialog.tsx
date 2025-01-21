import { useBrowserFeatureDetection } from "@app/core/hooks/useBrowserFeatureDetection";
import { BLE } from "@components/PageComponents/Connect/BLE.tsx";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { Serial } from "@components/PageComponents/Connect/Serial.tsx";
import {
  Dialog,
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
import { Link } from "@components/UI/Typography/Link.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";

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

export const NewDeviceDialog = ({
  open,
  onOpenChange,
}: NewDeviceProps): JSX.Element => {
  const { hasRequiredFeatures, isSecureContext, missingFeatures } = useBrowserFeatureDetection();
  console.log(missingFeatures);

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
      disabled: missingFeatures.includes("Web Bluetooth"),
      disabledMessage:
        "Web Bluetooth is currently only supported by Chromium-based browsers",
      disabledLink:
        "https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility"
    },
    {
      label: "Serial",
      element: Serial,
      disabled: missingFeatures.includes("Web Serial"),
      disabledMessage:
        "Web Serial is currently only supported by Chromium based browsers",
      disabledLink: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
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
        </Tabs>

        {!isSecureContext && (
          <>
            <Subtle>
              Web Bluetooth and Web Serial require using a HTTPS connection or to localhost.
            </Subtle>
            <Subtle>
              Read more:&nbsp;
              <Link href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts">
                Secure Contexts
              </Link>
            </Subtle>
          </>
        )}

        {!hasRequiredFeatures && (
          <>
            <Subtle>
              Web Bluetooth and Web Serial are currently only supported by
              Chromium-based browsers.
            </Subtle>
            <Subtle>
              Read more:&nbsp;
              <Link href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility">
                Web Bluetooth
              </Link>
              &nbsp;
              <Link href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility">
                Web Serial
              </Link>
            </Subtle>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
