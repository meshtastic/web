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
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface MessageActivityChartProps {
  data: { time: string; direct: number; channel: number }[];
}

export function MessageActivityChart({ data }: MessageActivityChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Message Activity</CardTitle>
        <CardDescription>
          Direct vs channel messages per hour (24h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            direct: {
              label: "Direct",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
            channel: {
              label: "Channel",
              theme: {
                light: "oklch(0.60 0.15 145)",
                dark: "oklch(0.65 0.18 145)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="channel"
                stackId="messages"
                fill="var(--color-channel)"
                fillOpacity={0.8}
                radius={[0, 0, 0, 0]}
                name="Channel"
              />
              <Bar
                dataKey="direct"
                stackId="messages"
                fill="var(--color-direct)"
                fillOpacity={0.8}
                radius={[3, 3, 0, 0]}
                name="Direct"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
