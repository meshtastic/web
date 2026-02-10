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

interface NodeSignalChartProps {
  data: { name: string; snr: number }[];
}

export function NodeSignalChart({ data }: NodeSignalChartProps) {
  const chartHeight = Math.max(250, data.length * 32);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Node Signal Strength</CardTitle>
        <CardDescription>SNR by neighbor node (dB)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            snr: {
              label: "SNR (dB)",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
          }}
          className="w-full"
          style={{ height: chartHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/50"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v: number) => `${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="snr"
                fill="var(--color-snr)"
                fillOpacity={0.8}
                radius={[0, 3, 3, 0]}
                name="SNR (dB)"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
