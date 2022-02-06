import type React from 'react';

import QRCode from 'react-qr-code';

import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface QRCodePanelProps {
  channel: Protobuf.Channel;
}

export const QRCodePanel = ({ channel }: QRCodePanelProps): JSX.Element => {
  return (
    <div className="m-auto">
      <QRCode
        className="rounded-md"
        value={`https://www.meshtastic.org/d/#${channel.index}`}
      />
    </div>
  );
};
