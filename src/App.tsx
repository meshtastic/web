import React from 'react';

import {
  Client,
  IHTTPConnection,
  Protobuf,
  SettingsManager,
  Types,
} from '@meshtastic/meshtasticjs';

import Header from './components/Header';
import Main from './Main';
import Translations_English from './translations/en';
import Translations_Japanese from './translations/jp';
import Translations_Portuguese from './translations/pt';

export enum LanguageEnum {
  ENGLISH,
  JAPANESE,
  PORTUGUESE,
}

export interface languageTemplate {
  no_messages_message: string;
  ui_settings_title: string;
  nodes_title: string;
  color_scheme_title: string;
  language_title: string;
  device_settings_title: string;
  device_channels_title: string;
  device_region_title: string;
  device_wifi_ssid: string;
  device_wifi_psk: string;
  save_changes_button: string;
  no_nodes_message: string;
  no_message_placeholder: string;
}

const App = () => {
  const [
    deviceStatus,
    setDeviceStatus,
  ] = React.useState<Types.DeviceStatusEnum>(
    Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  );
  const [myNodeInfo, setMyNodeInfo] = React.useState<Protobuf.MyNodeInfo>(
    Protobuf.MyNodeInfo.create(),
  );
  const [channels, setChannels] = React.useState([] as Protobuf.Channel[]);
  const [nodes, setNodes] = React.useState<Types.NodeInfoPacket[]>([]);
  const [connection, setConnection] = React.useState<IHTTPConnection>(
    new IHTTPConnection(),
  );
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [
    lastMeshInterraction,
    setLastMeshInterraction,
  ] = React.useState<number>(0);
  const [
    preferences,
    setPreferences,
  ] = React.useState<Protobuf.RadioConfig_UserPreferences>(
    Protobuf.RadioConfig_UserPreferences.create(),
  );
  const [language, setLanguage] = React.useState<LanguageEnum>(
    LanguageEnum.ENGLISH,
  );
  const [translations, setTranslations] = React.useState<languageTemplate>(
    Translations_English,
  );
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
    const connection = client.createHTTPConnection();

    connection.connect({
      address:
        import.meta.env.NODE_ENV === 'production'
          ? window.location.hostname
          : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
      receiveBatchRequests: false,
      tls: false,
      fetchInterval: 2000,
    });
    setConnection(connection);
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;

    const deviceStatusEvent = connection.onDeviceStatusEvent.subscribe(
      (status) => {
        setDeviceStatus(status);
        if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
          setIsReady(true);
        }
      },
    );
    const myNodeInfoEvent = connection.onMyNodeInfoEvent.subscribe(
      setMyNodeInfo,
    );

    const nodeInfoPacketEvent = connection.onNodeInfoPacketEvent.subscribe(
      (node) => {
        if (
          nodes.findIndex(
            (currentNode) => currentNode.data.num === node.data.num,
          ) >= 0
        ) {
          setNodes(
            nodes.map((currentNode) =>
              currentNode.data.num === node.data.num ? node : currentNode,
            ),
          );
        } else {
          setNodes((nodes) => [...nodes, node]);
        }
      },
    );

    const adminPacketEvent = connection.onAdminPacketEvent.subscribe(
      (adminMessage) => {
        switch (adminMessage.data.variant.oneofKind) {
          case 'getRadioResponse':
            if (adminMessage.data.variant.getRadioResponse.preferences) {
              setPreferences(
                adminMessage.data.variant.getRadioResponse.preferences,
              );
            }

            break;
          case 'getChannelResponse':
            if (adminMessage.data.variant.getChannelResponse) {
              let message = adminMessage.data.variant.getChannelResponse;
              setChannels((channels) => [...channels, message]);
            }

          default:
            break;
        }
      },
    );

    const meshHeartbeat = connection.onMeshHeartbeat.subscribe(
      setLastMeshInterraction,
    );

    return () => {
      deviceStatusEvent.unsubscribe();
      myNodeInfoEvent.unsubscribe();
      nodeInfoPacketEvent.unsubscribe();
      adminPacketEvent.unsubscribe();
      meshHeartbeat.unsubscribe();
      connection.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header
        status={deviceStatus}
        IsReady={isReady}
        LastMeshInterraction={lastMeshInterraction}
      />
      <Main
        isReady={isReady}
        myNodeInfo={myNodeInfo}
        connection={connection}
        nodes={nodes}
        channels={channels}
        preferences={preferences}
        language={language}
        setLanguage={setLanguage}
        translations={translations}
        darkmode={darkmode}
        setDarkmode={setDarkmode}
      />
    </div>
  );
};

export default App;
