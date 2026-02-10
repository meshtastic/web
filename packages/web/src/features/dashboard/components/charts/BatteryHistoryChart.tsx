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
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface BatteryHistoryChartProps {
  data: { time: string; percent: number; voltage: number }[];
}

export function BatteryHistoryChart({ data }: BatteryHistoryChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Battery Over Time</CardTitle>
        <CardDescription>Charge level and voltage (24h)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            percent: {
              label: "Charge %",
              theme: {
                light: "oklch(0.60 0.15 145)",
                dark: "oklch(0.65 0.18 145)",
              },
            },
            voltage: {
              label: "Voltage (V)",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[3.0, 4.2]}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}V`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="percent"
                stroke="var(--color-percent)"
                fill="var(--color-percent)"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Charge %"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="voltage"
                stroke="var(--color-voltage)"
                fill="var(--color-voltage)"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="4 4"
                name="Voltage (V)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
