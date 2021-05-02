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
  const [deviceStatus, setDeviceStatus] = React.useState(
    {} as Types.DeviceStatusEnum,
  );
  const [myNodeInfo, setMyNodeInfo] = React.useState({} as Protobuf.MyNodeInfo);
  const [messages, setMessages] = React.useState(
    [] as { message: Types.TextPacket; ack: false }[],
  );
  const [channels, setChannels] = React.useState([] as Protobuf.Channel[]);
  const [nodes, setNodes] = React.useState([] as Types.NodeInfoPacket[]);
  const [connection, setConnection] = React.useState({} as IHTTPConnection);
  const [isReady, setIsReady] = React.useState(false);
  const [lastMeshInterraction, setLastMeshInterraction] = React.useState(0);
  const [preferences, setPreferences] = React.useState(
    {} as Protobuf.RadioConfig_UserPreferences,
  );
  const [language, setLanguage] = React.useState(LanguageEnum.ENGLISH);
  const [translations, setTranslations] = React.useState(Translations_English);

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
    setConnection(connection);
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
    connection.onDeviceStatusEvent.subscribe((status) => {
      setDeviceStatus(status);
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
        setIsReady(true);
      }
    });
    connection.onMyNodeInfoEvent.subscribe(setMyNodeInfo);
    connection.onTextPacketEvent.subscribe((message) => {
      setMessages((messages) => [
        ...messages,
        { message: message, ack: false },
      ]);
    });
    connection.onNodeInfoPacketEvent.subscribe((node) => {
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
    });

    connection.onAdminPacketEvent.subscribe((adminMessage) => {
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
    });

    connection.onMeshHeartbeat.subscribe(setLastMeshInterraction);

    connection.onRoutingPacketEvent.subscribe((routingPacket) => {
      console.log(routingPacket);
      // console.log(messages);

      // messages.map((message) => {
      //   console.log(
      //     `${
      //       routingPacket.payloadVariant.oneofKind === 'decoded'
      //         ? routingPacket.payloadVariant.decoded.requestId
      //         : null
      //     } === ${message.message.packet.id}: ${
      //       routingPacket.payloadVariant.oneofKind === 'decoded'
      //         ? routingPacket.payloadVariant.decoded.requestId
      //         : null === message.message.packet.id
      //     }`,
      //   );
      // });
      // messages.find((message) => {
      //   message.message.packet.id === routingPacket.decoded.requestId;
      // });
    });
  }, []);
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header
        status={deviceStatus}
        IsReady={isReady}
        LastMeshInterraction={lastMeshInterraction}
      />
      <Main
        IsReady={isReady}
        Messages={messages}
        MyNodeInfo={myNodeInfo}
        Connection={connection}
        Nodes={nodes}
        Channels={channels}
        Preferences={preferences}
        Language={language}
        SetLanguage={setLanguage}
        Translations={translations}
      />
    </div>
  );
};

export default App;
