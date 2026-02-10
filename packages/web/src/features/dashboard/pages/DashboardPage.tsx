import {
  useChannels,
  useConfig,
  useConnection,
  useModuleConfigVariant,
  useTelemetryHistory,
} from "@data/hooks";
import { Protobuf } from "@meshtastic/core";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { useMyNode } from "@shared/hooks";
import { Activity, useState } from "react";
import { BatteryCard } from "../components/BatteryCard";
import { ChannelsCard } from "../components/ChannelsCard";
import { ConnectivityCard } from "../components/ConnectivityCard";
import { DeviceHeader } from "../components/DeviceHeader";
import { GpsCard } from "../components/GpsCard";
import { MqttCard } from "../components/MqttCard";
import { RadioConfigCard } from "../components/RadioConfigCard";
import { TelemetryCard } from "../components/TelemetryCard";
import { ChannelUtilizationChart } from "../components/charts/ChannelUtilizationChart";
import { DeliveryRateChart } from "../components/charts/DeliveryRateChart";
import { EnvironmentChart } from "../components/charts/EnvironmentChart";
import { HopCountChart } from "../components/charts/HopCountChart";
import { MessageActivityChart } from "../components/charts/MessageActivityChart";
import { NodeSignalChart } from "../components/charts/NodeSignalChart";
import { SignalChart } from "../components/charts/SignalChart";
import { mockDeviceData } from "../data/mockDeviceData";
import { useDashboardCharts } from "../hooks/useDashboardCharts";

export function DashboardPage() {
  const [data] = useState(mockDeviceData);
  const [activeTab, setActiveTab] = useState("overview");
  const { myNodeNum, myNode } = useMyNode();
  const { channels } = useChannels(myNodeNum);
  const { firmwareVersion } = useConfig(myNodeNum);
  const { connection } = useConnection(myNodeNum);
  const mqttConfig = useModuleConfigVariant(myNodeNum, "mqtt");
  const { telemetry } = useTelemetryHistory(myNodeNum, myNodeNum);

  // Chart data from telemetry + signal logs (memoized transformations)
  const {
    signalData,
    channelUtilData,
    environmentData,
    messageActivityData,
    deliveryRateData,
    hopCountData,
    nodeSignalData,
  } = useDashboardCharts(myNodeNum, myNodeNum);

  const latestEnv = telemetry.find(
    (t) => t.temperature != null || t.relativeHumidity != null,
  );

  // Map node role integer to label
  const roleLabel =
    myNode?.role != null
      ? (Protobuf.Config.Config_DeviceConfig_Role[myNode.role] ?? null)
      : null;

  // Convert latitudeI/longitudeI (integer * 1e7) to decimal degrees
  const latitude = myNode?.latitudeI != null ? myNode.latitudeI / 1e7 : null;
  const longitude = myNode?.longitudeI != null ? myNode.longitudeI / 1e7 : null;

  const isConnected = connection?.status === "connected";

  return (
    <div className="px-4 py-6">
      {/* Device Header */}
      <div className="mb-6">
        <DeviceHeader
          nodeNum={myNodeNum}
          longName={myNode?.longName ?? null}
          role={roleLabel}
          firmwareVersion={firmwareVersion}
          isConnected={isConnected}
          uptimeSeconds={myNode?.uptimeSeconds ?? null}
        />
      </div>

      {/* Tabs — forceMount + Activity preserves rendered chart/card state across switches */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
          <TabsTrigger value="radio">Radio</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" forceMount>
          <Activity mode={activeTab === "overview" ? "visible" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Column 1 */}
              <div className="flex flex-col gap-4">
                <BatteryCard
                  percent={myNode?.batteryLevel ?? null}
                  voltage={myNode?.voltage ?? null}
                />
                <GpsCard
                  satellites={myNode?.satsInView ?? null}
                  latitude={latitude}
                  longitude={longitude}
                  altitude={myNode?.altitude ?? null}
                  positionTime={myNode?.positionTime ?? null}
                />
              </div>

              {/* Column 2 */}
              <div className="flex flex-col gap-4">
                <ConnectivityCard methods={data.connectivity} />
                <MqttCard
                  enabled={mqttConfig?.enabled ?? false}
                  address={mqttConfig?.address ?? ""}
                  username={mqttConfig?.username ?? ""}
                  encryptionEnabled={mqttConfig?.encryptionEnabled ?? false}
                  jsonEnabled={mqttConfig?.jsonEnabled ?? false}
                  tlsEnabled={mqttConfig?.tlsEnabled ?? false}
                  proxyToClientEnabled={
                    mqttConfig?.proxyToClientEnabled ?? false
                  }
                  mapReportingEnabled={mqttConfig?.mapReportingEnabled ?? false}
                  root={mqttConfig?.root ?? ""}
                />
              </div>

              {/* Column 3 */}
              <div className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
                <TelemetryCard
                  airUtilTx={myNode?.airUtilTx ?? null}
                  channelUtilization={myNode?.channelUtilization ?? null}
                  uptimeSeconds={myNode?.uptimeSeconds ?? null}
                  voltage={myNode?.voltage ?? null}
                  temperature={latestEnv?.temperature ?? null}
                  relativeHumidity={latestEnv?.relativeHumidity ?? null}
                  barometricPressure={latestEnv?.barometricPressure ?? null}
                />
              </div>
            </div>
          </Activity>
        </TabsContent>

        {/* Graphs Tab */}
        <TabsContent value="graphs" forceMount>
          <Activity mode={activeTab === "graphs" ? "visible" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SignalChart data={signalData} />
              <ChannelUtilizationChart data={channelUtilData} />
              <EnvironmentChart data={environmentData} />
              <MessageActivityChart data={messageActivityData} />
              <DeliveryRateChart data={deliveryRateData} />
              <HopCountChart data={hopCountData} />
              <NodeSignalChart data={nodeSignalData} />
            </div>
          </Activity>
        </TabsContent>

        {/* Radio Tab */}
        <TabsContent value="radio" forceMount>
          <Activity mode={activeTab === "radio" ? "visible" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <RadioConfigCard
                region={data.device.region}
                modemPreset={data.device.modemPreset}
                hopLimit={data.device.hopLimit}
                nodeNum={data.device.nodeNum}
                macAddress={data.device.macAddress}
                hwModel={data.device.hwModel}
              />
              <ChannelsCard channels={channels} />
            </div>
          </Activity>
        </TabsContent>
      </Tabs>
    </div>
  );
}
