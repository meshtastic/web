import { DeviceSelectorButton } from "@components/DeviceSelectorButton.js";
import { Separator } from "@components/UI/Seperator.js";
import { Code } from "@components/UI/Typography/Code.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  HomeIcon,
  LanguagesIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  TerminalIcon,
} from "lucide-react";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const {
    selectedDevice,
    setSelectedDevice,
    darkMode,
    setDarkMode,
    setCommandPaletteOpen,
    setConnectDialogOpen,
  } = useAppStore();

  return (
    <nav className="flex flex-col justify-between border-r-[0.5px] border-slate-300 bg-transparent pt-2 dark:border-slate-700">
      <div className="flex flex-col overflow-y-hidden">
        <ul className="flex w-20 grow flex-col items-center space-y-4 bg-transparent py-4 px-5">
          <DeviceSelectorButton
            active={selectedDevice === 0}
            onClick={() => {
              setSelectedDevice(0);
            }}
          >
            <HomeIcon />
          </DeviceSelectorButton>
          {getDevices().map((device) => (
            <DeviceSelectorButton
              key={device.id}
              onClick={() => {
                setSelectedDevice(device.id);
              }}
              active={selectedDevice === device.id}
            >
              <Hashicon
                size={24}
                value={device.hardware.myNodeNum.toString()}
              />
            </DeviceSelectorButton>
          ))}
          <Separator />
          <button
            type="button"
            onClick={() => setConnectDialogOpen(true)}
            className="transition-all duration-300 hover:text-accent"
          >
            <PlusIcon />
          </button>
        </ul>
      </div>
      <div className="flex w-20 flex-col items-center space-y-5 bg-transparent px-5 pb-5">
        <button
          type="button"
          className="transition-all hover:text-accent"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          className="transition-all hover:text-accent"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <TerminalIcon />
        </button>
        <button type="button" className="transition-all hover:text-accent">
          <LanguagesIcon />
        </button>
        <Separator />
        <Code>{process.env.COMMIT_HASH}</Code>
      </div>
    </nav>
  );
};
