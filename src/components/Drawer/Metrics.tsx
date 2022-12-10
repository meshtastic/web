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
      <Line
        className="h-full w-full flex-grow"
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false
          },
          line: {
            datasets: {
              tension: 0.5
            }
          },
          scales: {
            x: {
              type: "timeseries",
              ticks: {
                display: false
              }
            },
            y: {
              ticks: {
                display: false
              }
            },
            y1: {
              display: false
            },
            y2: {
              display: false
            },
            y3: {
              display: false
            }
          },
          plugins: {}
        }}
        data={{
          labels: [],
          datasets: [
            {
              fill: true,
              label: "airUtilTx",
              yAxisID: "y",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.airUtilTx
                };
              }),
              backgroundColor: "rgba(102, 126, 234, 0.25)",
              borderColor: "rgba(102, 126, 234, 1)",
              pointBackgroundColor: "rgba(102, 126, 234, 1)"
            },
            {
              fill: true,
              label: "channelUtilization",
              yAxisID: "y1",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.channelUtilization
                };
              }),
              backgroundColor: "rgba(237, 100, 166, 0.25)",
              borderColor: "rgba(237, 100, 166, 1)",
              pointBackgroundColor: "rgba(237, 100, 166, 1)"
            },
            {
              fill: true,
              label: "batteryLevel",
              yAxisID: "y2",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.batteryLevel
                };
              }),
              backgroundColor: "rgba(113, 234, 102, 0.25)",
              borderColor: "rgba(113, 234, 102, 1)",
              pointBackgroundColor: "rgba(113, 234, 102, 1)"
            },
            {
              fill: true,
              label: "voltage",
              yAxisID: "y3",
              data: myNode?.deviceMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.voltage
                };
              }),
              backgroundColor: "rgba(234, 166, 102, 0.25)",
              borderColor: "rgba(234, 166, 102, 1)",
              pointBackgroundColor: "rgba(234, 166, 102, 1)"
            }
          ]
        }}
      />
    </div>
  );
};
