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

export const Sensor = (): JSX.Element => {
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
            },
            y4: {
              display: false
            },
            y5: {
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
              label: "barometricPressure",
              yAxisID: "y",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.barometricPressure
                };
              }),
              backgroundColor: "rgba(102, 126, 234, 0.25)",
              borderColor: "rgba(102, 126, 234, 1)",
              pointBackgroundColor: "rgba(102, 126, 234, 1)"
            },
            {
              fill: true,
              label: "current",
              yAxisID: "y1",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.current
                };
              }),
              backgroundColor: "rgba(237, 100, 166, 0.25)",
              borderColor: "rgba(237, 100, 166, 1)",
              pointBackgroundColor: "rgba(237, 100, 166, 1)"
            },
            {
              fill: true,
              label: "gasResistance",
              yAxisID: "y2",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.gasResistance
                };
              }),
              backgroundColor: "rgba(113, 234, 102, 0.25)",
              borderColor: "rgba(113, 234, 102, 1)",
              pointBackgroundColor: "rgba(113, 234, 102, 1)"
            },
            {
              fill: true,
              label: "relativeHumidity",
              yAxisID: "y3",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.relativeHumidity
                };
              }),
              backgroundColor: "rgba(234, 166, 102, 0.25)",
              borderColor: "rgba(234, 166, 102, 1)",
              pointBackgroundColor: "rgba(234, 166, 102, 1)"
            },
            {
              fill: true,
              label: "temperature",
              yAxisID: "y4",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.temperature
                };
              }),
              backgroundColor: "rgba(38, 255, 212, 0.25)",
              borderColor: "rgba(38, 255, 212, 1)",
              pointBackgroundColor: "rgba(38, 255, 212, 1)"
            },
            {
              fill: true,
              label: "voltage",
              yAxisID: "y5",
              data: myNode?.environmentMetrics.map((metric) => {
                return {
                  x: metric.timestamp,
                  y: metric.metric.voltage
                };
              }),
              backgroundColor: "rgba(247, 255, 15, 0.25)",
              borderColor: "rgba(247, 255, 15, 1)",
              pointBackgroundColor: "rgba(247, 255, 15, 1)"
            }
          ]
        }}
      />
    </div>
  );
};
