import React from 'react';

import type {
  IBLEConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';
import {
  Client,
  IHTTPConnection,
  Protobuf,
  SettingsManager,
  Types,
} from '@meshtastic/meshtasticjs';

import Header from './components/Header';
import Main from './Main';
import { channelSubject$, nodeSubject$, preferencesSubject$ } from './streams';
import Translations_English from './translations/en';
import Translations_Japanese from './translations/jp';
import Translations_Portuguese from './translations/pt';
import type { languageTemplate } from './translations/TranslationContext';
import { LanguageEnum } from './translations/TranslationContext';

const App = (): JSX.Element => {
  const [deviceStatus, setDeviceStatus] =
    React.useState<Types.DeviceStatusEnum>(
      Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
    );
  const [myNodeInfo, setMyNodeInfo] = React.useState<Protobuf.MyNodeInfo>(
    Protobuf.MyNodeInfo.create(),
  );
  // const [channels, setChannels] = React.useState([] as Protobuf.Channel[]);
  const [nodes, setNodes] = React.useState<Types.NodeInfoPacket[]>([]);
  const [connection, setConnection] = React.useState<
    ISerialConnection | IHTTPConnection | IBLEConnection
  >(new IHTTPConnection());
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [lastMeshInterraction, setLastMeshInterraction] =
    React.useState<number>(0);

  const [language, setLanguage] = React.useState<LanguageEnum>(
    LanguageEnum.ENGLISH,
  );
  const [translations, setTranslations] =
    React.useState<languageTemplate>(Translations_English);
  const [darkmode, setDarkmode] = React.useState<boolean>(false);

  React.useEffect(() => {
    switch (language) {
      case LanguageEnum.ENGLISH:
        setTranslations(Translations_English);
        break;
      case LanguageEnum.PORTUGUESE:
        setTranslations(Translations_Portuguese);
        break;
      case LanguageEnum.JAPANESE:
        setTranslations(Translations_Japanese);
        break;

      default:
        break;
    }
  }, [language]);

  React.useEffect(() => {
    const client = new Client();
    const tmpConnection = client.createHTTPConnection();

    tmpConnection.connect({
      address:
        import.meta.env.NODE_ENV === 'production'
          ? window.location.hostname
          : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
      receiveBatchRequests: false,
      tls: false,
      fetchInterval: 2000,
    });
    setConnection(tmpConnection);
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;
  }, []);

  React.useEffect(() => {
    const deviceStatusEvent = connection.onDeviceStatusEvent.subscribe(
      (status) => {
        setDeviceStatus(status);
        if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
          setIsReady(true);
        }
      },
    );
    const myNodeInfoEvent =
      connection.onMyNodeInfoEvent.subscribe(setMyNodeInfo);

    const nodeInfoPacketEvent = connection.onNodeInfoPacketEvent.subscribe(
      (node) => nodeSubject$.next(node),
    );

    const adminPacketEvent = connection.onAdminPacketEvent.subscribe(
      (adminMessage) => {
        switch (adminMessage.data.variant.oneofKind) {
          case 'getChannelResponse':
            channelSubject$.next(adminMessage.data.variant.getChannelResponse);
            break;
          case 'getRadioResponse':
            if (adminMessage.data.variant.getRadioResponse.preferences) {
              preferencesSubject$.next(
                adminMessage.data.variant.getRadioResponse.preferences,
              );
            }
            break;
          default:
            break;
        }
      },
    );

    const meshHeartbeat = connection.onMeshHeartbeat.subscribe(
      setLastMeshInterraction,
    );

    return () => {
      deviceStatusEvent?.unsubscribe();
      myNodeInfoEvent?.unsubscribe();
      nodeInfoPacketEvent?.unsubscribe();
      adminPacketEvent?.unsubscribe();
      meshHeartbeat?.unsubscribe();
      connection.disconnect();
    };
  }, [connection, nodes]);

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header
        status={deviceStatus}
        IsReady={isReady}
        LastMeshInterraction={lastMeshInterraction}
        connection={connection}
        setConnection={setConnection}
      />
      <Main
        isReady={isReady}
        myNodeInfo={myNodeInfo}
        connection={connection}
        language={language}
        setLanguage={setLanguage}
        darkmode={darkmode}
        setDarkmode={setDarkmode}
      />
    </div>
  );
};

export default App;
