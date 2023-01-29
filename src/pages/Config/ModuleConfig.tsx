import { Fragment } from "react";
import { Audio } from "@components/PageComponents/ModuleConfig/Audio.js";
import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.js";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.js";
import { useDevice } from "@app/core/providers/useDevice.js";
import { NavBar } from "@app/Nav/NavBar.js";
import { VerticalTabbedContent } from "@app/components/generic/VerticalTabbedContent.js";

export const ModuleConfig = (): JSX.Element => {
  const { workingModuleConfig, connection } = useDevice();

  const tabs = [
    {
      label: "MQTT",
      element: MQTT
    },
    {
      label: "Serial",
      element: Serial
    },
    {
      label: "External Notification",
      element: ExternalNotification
    },
    {
      label: "Store & Forward",
      element: StoreForward
    },
    {
      label: "Range Test",
      element: RangeTest
    },
    {
      label: "Telemetry",
      element: Telemetry
    },
    {
      label: "Canned Message",
      element: CannedMessage
    },
    {
      label: "Audio Config",
      element: Audio
    }
  ];

  return (
    <div className="flex flex-grow flex-col gap-2">
      <NavBar
        breadcrumb={["Module Config"]}
        actions={[
          {
            label: "Apply & Reboot",
            async onClick() {
              workingModuleConfig.map(async (moduleConfig) => {
                await connection?.setModuleConfig(moduleConfig);
              });
              await connection?.commitEditSettings();
            }
          }
        ]}
      />

      <VerticalTabbedContent tabs={tabs} />
    </div>
  );
};
