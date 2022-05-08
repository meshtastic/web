import type React from 'react';

import { Button } from '@components/generic/button/Button';
import { Card } from '@components/generic/Card';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Debug = (): JSX.Element => {
  const hardwareInfo = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  );
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware.myNodeNum,
  );
  const node = useAppSelector((state) =>
    state.meshtastic.nodes.find(
      (node) => node.data.num === hardwareInfo.myNodeNum,
    ),
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row">
      <Card className="flex-grow">
        <div className="grid grid-cols-4 gap-4">
          <Button
            onClick={(): void => {
              void connection.configure();
            }}
          >
            Configure
          </Button>
          <Button
            onClick={(): void => {
              void connection.getAllChannels();
            }}
          >
            Get All Channels
          </Button>
          <Button
            onClick={(): void => {
              const packet = Protobuf.AdminMessage.create({
                variant: {
                  oneofKind: 'getConfigRequest',
                  getConfigRequest:
                    Protobuf.AdminMessage_ConfigType.LORA_CONFIG,
                },
              });

              void connection.sendPacket(
                Protobuf.AdminMessage.toBinary(packet),
                Protobuf.PortNum.ADMIN_APP,
                myNodeNum,
                true,
                0,
                true,
                false,
                async (num) => {
                  return await Promise.resolve();
                },
              );
            }}
          >
            Get All Config
          </Button>

          <Button
            onClick={(): void => {
              void connection.getConfig(
                Protobuf.AdminMessage_ConfigType.DISPLAY_CONFIG,
                async (id) => {
                  console.log(`RESPONSE - ${id}`);
                  return Promise.resolve();
                },
              );
            }}
          >
            Get Display Config
          </Button>
          <Button
            onClick={(): void => {
              void connection.getConfig(
                Protobuf.AdminMessage_ConfigType.LORA_CONFIG,
                async (id) => {
                  console.log(`RESPONSE - ${id}`);
                  return Promise.resolve();
                },
              );
            }}
          >
            Get LoRa Config
          </Button>
          <Button
            onClick={(): void => {
              void connection.setConfig(
                Protobuf.Config.create({
                  payloadVariant: {
                    oneofKind: 'lora',
                    lora: Protobuf.Config_LoRaConfig.create({
                      modemPreset:
                        Protobuf.Config_LoRaConfig_ModemPreset.MidSlow,
                    }),
                  },
                }),
                async (id) => {
                  console.log(`RESPONSE - ${id}`);
                  return Promise.resolve();
                },
              );
            }}
          >
            Set LoRa Config
          </Button>
        </div>
      </Card>
    </div>
  );
};
