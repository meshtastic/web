import { useDevice } from "@core/providers/useDevice.js";
import { toMGRS } from "@core/utils/toMGRS.js";
import { BatteryWidget } from "@components/Widgets/BatteryWidget.js";
import { DeviceWidget } from "@components/Widgets/DeviceWidget.js";
import { PeersWidget } from "@components/Widgets/PeersWidget.js";
import { PositionWidget } from "@components/Widgets/PositionWidget.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { CommandLineIcon } from "@heroicons/react/24/outline";
import { Types } from "@meshtastic/meshtasticjs";
import { Input } from "@components/form/Input.js";

export const Sidebar = (): JSX.Element => {
  const { removeDevice } = useDeviceStore();
  const { connection, hardware, nodes, status, currentMetrics } = useDevice();
  const { selectedDevice, setSelectedDevice, setCommandPaletteOpen } =
    useAppStore();
  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (
    <div className="bg-slate-50 relative flex w-72 flex-shrink-0 flex-col gap-2 p-2">
      <DeviceWidget
        name={
          nodes.find((n) => n.data.num === hardware.myNodeNum)?.data.user
            ?.longName ?? "UNK"
        }
        nodeNum={hardware.myNodeNum.toString()}
        disconnected={status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED}
        disconnect={() => {
          void connection?.disconnect();
          setSelectedDevice(0);
          removeDevice(selectedDevice ?? 0);
        }}
        reconnect={() => {
          void connection?.disconnect();
        }}
      />

      <div className="flex flex-grow flex-col gap-3">
        <BatteryWidget
          batteryLevel={currentMetrics.batteryLevel}
          voltage={currentMetrics.voltage}
        />
        <PeersWidget
          peers={nodes
            .map((n) => n.data)
            .filter((n) => n.num !== hardware.myNodeNum)}
        />
        <PositionWidget
          grid={toMGRS(
            myNode?.data.position?.latitudeI,
            myNode?.data.position?.longitudeI
          )}
        />
        <div className="mt-auto">
          <Input
            placeholder={"Search for a command"}
            onClick={() => setCommandPaletteOpen(true)}
            action={{
              icon: <CommandLineIcon className="w-4" />,
              action() {
                setCommandPaletteOpen(true);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
