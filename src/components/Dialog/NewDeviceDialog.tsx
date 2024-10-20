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
import { useTranslation } from "react-i18next";
import i18n from "i18next";

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

const tabs: TabManifest[] = [
  {
    label: i18n.t("HTTP"),
    element: HTTP,
    disabled: false,
    disabledMessage: i18n.t("Unsuported connection method"),
  },
  {
    label: i18n.t("Bluetooth"),
    element: BLE,
    disabled: !navigator.bluetooth,
    disabledMessage: i18n.t(
      "Web Bluetooth is currently only supported by Chromium-based browsers"
    ),
    disabledLink:
      "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
  },
  {
    label: i18n.t("Serial"),
    element: Serial,
    disabled: !navigator.serial,
    disabledMessage: i18n.t(
      "WebSerial is currently only supported by Chromium based browsers"
    ),
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Connect New Device")}</DialogTitle>
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

        {(!navigator.bluetooth || !navigator.serial) && (
          <>
            <Subtle>
              {t(
                "Web Bluetooth and Web Serial are currently only supported by Chromium-based browsers."
              )}
            </Subtle>
            <Subtle>
              {t("Read more:")}
              <Link href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility">
                {t("Web Bluetooth")}
              </Link>
              &nbsp;
              <Link href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility">
                {t("Web Serial")}
              </Link>
            </Subtle>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
