import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  PlusIcon,
  HomeIcon,
  LanguagesIcon,
  SunIcon,
  MoonIcon,
  GithubIcon,
  TerminalIcon
} from "lucide-react";
import { Separator } from "./UI/Seperator.js";
import { cn } from "@app/core/utils/cn.js";
import { Code } from "./UI/Typography/Code.js";
import { SidebarButton } from "./SidebarButton.js";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const {
    selectedDevice,
    setSelectedDevice,
    darkMode,
    setDarkMode,
    setCommandPaletteOpen,
    setConnectDialogOpen
  } = useAppStore();

  return (
    <nav className="drag custom-border flex flex-col justify-between border-r-[0.5px] bg-transparent pt-2">
      <div className="flex flex-col overflow-y-hidden">
        <ul className="flex w-20 grow flex-col items-center space-y-4 bg-transparent py-4 px-5">
          <SidebarButton active={false} onClick={() => {}}>
            <HomeIcon />
          </SidebarButton>
          {getDevices().map((device) => (
            <SidebarButton
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
            </SidebarButton>
          ))}
          <Separator />
          <button
            onClick={() => setConnectDialogOpen(true)}
            className="transition-all duration-300 hover:text-accent"
          >
            <PlusIcon />
          </button>
        </ul>
      </div>
      <div className="flex w-20 flex-col items-center space-y-5 bg-transparent px-5 pb-5">
        <button
          className="transition-all hover:text-accent"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          className="transition-all hover:text-accent"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <TerminalIcon />
        </button>
        <button className="transition-all hover:text-accent">
          <LanguagesIcon />
        </button>
        <Separator />
        <Code>{process.env.COMMIT_HASH}</Code>
      </div>
    </nav>
  );
};
