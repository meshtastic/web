import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@shared/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface EnvironmentChartProps {
  data: {
    time: string;
    temperature: number;
    humidity: number;
    pressure: number;
  }[];
}

export function EnvironmentChart({ data }: EnvironmentChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Environment Sensors</CardTitle>
        <CardDescription>
          Temperature, humidity, and pressure (24h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            temperature: {
              label: "Temp (\u00B0C)",
              theme: {
                light: "oklch(0.55 0.22 25)",
                dark: "oklch(0.6 0.2 25)",
              },
            },
            humidity: {
              label: "Humidity (%)",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
            pressure: {
              label: "Pressure (hPa)",
              theme: {
                light: "oklch(0.55 0.10 280)",
                dark: "oklch(0.70 0.10 280)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="temp"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="pressure"
                orientation="right"
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                stroke="var(--color-temperature)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-temperature)" }}
                name="Temp (\u00B0C)"
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="humidity"
                stroke="var(--color-humidity)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-humidity)" }}
                name="Humidity (%)"
              />
              <Line
                yAxisId="pressure"
                type="monotone"
                dataKey="pressure"
                stroke="var(--color-pressure)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "var(--color-pressure)" }}
                name="Pressure (hPa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
