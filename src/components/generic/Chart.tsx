import React from 'react';

import ApexChart from 'react-apexcharts';

import { Button } from './Button';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface ISeries {
  name: string;
  data: {
    x: string | Date;
    y: number;
  }[];
}

interface ChartProps extends DefaultDivProps {
  title: string;
  description: string;
  hasMultipleSeries: boolean;
  series: ISeries[];
}

export const Chart = ({
  title,
  description,
  hasMultipleSeries,
  series,
  ...props
}: ChartProps): JSX.Element => {
  const [activeSeries, setActiveSeries] = React.useState<ISeries>(series[0]);
  return (
    <div
      className="flex flex-col flex-auto text-white shadow-md dark bg-primaryDark rounded-3xl"
      {...props}
    >
      <div className="flex items-center justify-between mx-10 mt-10">
        <div className="flex flex-col">
          <div className="mr-4 text-2xl font-semibold leading-7 tracking-tight md:text-3xl">
            {title}
          </div>
          <div className="font-medium text-gray-400">{description}</div>
        </div>
        {hasMultipleSeries && (
          <div className="flex space-x-2">
            {series.map((data, index) => (
              <Button
                active={data.name === activeSeries.name}
                key={index}
                className="font-medium"
                onClick={(): void => {
                  setActiveSeries(series[index]);
                }}
              >
                {data.name}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="h-80">
        <ApexChart
          height="96%"
          type="area"
          options={{
            chart: {
              animations: {
                speed: 400,
                animateGradually: {
                  enabled: false,
                },
              },
              toolbar: {
                show: false,
              },
              zoom: {
                enabled: false,
              },
            },
            colors: ['#818CF8'],
            dataLabels: {
              enabled: false,
            },
            fill: {
              colors: ['#312E81'],
            },
            grid: {
              padding: {
                top: 10,
                left: 0,
                right: 0,
              },

              xaxis: {
                lines: {
                  show: false,
                },
              },
              yaxis: {
                lines: {
                  show: false,
                },
              },
            },

            stroke: {
              width: 2,
            },
            tooltip: {
              followCursor: true,
              theme: 'dark',
              x: {
                format: 'MMM dd, yyyy',
              },
              y: {
                formatter: (value: number): string => `${value}`,
              },
            },
            xaxis: {
              axisBorder: {
                show: false,
              },
              axisTicks: {
                show: false,
              },
              crosshairs: {
                stroke: {
                  color: '#475569',
                  dashArray: 0,
                  width: 2,
                },
              },
              labels: {
                style: {
                  colors: '#CBD5E1',
                },
              },
              tooltip: {
                enabled: false,
              },
              type: 'datetime',
            },
            yaxis: {
              axisTicks: {
                show: false,
              },
              axisBorder: {
                show: false,
              },
              show: false,
            },
          }}
          series={[activeSeries]}
        />
      </div>
    </div>
  );
};
