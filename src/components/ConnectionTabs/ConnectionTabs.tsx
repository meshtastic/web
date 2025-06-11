import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { HTTPTab } from "@components/Dialog/Tabs/HTTPTab.tsx";
import { BluetoothTab } from "@components/Dialog/Tabs/BluetoothTab.tsx";
import { SerialTab } from "@components/Dialog/Tabs/SerialTab.tsx";
import { Bluetooth, Server, Usb } from "lucide-react";

interface ConnectionTabsProps {
  closeDialog?: () => void;
  className?: string;
}

export const ConnectionTabs = (
  { closeDialog, className }: ConnectionTabsProps,
) => {
  const handleClose = () => {
    if (closeDialog) {
      closeDialog();
    }
  };

  return (
    <Tabs defaultValue="http" className={`w-full ${className || ""}`}>
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="http" className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          HTTP
        </TabsTrigger>
        <TabsTrigger value="bluetooth" className="flex items-center gap-2">
          <Bluetooth className="h-4 w-4" />
          Bluetooth
        </TabsTrigger>
        <TabsTrigger value="serial" className="flex items-center gap-2">
          <Usb className="h-4 w-4" />
          Serial
        </TabsTrigger>
      </TabsList>

      <div className="min-h-[400px] max-h-[500px] overflow-y-auto">
        <TabsContent value="http" className="mt-0">
          <HTTPTab closeDialog={handleClose} />
        </TabsContent>

        <TabsContent value="bluetooth" className="mt-0">
          <BluetoothTab closeDialog={handleClose} />
        </TabsContent>

        <TabsContent value="serial" className="mt-0">
          <SerialTab closeDialog={handleClose} />
        </TabsContent>
      </div>
    </Tabs>
  );
};
