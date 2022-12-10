import "chartjs-adapter-date-fns";

import type React from "react";

import {
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeSeriesScale,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

import { useDevice } from "@app/core/providers/useDevice.js";

export const Metrics = (): JSX.Element => {
  const { nodes, hardware } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  ChartJS.register(
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
    Legend,
    TimeSeriesScale
  );

  return (
    <div className="flex h-full w-full flex-grow">
      {/* {myNode?.deviceMetrics.map((metric) => (
        <p>{metric.airUtilTx}</p>
      ))} */}
      <Line
        className="h-full w-full flex-grow"
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "timeseries"
            }
          }
        }}
        data={{
          labels: [],
          datasets: [
            {
              fill: true,
              label: "airUtilTx",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.airUtilTx
                };
              })
            },
            {
              fill: true,
              label: "channelUtilization",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.channelUtilization
                };
              })
            },
            {
              fill: true,
              label: "batteryLevel",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.batteryLevel
                };
              })
            },
            {
              fill: true,
              label: "voltage",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.voltage
                };
              })
            }
          ]
        }}
      />
    </div>
  );
};
