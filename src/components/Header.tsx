import React from 'react';

import { FaBroadcastTower, FaMobileAlt } from 'react-icons/fa';

import { Types } from '@meshtastic/meshtasticjs';

import typelogo from '../../public/typelogo.svg';

interface HeaderProps {
  status: Types.DeviceStatusEnum;
  IsReady: boolean;
  LastMeshInterraction: number;
}

const Header = (props: HeaderProps) => {
  return (
    <nav className="w-full shadow-md">
      <div className="flex w-full container mx-auto justify-between px-6 py-4">
        <img src={typelogo} height="30" width="200" />
        <div></div>

        <div className="flex items-center">
          <div className="flex pl-4">
            <div
              className={`w-5 h-5 rounded-full ${
                new Date(props.LastMeshInterraction) <
                new Date(Date.now() - 40000)
                  ? 'bg-red-400'
                  : new Date(props.LastMeshInterraction) <
                    new Date(Date.now() - 20000)
                  ? 'bg-yellow-400'
                  : 'bg-green-400'
              }`}
            ></div>
            <FaBroadcastTower className="m-auto ml-1 text-xl" />
          </div>

          <div className="flex pl-4">
            <div
              className={`w-5 h-5 rounded-full ${
                props.status <= Types.DeviceStatusEnum.DEVICE_DISCONNECTED
                  ? 'bg-red-400'
                  : props.status <= Types.DeviceStatusEnum.DEVICE_CONFIGURING &&
                    !props.IsReady
                  ? 'bg-yellow-400'
                  : props.IsReady
                  ? 'bg-green-400'
                  : 'bg-gray-400'
              }`}
            ></div>
            <FaMobileAlt className="m-auto ml-1 text-xl" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
