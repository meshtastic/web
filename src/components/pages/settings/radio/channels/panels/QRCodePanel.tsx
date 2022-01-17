import type React from 'react';

import QRCode from 'react-qr-code';

import { Tab } from '@headlessui/react';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface QRCodePanelProps {
  channel: Protobuf.Channel;
}

export const QRCodePanel = ({ channel }: QRCodePanelProps): JSX.Element => {
  return (
    <Tab.Panel className="flex flex-grow p-2">
      <div className="m-auto">
        <QRCode
          className="rounded-md"
          value={`https://www.meshtastic.org/d/#${channel.index}`}
        />
      </div>
    </Tab.Panel>
  );
};
