import { BLE } from "../PageComponents/Connect/BLE.js";
import { HTTP } from "../PageComponents/Connect/HTTP.js";
import { Serial } from "../PageComponents/Connect/Serial.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.js";
import { Link } from "@components/UI/Typography/Link.js";
import { Subtle } from "@components/UI/Typography/Subtle.js";

const tabs = [
  {
    label: "HTTP",
    element: HTTP,
    disabled: false,
    disabledMessage: "Unsuported connection method",
  },
  {
    label: "Bluetooth",
    element: BLE,
    disabled: !navigator.bluetooth,
    disabledMessage:
      "Web Bluetooth is currently only supported by Chromium-based browsers",
    disabledLink:
      "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
  },
  {
    label: "Serial",
    element: Serial,
    disabled: !navigator.serial,
    disabledMessage:
      "WebSerial is currently only supported by Chromium based browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility",
  },
];
export interface NewDeviceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewDeviceDialog = ({
  open,
  onOpenChange,
}: NewDeviceProps): JSX.Element => {
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
          {tabs.map((tab, index) => (
            <TabsContent key={index} value={tab.label}>
              {tab.disabled ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tab.disabledMessage}
                </p>
              ) : (
                <tab.element />
              )}
            </TabsContent>
          ))}
        </Tabs>

        {(!navigator.bluetooth || !navigator.serial) && (
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
