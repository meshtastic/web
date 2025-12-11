import { Card, CardContent } from "@app/components/ui/card";

export const MetricCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <Card className="bg-muted/40">
    <CardContent className="flex flex-col items-center justify-center p-4 space-y-2">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
      <span className="text-lg md:text-xl font-semibold">{value}</span>
    </CardContent>
  </Card>
);
