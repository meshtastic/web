import { BLE } from "@components/PageComponents/Connect/BLE.js";
import { HTTP } from "@components/PageComponents/Connect/HTTP.js";
import { Serial } from "@components/PageComponents/Connect/Serial.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./UI/Tabs.js";
import { Subtle } from "./UI/Typography/Subtle.js";
import { Link } from "./UI/Typography/Link.js";

export const NewDevice = () => {
  const tabs = [
    {
      label: "HTTP",
      element: HTTP,
      disabled: false,
      disabledMessage: "Unsuported connection method"
    },
    {
      label: "Bluetooth",
      element: BLE,
      disabled: !navigator.bluetooth,
      disabledMessage:
        "Web Bluetooth is currently only supported by Chromium-based browsers",
      disabledLink:
        "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility"
    },
    {
      label: "Serial",
      element: Serial,
      disabled: !navigator.serial,
      disabledMessage:
        "WebSerial is currently only supported by Chromium based browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility"
    }
  ];

  return (
    <div className="m-auto">
      <Tabs defaultValue="HTTP" className="w-[400px]">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger value={tab.label} disabled={tab.disabled}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent value={tab.label}>
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
    </div>
  );
};
