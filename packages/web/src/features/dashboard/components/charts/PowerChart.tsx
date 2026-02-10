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

interface PowerChartProps {
  data: { time: string; current: number; power: number }[];
}

export function PowerChart({ data }: PowerChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Power Consumption</CardTitle>
        <CardDescription>Current draw and power usage (24h)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            current: {
              label: "Current (mA)",
              theme: {
                light: "oklch(0.60 0.12 150)",
                dark: "oklch(0.75 0.12 150)",
              },
            },
            power: {
              label: "Power (mW)",
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
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="current"
                stroke="var(--color-current)"
                fill="var(--color-current)"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Current (mA)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="power"
                stroke="var(--color-power)"
                fill="var(--color-power)"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="4 4"
                name="Power (mW)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
