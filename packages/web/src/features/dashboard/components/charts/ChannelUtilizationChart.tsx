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
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface ChannelUtilizationChartProps {
  data: { time: string; utilization: number; airTime: number }[];
}

export function ChannelUtilizationChart({
  data,
}: ChannelUtilizationChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Channel Utilization</CardTitle>
        <CardDescription>
          Channel busy % and TX air time % (24h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            utilization: {
              label: "Ch. Utilization %",
              theme: {
                light: "oklch(0.50 0.12 200)",
                dark: "oklch(0.65 0.12 200)",
              },
            },
            airTime: {
              label: "Air Time TX %",
              theme: {
                light: "oklch(0.75 0.15 85)",
                dark: "oklch(0.75 0.15 85)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
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
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="utilization"
                fill="var(--color-utilization)"
                fillOpacity={0.7}
                radius={[3, 3, 0, 0]}
                name="Ch. Utilization %"
              />
              <Line
                type="monotone"
                dataKey="airTime"
                stroke="var(--color-airTime)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-airTime)" }}
                name="Air Time TX %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
