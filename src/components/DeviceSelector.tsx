import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { NavSpacer } from "@app/Nav/NavSpacer.js";
import { PageNav } from "@app/Nav/PageNav.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { PlusIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { MoonIcon, SunIcon } from "@primer/octicons-react";
import { IconButton } from "./form/IconButton.js";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice, setSelectedDevice, darkMode, setDarkMode } =
    useAppStore();

  return (
    <div className="flex h-full w-14 items-center gap-3 bg-backgroundPrimary pt-3 [writing-mode:vertical-rl]">
      <div className="flex items-center gap-3">
        <span className="flex font-bold text-textPrimary">
          {getDevices().map((device) => (
            <div
              key={device.id}
              onClick={() => {
                setSelectedDevice(device.id);
              }}
              className={`cursor-pointer border-x-4 border-backgroundPrimary bg-backgroundPrimary py-3 px-2 hover:brightness-hover active:brightness-press ${
                selectedDevice === device.id ? "border-l-accent" : ""
              }`}
            >
              <Hashicon
                size={32}
                value={device.hardware.myNodeNum.toString()}
              />
            </div>
          ))}
          <div
            onClick={() => {
              setSelectedDevice(0);
            }}
            className={`cursor-pointer border-x-4 border-backgroundPrimary bg-backgroundPrimary py-4 px-3 hover:brightness-hover active:brightness-press ${
              selectedDevice === 0 ? "border-l-accent" : ""
            }`}
          >
            <PlusIcon className="w-6" />
          </div>
        </span>
      </div>

      {selectedDevice !== 0 && (
        <>
          <NavSpacer />
          <PageNav />
        </>
      )}

      <NavSpacer />

      <div
        onClick={() => setDarkMode(!darkMode)}
        className="bg-backgroundPrimary py-5 px-4 text-textSecondary hover:text-textPrimary hover:brightness-hover active:brightness-press"
      >
        {darkMode ? <SunIcon className="w-4" /> : <MoonIcon className="w-4" />}
      </div>

      <div
          onClick={() => {
            setSelectedDevice(-1);
          }}
          className="group flex h-8 w-8 cursor-pointer p-0.5 drop-shadow-md"
        >
          <WrenchScrewdriverIcon />
          <div
            className={`absolute -left-1.5 h-7 w-0.5 rounded-full group-hover:bg-accent ${
              selectedDevice === -1 ? "bg-accent" : "bg-transparent"
            }`}
          />
      </div>

      <img
        src={darkMode ? "Logo_White.svg" : "Logo_Black.svg"}
        className="mt-auto px-2 py-3"
      />
    </div>
  );
};
