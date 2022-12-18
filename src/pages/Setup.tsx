import type React from "react";

import { TabbedContent, TabType } from "@app/components/generic/TabbedContent";
import { Channel } from "@app/components/PageComponents/Channel.js";
import { Button } from "@components/form/Button.js";
import { useDevice } from "@core/providers/useDevice.js";
import { EspLoader } from '@toit/esptool.js';
import {
  ArrowDownOnSquareStackIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";
import { IBLEConnection, ISerialConnection, Protobuf } from "@meshtastic/meshtasticjs";
import { Mono } from "@app/components/generic/Mono";
import { FlashingProgress, useDeviceStore } from "@app/core/stores/deviceStore";

export const SetupPage = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const devices = getDevices();
  const devicesToFlash = devices.filter(d => d.selectedToFlash);
  
  let flashButtonText;
  let flashButtonEnabled = false;
  if(devicesToFlash.length == 0)
    flashButtonText = "No device selected";
  else if(devicesToFlash.filter(d => d.flashingProgress.step == 'done').length == devicesToFlash.length)
    flashButtonText = "Flashing complete";
  else {
    flashButtonText = "Flash";
    flashButtonEnabled = true;
  }

  return (
    <div className="m-auto text-center w-64 pt-24">
      <Mono>Devices to flash: {devicesToFlash.length}/{devices.length}</Mono><br/>
      <Button
        onClick={async () => {
          // const serialPort = devices[0].serialPort;
          // console.warn(`Serial port: ${serialPort}`);
          // if(!serialPort)
          //   throw "Not a serial port -- fix!";
          
          // const loader = new EspLoader(serialPort);
          //   await loader.connect();
          // --> Flash here

          devicesToFlash.forEach(d => simulateProgress(d.setFlashingProgress));
          //flash(serialPort, )
        }}
        disabled={!flashButtonEnabled}
      >
        { flashButtonText }
      </Button>
    </div>
  );
};

async function flash(port: SerialPort, setProgress: (progress: FlashingProgress) => void) {

}

async function simulateProgress(setProgress: (progress: FlashingProgress) => void) {
  let percentage = 0;  
  while(percentage < 1) {    
    setProgress({ step: 'flashing', percentage });
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1000));
    percentage += Math.random() * 0.1;    
  }
  setProgress({ step: 'done', percentage });
}